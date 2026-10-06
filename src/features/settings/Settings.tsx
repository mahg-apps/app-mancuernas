import { useEffect, useState } from 'react';
import { OBJETIVO_NAME } from '../../data/muscles';
import { DESCANSOS_DEFAULT, RANGOS_DESCANSO } from '../../lib/training';
import { useProfile } from '../../state/ProfileContext';
import type { Objetivo, Profile } from '../../types';
import { DumbbellsFields, GoalFields, isDumbbellsValid, LimitationsFields } from '../onboarding/ProfileFields';

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost px-0" onClick={() => onChange(Math.max(5, value - 5))} aria-label={`Restar 5 s a ${label}`}>
          −
        </button>
        <span className="w-16 text-center text-lg font-semibold tabular-nums">{value} s</span>
        <button className="btn-ghost px-0" onClick={() => onChange(value + 5)} aria-label={`Sumar 5 s a ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const { profile, save } = useProfile();
  const [p, setP] = useState<Profile | null>(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => setP(profile), [profile]);
  if (!p) return null;

  const dirty = JSON.stringify(p) !== JSON.stringify(profile);
  const valid = isDumbbellsValid(p.mancuernas);

  const setRest = (o: Objetivo, key: 'series' | 'ejercicios', v: number) =>
    setP({ ...p, descansos: { ...p.descansos, [o]: { ...p.descansos[o], [key]: v } } });

  const onSave = async () => {
    await save(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="page max-w-3xl space-y-6">
      <h1 className="h1">Ajustes</h1>

      <div className="card space-y-6 p-5">
        <h2 className="text-xl font-bold">Mancuernas</h2>
        <DumbbellsFields profile={p} onChange={setP} />
      </div>

      <div className="card space-y-6 p-5">
        <h2 className="text-xl font-bold">Objetivo y nivel</h2>
        <GoalFields profile={p} onChange={setP} />
      </div>

      <div className="card space-y-6 p-5">
        <h2 className="text-xl font-bold">Limitaciones</h2>
        <LimitationsFields profile={p} onChange={setP} />
      </div>

      <div className="card space-y-5 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Descansos</h2>
          <button className="btn-ghost text-[15px]" onClick={() => setP({ ...p, descansos: structuredClone(DESCANSOS_DEFAULT) })}>
            Restablecer
          </button>
        </div>
        {(Object.keys(OBJETIVO_NAME) as Objetivo[]).map((o) => (
          <div key={o} className={`space-y-2 rounded-2xl p-3 ${o === p.objetivo ? 'bg-surface2' : ''}`}>
            <p className="font-semibold">
              {OBJETIVO_NAME[o]}
              {o === p.objetivo && <span className="ml-2 text-[13px] font-medium text-accent">tu objetivo</span>}
            </p>
            <Stepper
              label={`Entre series (sugerido ${RANGOS_DESCANSO[o].series.join('–')} s)`}
              value={p.descansos[o].series}
              onChange={(v) => setRest(o, 'series', v)}
            />
            <Stepper
              label={`Entre ejercicios (sugerido ${RANGOS_DESCANSO[o].ejercicios.join('–')} s)`}
              value={p.descansos[o].ejercicios}
              onChange={(v) => setRest(o, 'ejercicios', v)}
            />
          </div>
        ))}
      </div>

      <div className="sticky-save sticky z-20 flex justify-end">
        <button className="btn-primary shadow-xl" disabled={!dirty || !valid} onClick={onSave}>
          {saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
