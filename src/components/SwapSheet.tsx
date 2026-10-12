import { useState } from 'react';
import { Figure } from '../animation/Figure';
import { MUSCLE_NAME, NIVEL_NAME } from '../data/muscles';
import { substitutes } from '../lib/safety';
import type { Exercise, Profile } from '../types';
import { IconClose } from './Icons';

interface Props {
  exercise: Exercise;
  profile: Profile | null;
  onPick: (e: Exercise, saveToRoutine: boolean) => void;
  onClose: () => void;
  /** Muestra la casilla "Guardar en la rutina" (solo durante el entrenamiento). */
  allowSave?: boolean;
}

/** Hoja inferior con sustitutos del mismo músculo que respetan las limitaciones. */
export function SwapSheet({ exercise, profile, onPick, onClose, allowSave = false }: Props) {
  const [save, setSave] = useState(false);
  const options = substitutes(exercise, profile, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cambiar ${exercise.nombre}`}
        className="card max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 md:rounded-b-3xl"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Cambiar ejercicio</h2>
            <p className="text-[15px] text-muted">
              Alternativas para {exercise.musculosPrincipales.map((m) => MUSCLE_NAME[m].toLowerCase()).join(' y ')}
              {profile?.limitaciones.length ? ' que respetan tus limitaciones' : ''}.
            </p>
          </div>
          <button className="btn px-2 text-muted" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>

        {options.length === 0 ? (
          <p className="py-6 text-center text-muted">No encontramos alternativas seguras para este ejercicio.</p>
        ) : (
          <div className="space-y-2">
            {options.map((e) => (
              <button
                key={e.id}
                className="card flex min-h-[76px] w-full items-center gap-3 p-2 pr-4 text-left transition hover:border-accent/60"
                onClick={() => onPick(e, save)}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2">
                  <Figure exercise={e} staticPhase={e.animacion.activacion.reduce((a, b) => (b[1] > a[1] ? b : a))[0]} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{e.nombre}</p>
                  <p className="truncate text-[14px] text-accent">{e.musculosPrincipales.map((m) => MUSCLE_NAME[m]).join(' · ')}</p>
                  <p className="text-[13px] text-muted">
                    {NIVEL_NAME[e.nivel]}
                    {e.equipo.includes('banco') && ' · Banco'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {allowSave && options.length > 0 && (
          <label className="mt-4 flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl bg-surface2 px-4">
            <input type="checkbox" className="h-5 w-5 accent-[#ff7a3d]" checked={save} onChange={(e) => setSave(e.target.checked)} />
            <span>Guardar el cambio en la rutina</span>
          </label>
        )}
      </div>
    </div>
  );
}
