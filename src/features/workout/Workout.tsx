import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Figure } from '../../animation/Figure';
import { IconClose, IconPause, IconPlay } from '../../components/Icons';
import { getRoutine, newId, saveSession } from '../../db';
import { useWakeLock } from '../../hooks/useWakeLock';
import { restFinished, tick, unlockAudio, workoutFinished } from '../../lib/alerts';
import { planRoutine, type PlannedItem } from '../../lib/routine';
import { formatSeconds, formatWeight, suggestWeight } from '../../lib/training';
import { useProfile } from '../../state/ProfileContext';
import type { Routine, SetLog } from '../../types';

type Phase = 'listo' | 'trabajo' | 'descanso' | 'fin';

interface Cursor {
  ex: number;
  set: number; // 1..series
}

interface RestState {
  kind: 'series' | 'ejercicio';
  /** Momento en que termina (ms). null mientras está en pausa. */
  endAt: number | null;
  /** Segundos restantes guardados al pausar. */
  left: number;
  total: number;
  next: Cursor;
}

/** Modo entrenamiento continuo: la rutina avanza sola con descansos automáticos. */
export function Workout() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useProfile();
  const [routine, setRoutine] = useState<Routine | null>(null);

  const [phase, setPhase] = useState<Phase>('listo');
  const [cur, setCur] = useState<Cursor>({ ex: 0, set: 1 });
  const [rest, setRest] = useState<RestState | null>(null);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [logs, setLogs] = useState<SetLog[]>([]);
  const startedAt = useRef(0);
  const pausedMs = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const endedAt = useRef(0);
  const lastTick = useRef<number | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (id) getRoutine(id).then((r) => (r ? setRoutine(r) : nav('/rutinas', { replace: true })));
  }, [id, nav]);

  const plan: PlannedItem[] = useMemo(() => (routine && profile ? planRoutine(routine, profile) : []), [routine, profile]);
  const restCfg = profile ? profile.descansos[profile.objetivo] : { series: 45, ejercicios: 75 };

  useWakeLock(phase === 'trabajo' || phase === 'descanso');

  // Reloj de la pantalla.
  useEffect(() => {
    if (phase === 'listo' || phase === 'fin') return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [phase]);

  const restLeft = rest ? (rest.endAt === null ? rest.left : Math.max(0, (rest.endAt - now) / 1000)) : 0;

  const finish = useCallback(() => {
    endedAt.current = Date.now();
    setPhase('fin');
    setRest(null);
    workoutFinished();
  }, []);

  const goTo = useCallback((c: Cursor) => {
    setCur(c);
    setRest(null);
    setPhase('trabajo');
  }, []);

  // Fin del descanso: aviso y siguiente serie o ejercicio.
  useEffect(() => {
    if (phase !== 'descanso' || !rest || rest.endAt === null) return;
    const secs = Math.ceil(restLeft);
    if (secs <= 3 && secs > 0 && lastTick.current !== secs) {
      lastTick.current = secs;
      tick();
    }
    if (restLeft <= 0) {
      lastTick.current = null;
      restFinished();
      goTo(rest.next);
    }
  }, [phase, rest, restLeft, goTo]);

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

  if (!routine || !profile) return <div className="h-full bg-bg" />;
  if (!plan.length) return null;

  const item = plan[cur.ex];
  const peso = suggestWeight(item.exercise, profile);
  const isLastSet = cur.set >= item.series;
  const isLastEx = cur.ex >= plan.length - 1;
  const nextItem = rest ? plan[rest.next.ex] : plan[cur.ex + 1];
  const elapsed = Math.max(
    0,
    ((phase === 'fin' ? endedAt.current : pausedAt.current ?? now) - startedAt.current - pausedMs.current) / 1000,
  );

  const start = () => {
    unlockAudio();
    startedAt.current = Date.now();
    setNow(Date.now());
    setPhase('trabajo');
  };

  const startRest = (kind: RestState['kind'], next: Cursor) => {
    const total = kind === 'series' ? restCfg.series : restCfg.ejercicios;
    lastTick.current = null;
    setRest({ kind, total, left: total, endAt: paused ? null : Date.now() + total * 1000, next });
    setNow(Date.now());
    setPhase('descanso');
  };

  const setDone = () => {
    unlockAudio();
    setLogs((l) => [...l, { exerciseId: item.exercise.id, serie: cur.set, reps: item.repsObjetivo, peso: peso ?? 0, ts: Date.now() }]);
    if (!isLastSet) startRest('series', { ex: cur.ex, set: cur.set + 1 });
    else if (!isLastEx) startRest('ejercicio', { ex: cur.ex + 1, set: 1 });
    else finish();
  };

  const togglePause = () => {
    unlockAudio();
    const t = Date.now();
    if (!paused) {
      pausedAt.current = t;
      if (rest?.endAt) setRest({ ...rest, endAt: null, left: Math.max(0, (rest.endAt - t) / 1000) });
    } else {
      if (pausedAt.current) pausedMs.current += t - pausedAt.current;
      pausedAt.current = null;
      if (rest) setRest({ ...rest, endAt: t + rest.left * 1000 });
    }
    setPaused(!paused);
    setNow(t);
  };

  const add15 = () => {
    if (!rest) return;
    setRest(rest.endAt === null ? { ...rest, left: rest.left + 15, total: rest.total + 15 } : { ...rest, endAt: rest.endAt + 15000, total: rest.total + 15 });
  };

  const skipRest = () => rest && goTo(rest.next);

  const skipExercise = () => {
    const target = phase === 'descanso' && rest?.kind === 'ejercicio' ? rest.next.ex + 1 : cur.ex + 1;
    if (target >= plan.length) finish();
    else goTo({ ex: target, set: 1 });
  };

  const exit = () => {
    if (phase === 'fin' || phase === 'listo' || confirm('¿Salir del entrenamiento? Se perderá el avance de esta sesión.')) nav('/rutinas');
  };

  // ---------- Pantallas ----------

  if (phase === 'listo') {
    const first = plan[0];
    return (
      <Shell onExit={exit}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="aspect-square w-full max-w-sm">
            <Figure exercise={first.exercise} className="h-full w-full" />
          </div>
          <div>
            <p className="text-muted">{routine.nombre}</p>
            <h1 className="text-[clamp(28px,5vmin,44px)] font-bold">¿Listo?</h1>
            <p className="mt-1 text-muted">
              {plan.length} ejercicios · empieza con {first.exercise.nombre}
            </p>
          </div>
          <button className="btn-primary h-20 w-full max-w-sm text-2xl" onClick={start}>
            <IconPlay /> Empezar
          </button>
          <p className="max-w-sm text-[14px] text-muted">La pantalla se mantendrá encendida. Sube el volumen para escuchar el aviso de fin de descanso.</p>
        </div>
      </Shell>
    );
  }

  if (phase === 'fin') {
    const ejercicios = new Set(logs.map((l) => l.exerciseId)).size;
    return (
      <Shell onExit={exit}>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
          <div className="text-6xl" aria-hidden>
            🏁
          </div>
          <h1 className="text-[clamp(30px,6vmin,52px)] font-bold">¡Entrenamiento completo!</h1>
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

  const resting = phase === 'descanso' && rest;
  // En el descanso entre ejercicios se ve la vista previa del siguiente.
  const shown = resting && rest.kind === 'ejercicio' ? plan[rest.next.ex] : item;
  const progress = resting ? 1 - restLeft / rest.total : 0;

  return (
    <Shell onExit={exit} elapsed={elapsed} step={`${cur.ex + 1}/${plan.length}`}>
      <div className="flex min-h-0 flex-1 flex-col md:landscape:flex-row">
        {/* Animación grande */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 md:landscape:flex-[1.4]">
          {resting && rest.kind === 'ejercicio' && (
            <span className="absolute left-4 top-3 rounded-full bg-accentSoft px-4 py-1.5 text-[15px] font-semibold text-accent">
              Siguiente
            </span>
          )}
          <Figure exercise={shown.exercise} playing={!paused} className="h-full max-h-[70vh] w-full" />
        </div>

        {/* Panel de información y controles */}
        <div className="flex shrink-0 flex-col gap-4 px-4 pb-2 md:landscape:w-[42%] md:landscape:max-w-[560px] md:landscape:justify-center md:landscape:border-l md:landscape:border-line/60 md:landscape:px-8">
          {resting ? (
            <div className="text-center">
              <p className="text-[clamp(18px,3.2vmin,30px)] font-semibold text-muted">
                {rest.kind === 'series' ? 'Descanso' : 'Descanso · cambia de ejercicio'}
              </p>
              <div className="relative mx-auto my-1 flex items-center justify-center">
                <p className="font-bold tabular-nums leading-none text-[clamp(96px,24vmin,240px)]" aria-live="polite">
                  {formatSeconds(Math.ceil(restLeft))}
                </p>
              </div>
              <div className="mx-auto h-3 w-full max-w-md overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-3 text-[clamp(20px,3.6vmin,34px)] font-semibold leading-tight">
                {rest.kind === 'series' ? `Sigue: serie ${rest.next.set} de ${item.series}` : nextItem?.exercise.nombre}
              </p>
              {rest.kind === 'ejercicio' && nextItem && (
                <p className="text-[clamp(16px,2.8vmin,24px)] text-muted">
                  {nextItem.series} × {nextItem.reps} · {formatWeight(suggestWeight(nextItem.exercise, profile), profile.unidad)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center md:landscape:text-left">
              <h1 className="text-[clamp(26px,5.2vmin,52px)] font-bold leading-tight">{item.exercise.nombre}</h1>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Serie" value={`${cur.set}/${item.series}`} big />
                <Stat label={item.exercise.unilateral ? 'Reps/lado' : 'Reps'} value={item.reps} big />
                <Stat label="Peso" value={formatWeight(peso, profile.unidad)} big />
              </div>
              {!isLastEx && isLastSet && <p className="mt-3 text-[clamp(15px,2.6vmin,22px)] text-muted">Después: {plan[cur.ex + 1].exercise.nombre}</p>}
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
          ) : (
            <button className="btn-primary h-20 w-full text-[clamp(22px,4vmin,32px)]" onClick={setDone} disabled={paused}>
              Serie terminada
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!resting && (
              <button className="btn-ghost h-14" onClick={togglePause}>
                {paused ? <IconPlay /> : <IconPause />}
                {paused ? 'Seguir' : 'Pausa'}
              </button>
            )}
            <button className={`btn-ghost h-14 ${resting ? 'col-span-2' : ''}`} onClick={skipExercise}>
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
            {step && <span className="mr-3">Ejercicio {step}</span>}
            {formatClock(elapsed)}
          </p>
        )}
        <span className="w-12" />
      </div>
      {children}
    </div>
  );
}
