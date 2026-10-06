import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Figure } from '../../animation/Figure';
import { prefersReducedMotion } from '../../animation/useAnimationClock';
import { BodyMap } from '../../body-map/BodyMap';
import { IconBack, IconPause, IconPlay } from '../../components/Icons';
import { getExercise } from '../../data/exercises';
import { ARTICULACION_NAME, MUSCLE_NAME, NIVEL_NAME, OBJETIVO_NAME } from '../../data/muscles';
import { formatWeight, PRESCRIPCION, suggestWeight } from '../../lib/training';
import { useProfile } from '../../state/ProfileContext';
import type { MuscleId } from '../../types';

const SPEEDS = [0.5, 1, 1.5];
const BACK: MuscleId[] = ['hombro_posterior', 'triceps', 'dorsales', 'espalda_baja', 'espalda_alta', 'gluteos', 'isquiotibiales', 'pantorrillas'];

export function ExerciseDetail() {
  const { id } = useParams();
  const ex = id ? getExercise(id) : undefined;
  const { profile } = useProfile();
  const nav = useNavigate();
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState(1);

  if (!ex) {
    return (
      <div className="page space-y-4">
        <p className="text-muted">No encontramos ese ejercicio.</p>
        <Link to="/ejercicios" className="btn-ghost">
          Ver ejercicios
        </Link>
      </div>
    );
  }

  const pres = profile ? PRESCRIPCION[profile.objetivo] : PRESCRIPCION.tonificar;
  const peso = profile ? suggestWeight(ex, profile) : null;
  const rest = profile ? profile.descansos[profile.objetivo] : null;
  const all = [...ex.musculosPrincipales, ...ex.musculosSecundarios];
  // El mapa muestra la cara del cuerpo donde están la mayoría de los músculos trabajados.
  const showBack = all.filter((m) => BACK.includes(m)).length > all.length / 2;
  const cuidado = profile?.limitaciones.filter((l) => ex.articulaciones.includes(l)) ?? [];

  return (
    <div className="page">
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-ghost -ml-2 px-3" onClick={() => (history.length > 1 ? nav(-1) : nav('/ejercicios'))} aria-label="Volver">
          <IconBack />
        </button>
        <div className="min-w-0">
          <h1 className="h1 truncate">{ex.nombre}</h1>
          <p className="text-[15px] text-muted">
            {NIVEL_NAME[ex.nivel]}
            {ex.unilateral && ' · Un lado a la vez'}
            {ex.equipo.includes('banco') && ' · Necesitas banco'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start">
        {/* Animación */}
        <div className="card overflow-hidden md:sticky md:top-4">
          <div className="aspect-[4/3] w-full bg-gradient-to-b from-surface2 to-surface">
            <Figure exercise={ex} playing={playing} speed={speed} className="h-full w-full" />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line/60 p-3">
            <button className="btn-primary w-28" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <IconPause /> : <IconPlay />}
              {playing ? 'Pausa' : 'Play'}
            </button>
            <div className="flex gap-1" role="group" aria-label="Velocidad">
              {SPEEDS.map((s) => (
                <button key={s} className="chip min-w-[56px] px-3" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Información */}
        <div className="space-y-5">
          {cuidado.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[15px]">
              <strong>Precaución:</strong> este ejercicio carga {cuidado.map((c) => ARTICULACION_NAME[c].toLowerCase()).join(' y ')}, que marcaste como zona a cuidar. Usa poco peso y detente si sientes dolor.
            </div>
          )}

          <section className="card grid grid-cols-3 divide-x divide-line/60 text-center">
            <div className="p-3">
              <p className="text-[13px] text-muted">Series</p>
              <p className="text-2xl font-bold">{pres.series}</p>
            </div>
            <div className="p-3">
              <p className="text-[13px] text-muted">Reps{ex.unilateral ? ' / lado' : ''}</p>
              <p className="text-2xl font-bold">{pres.reps}</p>
            </div>
            <div className="p-3">
              <p className="text-[13px] text-muted">Peso sugerido</p>
              <p className="text-2xl font-bold">{profile ? formatWeight(peso, profile.unidad) : '—'}</p>
            </div>
            <p className="col-span-3 border-t border-line/60 px-3 py-2 text-[13px] text-muted">
              Objetivo: {profile ? OBJETIVO_NAME[profile.objetivo] : '—'}
              {rest && ` · descanso ${rest.series} s entre series`}
              {ex.equipo.includes('mancuernas') && ex.animacion.agarre !== 'central' && ' · peso por mancuerna'}
            </p>
          </section>

          <section className="card flex items-center gap-4 p-4">
            <BodyMap
              side={showBack ? 'posterior' : 'frontal'}
              principales={ex.musculosPrincipales}
              secundarios={ex.musculosSecundarios}
              className="h-40 w-20 shrink-0"
            />
            <div className="space-y-3">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Principales</p>
                <p className="flex flex-wrap gap-x-3 text-[17px] font-semibold text-accent">
                  {ex.musculosPrincipales.map((m) => (
                    <span key={m}>{MUSCLE_NAME[m]}</span>
                  ))}
                </p>
              </div>
              {ex.musculosSecundarios.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Secundarios</p>
                  <p className="flex flex-wrap gap-x-3 text-[16px] text-[#e09a7a]">
                    {ex.musculosSecundarios.map((m) => (
                      <span key={m}>{MUSCLE_NAME[m]}</span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xl font-bold">Cómo hacerlo</h2>
            <ol className="space-y-3">
              {ex.pasos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accentSoft text-[15px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{p}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xl font-bold">Errores comunes</h2>
            <ul className="space-y-2">
              {ex.errores.map((e, i) => (
                <li key={i} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-red-400" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-2 text-xl font-bold">Respiración</h2>
            <p className="leading-relaxed text-ink/90">{ex.respiracion}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
