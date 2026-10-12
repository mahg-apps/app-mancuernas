import { Link } from 'react-router-dom';
import { Figure } from '../../animation/Figure';
import { ARTICULACION_NAME, MUSCLE_NAME, NIVEL_NAME } from '../../data/muscles';
import { limitedJoints } from '../../lib/safety';
import { useProfile } from '../../state/ProfileContext';
import type { Exercise } from '../../types';

/** Tarjeta con miniatura (pose de máximo esfuerzo), nombre y músculos principales. */
export function ExerciseCard({ ex, compact = false }: { ex: Exercise; compact?: boolean }) {
  // Miniatura en el momento de mayor activación muscular.
  const peak = ex.animacion.activacion.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const { profile } = useProfile();
  const cuidado = limitedJoints(ex, profile);

  return (
    <Link
      to={`/ejercicio/${ex.id}`}
      className="card group flex min-h-[96px] items-center gap-4 p-3 transition hover:border-accent/60 active:scale-[0.99]"
    >
      <div className={`shrink-0 overflow-hidden rounded-2xl bg-surface2 ${compact ? 'h-20 w-20' : 'h-24 w-24'}`}>
        <Figure exercise={ex} staticPhase={peak} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[18px] font-semibold leading-snug">{ex.nombre}</h3>
        <p className="mt-0.5 truncate text-[15px] text-accent">
          {ex.musculosPrincipales.map((m) => MUSCLE_NAME[m]).join(' · ')}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {ex.tipo === 'fuerza' ? NIVEL_NAME[ex.nivel] : `${ex.duracionSeg ?? 30} s${ex.unilateral ? ' por lado' : ''}`}
          {ex.equipo.includes('banco') && ' · Banco'}
        </p>
        {cuidado.length > 0 && (
          <p className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[13px] font-medium text-amber-200">
            ⚠ {cuidado.map((c) => ARTICULACION_NAME[c]).join(', ')}
          </p>
        )}
      </div>
    </Link>
  );
}
