import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconPlay, IconPlus } from '../../components/Icons';
import { getExercise } from '../../data/exercises';
import { deleteRoutine, listRoutines } from '../../db';
import { estimateMinutes } from '../../lib/routine';
import { useProfile } from '../../state/ProfileContext';
import type { Routine } from '../../types';

export function RoutinesPage() {
  const { profile } = useProfile();
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const nav = useNavigate();

  const load = () => listRoutines().then(setRoutines);
  useEffect(() => {
    load();
  }, []);

  const remove = async (r: Routine) => {
    if (!confirm(`¿Eliminar la rutina "${r.nombre}"?`)) return;
    await deleteRoutine(r.id);
    load();
  };

  return (
    <div className="page">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="h1">Rutinas</h1>
        <Link to="/rutinas/nueva" className="btn-primary">
          <IconPlus /> Nueva
        </Link>
      </header>

      {routines && routines.length === 0 && (
        <div className="card space-y-4 p-6 text-center">
          <p className="text-lg font-semibold">Aún no tienes rutinas</p>
          <p className="text-muted">Elige varios ejercicios y guárdalos como rutina. Luego entrena con descansos automáticos.</p>
          <Link to="/rutinas/nueva" className="btn-primary mx-auto">
            Crear mi primera rutina
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routines?.map((r) => (
          <article key={r.id} className="card flex flex-col gap-3 p-5">
            <div>
              <h2 className="text-xl font-bold">{r.nombre}</h2>
              <p className="text-[15px] text-muted">
                {r.items.length} {r.items.length === 1 ? 'ejercicio' : 'ejercicios'}
                {profile && ` · ~${estimateMinutes(r, profile)} min`}
              </p>
            </div>
            <ol className="flex-1 space-y-1 text-[15px] text-ink/85">
              {r.items.slice(0, 5).map((it, i) => (
                <li key={i} className="truncate">
                  {i + 1}. {getExercise(it.exerciseId)?.nombre ?? '—'}
                </li>
              ))}
              {r.items.length > 5 && <li className="text-muted">y {r.items.length - 5} más…</li>}
            </ol>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => nav(`/entrenar/${r.id}`)} disabled={!r.items.length}>
                <IconPlay /> Entrenar
              </button>
              <Link to={`/rutinas/${r.id}`} className="btn-ghost">
                Editar
              </Link>
              <button className="btn-ghost px-3 text-red-300" onClick={() => remove(r)} aria-label={`Eliminar ${r.nombre}`}>
                ✕
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
