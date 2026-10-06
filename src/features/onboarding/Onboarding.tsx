import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack, IconDumbbell } from '../../components/Icons';
import { defaultProfile } from '../../lib/training';
import { useProfile } from '../../state/ProfileContext';
import type { Profile } from '../../types';
import { DumbbellsFields, GoalFields, isDumbbellsValid, LimitationsFields } from './ProfileFields';

const STEPS = ['Tus mancuernas', 'Objetivo y nivel', 'Cuidados'];

/** Asistente de 3 pantallas que se muestra la primera vez. */
export function Onboarding() {
  const { profile: saved, save } = useProfile();
  const [p, setP] = useState<Profile>(() => saved ?? defaultProfile());
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  const canNext = step !== 0 || isDumbbellsValid(p.mancuernas);

  const next = async () => {
    if (step < STEPS.length - 1) return setStep(step + 1);
    setSaving(true);
    await save(p);
    nav('/', { replace: true });
  };

  return (
    <div
      className="mx-auto flex min-h-full max-w-xl flex-col px-5"
      style={{ paddingTop: 'calc(var(--safe-top) + 20px)', paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
    >
      <header className="mb-6 space-y-4">
        <div className="flex items-center gap-2 text-lg font-bold">
          <IconDumbbell className="text-accent" /> Mancuernas
        </div>
        <div className="flex gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <div>
          <p className="text-[15px] text-muted">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h1 className="h1">{STEPS[step]}</h1>
          {step === 0 && (
            <p className="mt-1 text-muted">La app solo te sugerirá pesos que realmente tienes.</p>
          )}
        </div>
      </header>

      <div className="flex-1">
        {step === 0 && <DumbbellsFields profile={p} onChange={setP} />}
        {step === 1 && <GoalFields profile={p} onChange={setP} />}
        {step === 2 && <LimitationsFields profile={p} onChange={setP} />}
      </div>

      <footer className="sticky bottom-0 mt-8 flex gap-3 bg-bg pt-3">
        {step > 0 && (
          <button className="btn-ghost" onClick={() => setStep(step - 1)} aria-label="Atrás">
            <IconBack />
          </button>
        )}
        <button className="btn-primary flex-1 text-lg" disabled={!canNext || saving} onClick={next}>
          {step < STEPS.length - 1 ? 'Siguiente' : 'Empezar'}
        </button>
      </footer>
    </div>
  );
}
