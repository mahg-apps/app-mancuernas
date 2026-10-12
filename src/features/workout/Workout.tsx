import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Figure } from '../../animation/Figure';
import { IconClose, IconPause, IconPlay } from '../../components/Icons';
import { SwapSheet } from '../../components/SwapSheet';
import { ARTICULACION_NAME } from '../../data/muscles';
import { getRoutine, newId, saveRoutine, saveSession } from '../../db';
import { useWakeLock } from '../../hooks/useWakeLock';
import { restFinished, tick, unlockAudio, workoutFinished } from '../../lib/alerts';
import { defaultOptions, estimateMinutes, planRoutine, PREP_SEG, type Bloque, type PlannedItem, type PlanOptions } from '../../lib/routine';
import { limitedJoints } from '../../lib/safety';
import { formatSeconds, formatWeight, PRESCRIPCION, suggestWeight } from '../../lib/training';
import { useProfile } from '../../state/ProfileContext';
import type { Exercise, Routine, SetLog } from '../../types';

type Phase = 'listo' | 'trabajo' | 'descanso' | 'fin';

interface Cursor {
  ex: number;
  /** Serie (por repeticiones) o lado (por tiempo), desde 1. */
  set: number;
}

interface Timer {
  /** series/ejercicio/prep: descansos; tiempo: ejercicio por tiempo en curso. */
  kind: 'series' | 'ejercicio' | 'prep' | 'tiempo';
  /** Momento en que termina (ms). null mientras está en pausa. */
  endAt: number | null;
  /** Segundos restantes guardados al pausar. */
  left: number;
  total: number;
  next: Cursor | null;
}

const BLOQUE_NAME: Record<Bloque, string> = {
  calentamiento: 'Calentamiento',
  principal: 'Ejercicio',
  estiramiento: 'Estiramiento',
};

/** Modo entrenamiento continuo: calentamiento, rutina con descansos automáticos y estiramientos. */
export function Workout() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useProfile();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [opts, setOpts] = useState<PlanOptions | null>(null);
  const [plan, setPlan] = useState<PlannedItem[]>([]);

  const [phase, setPhase] = useState<Phase>('listo');
  const [cur, setCur] = useState<Cursor>({ ex: 0, set: 1 });
  const [timer, setTimer] = useState<Timer | null>(null);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [swapping, setSwapping] = useState(false);
  const startedAt = useRef(0);
  const pausedMs = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const endedAt = useRef(0);
  const lastTick = useRef<number | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (id) getRoutine(id).then((r) => (r ? setRoutine(r) : nav('/rutinas', { replace: true })));
  }, [id, nav]);

  useEffect(() => {
    if (routine && profile && !opts) setOpts(defaultOptions(routine, profile));
  }, [routine, profile, opts]);

  // Vista previa del plan en la pantalla "¿Listo?"; al empezar queda fijo.
  const preview = useMemo(
    () => (routine && profile && opts ? planRoutine(routine, profile, opts) : []),
    [routine, profile, opts],
  );

  const restCfg = profile ? profile.descansos[profile.objetivo] : { series: 45, ejercicios: 75 };

  useWakeLock(phase === 'trabajo' || phase === 'descanso');

  // Reloj de la pantalla.
  useEffect(() => {
    if (phase === 'listo' || phase === 'fin') return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [phase]);

  const timeLeft = timer ? (timer.endAt === null ? timer.left : Math.max(0, (timer.endAt - now) / 1000)) : 0;

  const finish = useCallback(() => {
    endedAt.current = Date.now();
    setPhase('fin');
    setTimer(null);
    workoutFinished();
  }, []);

  const startTimer = useCallback((kind: Timer['kind'], total: number, next: Cursor | null, isPaused: boolean) => {
    lastTick.current = null;
    setTimer({ kind, total, left: total, endAt: isPaused ? null : Date.now() + total * 1000, next });
    setNow(Date.now());
  }, []);

  /** Empieza una serie o un lado. Los ejercicios por tiempo arrancan su cuenta regresiva. */
  const goTo = useCallback(
    (c: Cursor, list: PlannedItem[] = plan) => {
      const it = list[c.ex];
      if (!it) return finish();
      setCur(c);
      setPhase('trabajo');
      if (it.modo === 'tiempo') startTimer('tiempo', it.segundos, null, paused);
      else setTimer(null);
    },
    [plan, finish, startTimer, paused],
  );

  /** Siguiente paso después de terminar la serie o el lado actual. */
  const nextCursor = useCallback(
    (c: Cursor): Cursor | null => {
      if (c.set < plan[c.ex].series) return { ex: c.ex, set: c.set + 1 };
      if (c.ex + 1 < plan.length) return { ex: c.ex + 1, set: 1 };
      return null;
    },
    [plan],
  );

  /** Descanso que corresponde antes de `next`. */
  const restBefore = useCallback(
    (from: PlannedItem, next: Cursor) => {
      const to = plan[next.ex];
      if (from.modo === 'reps' && to.modo === 'reps') {
        return next.ex === cur.ex
          ? { kind: 'series' as const, total: restCfg.series }
          : { kind: 'ejercicio' as const, total: restCfg.ejercicios };
      }
      // Cambio de bloque: un poco más de tiempo para acomodarse.
      const blockChange = from.bloque !== to.bloque;
      return { kind: 'prep' as const, total: blockChange ? Math.max(PREP_SEG * 2, 10) : PREP_SEG };
    },
    [plan, cur.ex, restCfg],
  );

  const advance = useCallback(() => {
    const it = plan[cur.ex];
    const next = nextCursor(cur);
    if (!next) return finish();
    const r = restBefore(it, next);
    startTimer(r.kind, r.total, next, paused);
    setPhase('descanso');
  }, [plan, cur, nextCursor, restBefore, startTimer, paused, finish]);

  // Fin de un temporizador: descanso → siguiente; ejercicio por tiempo → avanzar.
  useEffect(() => {
    if (!timer || timer.endAt === null || (phase !== 'descanso' && phase !== 'trabajo')) return;
    const secs = Math.ceil(timeLeft);
    if (secs <= 3 && secs > 0 && lastTick.current !== secs) {
      lastTick.current = secs;
      tick();
    }
    if (timeLeft > 0) return;
    lastTick.current = null;
    restFinished();
    if (timer.kind === 'tiempo') advance();
    else if (timer.next) goTo(timer.next);
    else finish();
  }, [phase, timer, timeLeft, goTo, advance, finish]);

  // Guarda la sesión al terminar (base para el progreso de la etapa 4).
  useEffect(() => {
    if (phase !== 'fin' || saved.current || !routine) return;
    saved.current = true;
    saveSession({
      id: newId(),
      routineId: routine.id,
      nombre: routine.nombre,
      inicio: startedAt.current,
      fin: endedAt.current,
      sets: logs,
    }).catch(() => {});
  }, [phase, routine, logs]);

  if (!routine || !profile || !opts) return <div className="h-full bg-bg" />;

  // ---------- Pantalla "¿Listo?" ----------

  if (phase === 'listo') {
    const first = preview.find((p) => p.bloque === 'principal') ?? preview[0];
    const counts = (b: Bloque) => preview.filter((p) => p.bloque === b).length;
    const start = () => {
      unlockAudio();
      startedAt.current = Date.now();
      setPlan(preview);
      setNow(Date.now());
      const it = preview[0];
      setCur({ ex: 0, set: 1 });
      setPhase('trabajo');
      if (it.modo === 'tiempo') startTimer('tiempo', it.segundos, null, false);
    };
    const Toggle = ({ k, label, n }: { k: keyof PlanOptions; label: string; n: number }) => (
      <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface2 px-4">
        <span>
          {label}
          {opts[k] && n > 0 && <span className="ml-2 text-[14px] text-muted">{n} ejercicios</span>}
        </span>
        <input
          type="checkbox"
          className="h-6 w-6 accent-[#ff7a3d]"
          checked={opts[k]}
          onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })}
        />
      </label>
    );
    return (
      <Shell onExit={() => nav('/rutinas')}>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 pb-4 text-center">
          {first && (
            <div className="aspect-square w-full max-w-[280px]">
              <Figure exercise={first.exercise} className="h-full w-full" />
            </div>
          )}
          <div>
            <p className="text-muted">{routine.nombre}</p>
            <h1 className="text-[clamp(28px,5vmin,44px)] font-bold">¿Listo?</h1>
            <p className="mt-1 text-muted">
              {counts('principal')} ejercicios · ~{estimateMinutes(routine, profile, opts)} min
            </p>
          </div>
          <div className="w-full max-w-sm space-y-2 text-left">
            <Toggle k="calentamiento" label="Calentamiento" n={counts('calentamiento')} />
            <Toggle k="estiramientos" label="Estiramientos al final" n={counts('estiramiento')} />
          </div>
          <button className="btn-primary h-20 w-full max-w-sm text-2xl" onClick={start} disabled={!preview.length}>
            <IconPlay /> Empezar
          </button>
          <p className="max-w-sm text-[14px] text-muted">La pantalla se mantendrá encendida. Sube el volumen para escuchar los avisos.</p>
        </div>
      </Shell>
    );
  }

  const elapsed = Math.max(
    0,
    ((phase === 'fin' ? endedAt.current : pausedAt.current ?? now) - startedAt.current - pausedMs.current) / 1000,
  );

  const exit = () => {
    if (phase === 'fin' || confirm('¿Salir del entrenamiento? Se perderá el avance de esta sesión.')) nav('/rutinas');
  };

  // ---------- Resumen ----------

  if (phase === 'fin') {
    const ejercicios = new Set(logs.map((l) => l.exerciseId)).size;
    const extras = [
      plan.some((p) => p.bloque === 'calentamiento') && 'calentamiento',
      plan.some((p) => p.bloque === 'estiramiento') && 'estiramientos',
    ].filter(Boolean);
    return (
      <Shell onExit={exit}>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
          <div className="text-6xl" aria-hidden>
            🏁
          </div>
          <div>
            <h1 className="text-[clamp(30px,6vmin,52px)] font-bold">¡Entrenamiento completo!</h1>
            {extras.length > 0 && <p className="mt-1 text-muted">Incluyó {extras.join(' y ')}.</p>}
          </div>
          <div className="grid w-full max-w-lg grid-cols-3 gap-3">
            <Stat label="Tiempo total" value={formatClock(elapsed)} />
            <Stat label="Ejercicios" value={String(ejercicios)} />
            <Stat label="Series" value={String(logs.length)} />
          </div>
          <button className="btn-primary h-16 w-full max-w-sm text-xl" onClick={() => nav('/rutinas')}>
            Terminar
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- Entrenamiento ----------

  const item = plan[cur.ex];
  const isTimed = item.modo === 'tiempo';
  const peso = suggestWeight(item.exercise, profile);
  const resting = phase === 'descanso' && timer;
  const upcoming = resting && timer.next ? plan[timer.next.ex] : null;
  const changing = resting && timer.next && timer.next.ex !== cur.ex;
  const shown = changing && upcoming ? upcoming : item;
  const progress = timer ? 1 - timeLeft / timer.total : 0;
  const blockIdx = plan.filter((p, i) => p.bloque === item.bloque && i <= cur.ex).length;
  const blockTotal = plan.filter((p) => p.bloque === item.bloque).length;
  const cuidado = limitedJoints(item.exercise, profile);
  const sideName = (s: number) => (s === 1 ? 'Lado derecho' : 'Lado izquierdo');
  const firstMain = plan.findIndex((p) => p.bloque === 'principal');
  const nextBlock = upcoming?.bloque;

  const togglePause = () => {
    unlockAudio();
    const t = Date.now();
    if (!paused) {
      pausedAt.current = t;
      if (timer?.endAt) setTimer({ ...timer, endAt: null, left: Math.max(0, (timer.endAt - t) / 1000) });
    } else {
      if (pausedAt.current) pausedMs.current += t - pausedAt.current;
      pausedAt.current = null;
      if (timer) setTimer({ ...timer, endAt: t + timer.left * 1000 });
    }
    setPaused(!paused);
    setNow(t);
  };

  const setDone = () => {
    unlockAudio();
    setLogs((l) => [...l, { exerciseId: item.exercise.id, serie: cur.set, reps: item.repsObjetivo, peso: peso ?? 0, ts: Date.now() }]);
    advance();
  };

  const add15 = () => {
    if (!timer) return;
    setTimer(
      timer.endAt === null
        ? { ...timer, left: timer.left + 15, total: timer.total + 15 }
        : { ...timer, endAt: timer.endAt + 15000, total: timer.total + 15 },
    );
  };

  const skipRest = () => timer?.next && goTo(timer.next);

  const skipExercise = () => {
    const base = changing && timer?.next ? timer.next.ex : cur.ex;
    if (base + 1 >= plan.length) finish();
    else goTo({ ex: base + 1, set: 1 });
  };

  /** Salta todo el bloque actual (calentamiento o estiramientos). */
  const skipBlock = (b: Bloque) => {
    const target = plan.findIndex((p, i) => i > cur.ex && p.bloque !== b);
    if (b === 'estiramiento' || target < 0) finish();
    else goTo({ ex: target, set: 1 });
  };

  const swap = async (e: Exercise, toRoutine: boolean) => {
    const pres = PRESCRIPCION[profile.objetivo];
    const replaced: PlannedItem = { ...item, exercise: e, reps: item.reps || pres.reps };
    const list = plan.map((p, i) => (i === cur.ex ? replaced : p));
    setPlan(list);
    setSwapping(false);
    if (toRoutine) {
      const pos = cur.ex - Math.max(0, firstMain);
      const items = routine.items.map((it, i) => (i === pos ? { ...it, exerciseId: e.id } : it));
      const updated = { ...routine, items, actualizado: Date.now() };
      setRoutine(updated);
      await saveRoutine(updated).catch(() => {});
    }
  };

  const restLabel = () => {
    if (!timer) return '';
    if (timer.kind === 'series') return 'Descanso';
    if (timer.kind === 'ejercicio') return 'Descanso · cambia de ejercicio';
    if (timer.next && timer.next.ex === cur.ex) return 'Cambia de lado';
    if (nextBlock && nextBlock !== item.bloque) {
      return nextBlock === 'principal' ? '¡Empieza la rutina!' : nextBlock === 'estiramiento' ? 'Hora de estirar' : 'Prepárate';
    }
    return 'Prepárate';
  };

  const nextText = () => {
    if (!timer?.next || !upcoming) return '';
    if (upcoming.modo === 'tiempo') {
      return upcoming.series > 1 ? `${upcoming.exercise.nombre} · ${sideName(timer.next.set).toLowerCase()}` : upcoming.exercise.nombre;
    }
    return timer.next.ex === cur.ex ? `Sigue: serie ${timer.next.set} de ${item.series}` : upcoming.exercise.nombre;
  };

  return (
    <Shell onExit={exit} elapsed={elapsed} step={`${BLOQUE_NAME[item.bloque]} ${blockIdx}/${blockTotal}`}>
      <div className="flex min-h-0 flex-1 flex-col md:landscape:flex-row">
        {/* Animación grande */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 md:landscape:flex-[1.4]">
          {changing && (
            <span className="absolute left-4 top-3 rounded-full bg-accentSoft px-4 py-1.5 text-[15px] font-semibold text-accent">
              Siguiente
            </span>
          )}
          <Figure exercise={shown.exercise} playing={!paused} className="h-full max-h-[70vh] w-full" />
        </div>

        {/* Panel de información y controles */}
        <div className="flex shrink-0 flex-col gap-3 px-4 pb-2 md:landscape:w-[42%] md:landscape:max-w-[560px] md:landscape:justify-center md:landscape:border-l md:landscape:border-line/60 md:landscape:px-8">
          {resting || isTimed ? (
            <div className="text-center">
              <p className="text-[clamp(18px,3.2vmin,30px)] font-semibold text-muted">
                {resting
                  ? restLabel()
                  : `${item.exercise.nombre}${item.series > 1 ? ` · ${sideName(cur.set).toLowerCase()}` : ''}`}
              </p>
              <p className="my-1 font-bold tabular-nums leading-none text-[clamp(96px,24vmin,240px)]" aria-live="polite">
                {formatSeconds(Math.ceil(timeLeft))}
              </p>
              <div className="mx-auto h-3 w-full max-w-md overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
              {resting && <p className="mt-3 text-[clamp(20px,3.6vmin,34px)] font-semibold leading-tight">{nextText()}</p>}
              {resting && changing && upcoming?.modo === 'reps' && (
                <p className="text-[clamp(16px,2.8vmin,24px)] text-muted">
                  {upcoming.series} × {upcoming.reps} · {formatWeight(suggestWeight(upcoming.exercise, profile), profile.unidad)}
                </p>
              )}
              {!resting && <p className="mt-3 text-[clamp(16px,2.8vmin,24px)] text-muted">{item.exercise.pasos[0]}</p>}
            </div>
          ) : (
            <div className="text-center md:landscape:text-left">
              <h1 className="text-[clamp(26px,5.2vmin,52px)] font-bold leading-tight">{item.exercise.nombre}</h1>
              {cuidado.length > 0 && (
                <p className="mt-1 text-[15px] text-amber-200">
                  ⚠ Cuida {cuidado.map((c) => ARTICULACION_NAME[c].toLowerCase()).join(' y ')}: usa poco peso o cámbialo.
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Serie" value={`${cur.set}/${item.series}`} big />
                <Stat label={item.exercise.unilateral ? 'Reps/lado' : 'Reps'} value={item.reps} big />
                <Stat label="Peso" value={formatWeight(peso, profile.unidad)} big />
              </div>
            </div>
          )}

          {resting ? (
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-ghost h-16 text-lg" onClick={add15}>
                +15 s
              </button>
              <button className="btn-ghost h-16 text-lg" onClick={togglePause}>
                {paused ? <IconPlay /> : <IconPause />}
                {paused ? 'Seguir' : 'Pausa'}
              </button>
              <button className="btn-primary h-16 text-lg" onClick={skipRest}>
                Saltar
              </button>
            </div>
          ) : isTimed ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost h-16 text-lg" onClick={togglePause}>
                {paused ? <IconPlay /> : <IconPause />}
                {paused ? 'Seguir' : 'Pausa'}
              </button>
              <button className="btn-primary h-16 text-lg" onClick={advance}>
                Listo
              </button>
            </div>
          ) : (
            <button className="btn-primary h-20 w-full text-[clamp(22px,4vmin,32px)]" onClick={setDone} disabled={paused}>
              Serie terminada
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!resting && !isTimed && (
              <button className="btn-ghost h-14" onClick={togglePause}>
                {paused ? <IconPlay /> : <IconPause />}
                {paused ? 'Seguir' : 'Pausa'}
              </button>
            )}
            {!resting && !isTimed && (
              <button className="btn-ghost h-14" onClick={() => setSwapping(true)}>
                Cambiar ejercicio
              </button>
            )}
            {(item.bloque !== 'principal' || nextBlock === 'estiramiento') && (resting || isTimed) ? (
              <button className="btn-ghost h-14" onClick={() => skipBlock(nextBlock === 'estiramiento' ? 'estiramiento' : item.bloque)}>
                {item.bloque === 'calentamiento' ? 'Omitir calentamiento' : 'Omitir estiramientos'}
              </button>
            ) : null}
            <button
              className={`btn-ghost h-14 ${(resting || isTimed) && item.bloque === 'principal' && nextBlock !== 'estiramiento' ? 'col-span-2' : ''} ${!resting && !isTimed ? 'col-span-2' : ''}`}
              onClick={skipExercise}
            >
              Saltar ejercicio
            </button>
          </div>
        </div>
      </div>
      {paused && (
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
          <span className="rounded-full bg-amber-500/20 px-4 py-1.5 font-semibold text-amber-200">En pausa</span>
        </div>
      )}
      {swapping && (
        <SwapSheet exercise={item.exercise} profile={profile} allowSave onClose={() => setSwapping(false)} onPick={swap} />
      )}
    </Shell>
  );
}

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

function Stat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="card px-2 py-3 text-center">
      <p className={`${big ? 'text-[clamp(13px,2.2vmin,18px)]' : 'text-[13px]'} text-muted`}>{label}</p>
      <p className={`${big ? 'text-[clamp(22px,4.4vmin,44px)]' : 'text-2xl'} whitespace-nowrap font-bold tabular-nums leading-tight`}>{value}</p>
    </div>
  );
}

function Shell({ children, onExit, elapsed, step }: { children: React.ReactNode; onExit: () => void; elapsed?: number; step?: string }) {
  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-bg"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'calc(var(--safe-bottom) + 8px)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-2">
        <button className="btn px-3 text-muted" onClick={onExit} aria-label="Salir">
          <IconClose />
        </button>
        {elapsed !== undefined && (
          <p className="text-lg font-semibold tabular-nums text-muted">
            {step && <span className="mr-3">{step}</span>}
            {formatClock(elapsed)}
          </p>
        )}
        <span className="w-12" />
      </div>
      {children}
    </div>
  );
}
