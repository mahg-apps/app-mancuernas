import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Figure } from '../../animation/Figure';
import { IconBack, IconCheck, IconPlus } from '../../components/Icons';
import { EXERCISES, getExercise } from '../../data/exercises';
import { ARTICULACION_NAME, MUSCLE_NAME, ZONAS } from '../../data/muscles';
import { getRoutine, newId, saveRoutine } from '../../db';
import { estimateMinutes } from '../../lib/routine';
import { limitedJoints, visibleExercises } from '../../lib/safety';
import { useProfile } from '../../state/ProfileContext';
import type { Routine, Zona } from '../../types';

/** Crear o editar una rutina: elegir ejercicios y ordenarlos. */
export function RoutineEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'nueva';
  const nav = useNavigate();
  const { profile } = useProfile();
  const [nombre, setNombre] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [zona, setZona] = useState<Zona | null>(null);
  const [original, setOriginal] = useState<Routine | null>(null);
  const [cal, setCal] = useState<boolean | undefined>(undefined);
  const [est, setEst] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (isNew) return;
    getRoutine(id!).then((r) => {
      if (!r) return nav('/rutinas', { replace: true });
      setOriginal(r);
      setNombre(r.nombre);
      setIds(r.items.map((i) => i.exerciseId));
      setCal(r.calentamiento);
      setEst(r.estiramientos);
    });
  }, [id, isNew, nav]);

  const toggle = (exId: string) => setIds((cur) => (cur.includes(exId) ? cur.filter((x) => x !== exId) : [...cur, exId]));
  const move = (i: number, d: -1 | 1) =>
    setIds((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const draft: Routine = useMemo(
    () => ({
      id: original?.id ?? '',
      nombre,
      predefinida: false,
      items: ids.map((exerciseId) => ({ exerciseId })),
      calentamiento: cal,
      estiramientos: est,
      creado: original?.creado ?? Date.now(),
      actualizado: Date.now(),
    }),
    [ids, nombre, original, cal, est],
  );

  const save = async () => {
    const r: Routine = { ...draft, id: draft.id || newId(), nombre: nombre.trim() || 'Mi rutina', actualizado: Date.now() };
    await saveRoutine(r);
    nav('/rutinas');
  };

  const pool = visibleExercises(profile, EXERCISES).filter((e) => e.tipo === 'fuerza' && (!zona || e.zona === zona));
  const calOn = cal ?? profile?.calentamiento ?? true;
  const estOn = est ?? profile?.estiramientos ?? true;

  return (
    <div className="page">
      <div className="mb-4 flex items-center gap-2">
        <button className="btn-ghost -ml-2 px-3" onClick={() => nav('/rutinas')} aria-label="Volver">
          <IconBack />
        </button>
        <h1 className="h1">{isNew ? 'Nueva rutina' : 'Editar rutina'}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Rutina en construcción */}
        <section className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <label className="block space-y-1">
            <span className="text-[15px] text-muted">Nombre</span>
            <input className="input text-lg" placeholder="Ej. Tren superior" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>

          <div className="card p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Orden ({ids.length})</h2>
              {profile && ids.length > 0 && <span className="text-[15px] text-muted">~{estimateMinutes(draft, profile)} min</span>}
            </div>
            {ids.length === 0 ? (
              <p className="py-4 text-muted">Toca los ejercicios de la lista para agregarlos.</p>
            ) : (
              <ol className="space-y-2">
                {ids.map((exId, i) => {
                  const e = getExercise(exId);
                  return (
                    <li key={exId} className="flex items-center gap-2 rounded-2xl bg-surface2 py-1 pl-4 pr-1">
                      <span className="w-6 font-bold text-accent">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {e?.nombre}
                        {e && limitedJoints(e, profile).length > 0 && <span className="ml-1 text-amber-300">⚠</span>}
                      </span>
                      <button className="btn px-0 text-muted" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                        ▲
                      </button>
                      <button className="btn px-0 text-muted" onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label="Bajar">
                        ▼
                      </button>
                      <button className="btn px-0 text-red-300" onClick={() => toggle(exId)} aria-label="Quitar">
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="space-y-2">
            {[
              { label: 'Calentamiento al inicio', on: calOn, set: setCal },
              { label: 'Estiramientos al final', on: estOn, set: setEst },
            ].map((t) => (
              <label key={t.label} className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface px-4">
                <span>{t.label}</span>
                <input type="checkbox" className="h-6 w-6 accent-[#ff7a3d]" checked={t.on} onChange={(ev) => t.set(ev.target.checked)} />
              </label>
            ))}
          </div>

          <button className="btn-primary w-full text-lg" onClick={save} disabled={!ids.length}>
            Guardar rutina
          </button>
        </section>

        {/* Selector de ejercicios */}
        <section className="min-w-0 space-y-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            <button className="chip shrink-0" aria-pressed={!zona} onClick={() => setZona(null)}>
              Todas
            </button>
            {ZONAS.map((z) => (
              <button key={z.id} className="chip shrink-0" aria-pressed={zona === z.id} onClick={() => setZona(zona === z.id ? null : z.id)}>
                {z.nombre}
              </button>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {pool.map((e) => {
              const on = ids.includes(e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => toggle(e.id)}
                  aria-pressed={on}
                  className={`card flex min-h-[80px] items-center gap-3 p-2 pr-4 text-left transition ${on ? 'border-accent bg-accentSoft' : ''}`}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2">
                    <Figure exercise={e} staticPhase={e.animacion.activacion.reduce((a, b) => (b[1] > a[1] ? b : a))[0]} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{e.nombre}</p>
                    <p className="truncate text-[14px] text-muted">{e.musculosPrincipales.map((m) => MUSCLE_NAME[m]).join(' · ')}</p>
                    {limitedJoints(e, profile).length > 0 && (
                      <p className="text-[13px] text-amber-200">⚠ {limitedJoints(e, profile).map((c) => ARTICULACION_NAME[c]).join(', ')}</p>
                    )}
                  </div>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${on ? 'bg-accent text-[#1a0d05]' : 'bg-surface2 text-muted'}`}>
                    {on ? <IconCheck width={20} height={20} /> : <IconPlus width={20} height={20} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
