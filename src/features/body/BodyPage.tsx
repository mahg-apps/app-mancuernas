import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BodyMap, type BodySide } from '../../body-map/BodyMap';
import { IconFlip } from '../../components/Icons';
import { EXERCISES, exercisesForMuscle } from '../../data/exercises';
import { MUSCLES, MUSCLE_NAME } from '../../data/muscles';
import { useIsTablet } from '../../hooks/useMediaQuery';
import type { MuscleId } from '../../types';
import { ExerciseCard } from '../exercises/ExerciseCard';

const BACK_MUSCLES: MuscleId[] = ['hombro_posterior', 'triceps', 'dorsales', 'espalda_baja', 'gluteos', 'isquiotibiales'];

export function BodyPage() {
  const isTablet = useIsTablet();
  const [params, setParams] = useSearchParams();
  const selected = (params.get('m') as MuscleId | null) ?? null;
  const [side, setSide] = useState<BodySide>(selected && BACK_MUSCLES.includes(selected) ? 'posterior' : 'frontal');

  const available = useMemo(() => {
    const s = new Set<MuscleId>();
    EXERCISES.forEach((e) => [...e.musculosPrincipales, ...e.musculosSecundarios].forEach((m) => s.add(m)));
    return s;
  }, []);

  const select = (m: MuscleId) => {
    const next = selected === m ? null : m;
    setParams(next ? { m: next } : {}, { replace: true });
  };

  const result = selected ? exercisesForMuscle(selected) : null;

  return (
    <div className="page">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="h1">Tu cuerpo</h1>
          <p className="text-muted">Toca un músculo para ver sus ejercicios.</p>
        </div>
        {!isTablet && (
          <button
            className="btn-ghost"
            onClick={() => setSide(side === 'frontal' ? 'posterior' : 'frontal')}
            aria-label="Girar figura"
          >
            <IconFlip /> {side === 'frontal' ? 'Espalda' : 'Frente'}
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="card relative flex justify-center gap-2 p-4 md:p-6">
          {isTablet ? (
            <>
              <figure className="flex flex-1 flex-col items-center">
                <BodyMap side="frontal" selected={selected} available={available} onSelect={select} className="h-[58vh] max-h-[560px] w-full" />
                <figcaption className="mt-2 text-[15px] text-muted">Frente</figcaption>
              </figure>
              <figure className="flex flex-1 flex-col items-center">
                <BodyMap side="posterior" selected={selected} available={available} onSelect={select} className="h-[58vh] max-h-[560px] w-full" />
                <figcaption className="mt-2 text-[15px] text-muted">Espalda</figcaption>
              </figure>
            </>
          ) : (
            <BodyMap side={side} selected={selected} available={available} onSelect={select} className="h-[52vh] max-h-[520px] w-full" />
          )}
        </div>

        <section className="min-w-0 space-y-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="list" aria-label="Grupos musculares">
            {MUSCLES.map((m) => (
              <button
                key={m.id}
                role="listitem"
                className="chip shrink-0"
                aria-pressed={selected === m.id}
                onClick={() => {
                  if (!isTablet) setSide(BACK_MUSCLES.includes(m.id) ? 'posterior' : 'frontal');
                  select(m.id);
                }}
              >
                {m.nombre}
              </button>
            ))}
          </div>

          {selected && result ? (
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">{MUSCLE_NAME[selected]}</h2>
              {result.principal.length === 0 && result.secundario.length === 0 && (
                <p className="card p-5 text-muted">Pronto habrá ejercicios para este músculo.</p>
              )}
              {result.principal.length > 0 && (
                <>
                  <p className="text-[15px] font-semibold uppercase tracking-wide text-muted">Trabajo principal</p>
                  <div className="grid gap-3">
                    {result.principal.map((e) => (
                      <ExerciseCard key={e.id} ex={e} compact />
                    ))}
                  </div>
                </>
              )}
              {result.secundario.length > 0 && (
                <>
                  <p className="pt-2 text-[15px] font-semibold uppercase tracking-wide text-muted">También lo trabajan</p>
                  <div className="grid gap-3">
                    {result.secundario.map((e) => (
                      <ExerciseCard key={e.id} ex={e} compact />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="card p-5 text-muted">
              Elige un músculo en la figura o en la lista de arriba para ver qué ejercicios lo trabajan.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
