import { useState } from 'react';
import { IconPlus } from '../../components/Icons';
import { ARTICULACION_NAME, NIVEL_NAME, OBJETIVO_NAME } from '../../data/muscles';
import { availableWeights, PRESCRIPCION, RANGOS_DESCANSO } from '../../lib/training';
import type { Articulacion, Mancuernas, Nivel, Objetivo, Profile, Unidad } from '../../types';

type Change = (p: Profile) => void;

const COMUNES: Record<Unidad, number[]> = {
  kg: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32],
  lb: [3, 5, 8, 10, 12, 15, 17.5, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70],
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {hint && <p className="text-[15px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[15px] text-muted">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="input pr-12"
        />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

export function DumbbellsFields({ profile, onChange }: { profile: Profile; onChange: Change }) {
  const [custom, setCustom] = useState('');
  const m = profile.mancuernas;
  const u = profile.unidad;
  const setM = (mancuernas: Mancuernas) => onChange({ ...profile, mancuernas });

  const setUnit = (unidad: Unidad) => {
    if (unidad === u) return;
    // Al cambiar de unidad se reinicia la lista para no mezclar valores.
    onChange({
      ...profile,
      unidad,
      mancuernas:
        m.tipo === 'fijas'
          ? { tipo: 'fijas', pesos: [] }
          : unidad === 'kg'
            ? { tipo: 'ajustables', min: 2, max: 24, incremento: 2 }
            : { tipo: 'ajustables', min: 5, max: 50, incremento: 5 },
    });
  };

  const toggle = (w: number) => {
    if (m.tipo !== 'fijas') return;
    const has = m.pesos.includes(w);
    setM({ tipo: 'fijas', pesos: has ? m.pesos.filter((p) => p !== w) : [...m.pesos, w].sort((a, b) => a - b) });
  };

  const addCustom = () => {
    const v = parseFloat(custom.replace(',', '.'));
    if (m.tipo === 'fijas' && v > 0 && !m.pesos.includes(v)) {
      setM({ tipo: 'fijas', pesos: [...m.pesos, v].sort((a, b) => a - b) });
    }
    setCustom('');
  };

  const chips = m.tipo === 'fijas' ? [...new Set([...COMUNES[u], ...m.pesos])].sort((a, b) => a - b) : [];
  const preview = availableWeights(m);

  return (
    <div className="space-y-6">
      <Section title="Unidad">
        <div className="flex gap-2">
          {(['kg', 'lb'] as Unidad[]).map((x) => (
            <button key={x} className="chip min-w-[72px]" aria-pressed={u === x} onClick={() => setUnit(x)}>
              {x}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tipo de mancuernas">
        <div className="grid grid-cols-2 gap-2">
          <button
            className="chip"
            aria-pressed={m.tipo === 'fijas'}
            onClick={() => m.tipo !== 'fijas' && setM({ tipo: 'fijas', pesos: [] })}
          >
            Pares fijos
          </button>
          <button
            className="chip"
            aria-pressed={m.tipo === 'ajustables'}
            onClick={() =>
              m.tipo !== 'ajustables' &&
              setM(u === 'kg' ? { tipo: 'ajustables', min: 2, max: 24, incremento: 2 } : { tipo: 'ajustables', min: 5, max: 50, incremento: 5 })
            }
          >
            Ajustables
          </button>
        </div>
      </Section>

      {m.tipo === 'fijas' ? (
        <Section title="¿Qué pares tienes?" hint="Toca cada peso que tengas (peso de una mancuerna).">
          <div className="flex flex-wrap gap-2">
            {chips.map((w) => (
              <button key={w} className="chip min-w-[64px]" aria-pressed={m.pesos.includes(w)} onClick={() => toggle(w)}>
                {w}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              inputMode="decimal"
              placeholder={`Otro peso (${u})`}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            />
            <button className="btn-ghost shrink-0" onClick={addCustom} aria-label="Agregar peso">
              <IconPlus />
            </button>
          </div>
        </Section>
      ) : (
        <Section title="Rango de tus mancuernas ajustables" hint="Peso de una mancuerna.">
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Mínimo" suffix={u} value={m.min} onChange={(v) => setM({ ...m, min: v })} />
            <NumberField label="Máximo" suffix={u} value={m.max} onChange={(v) => setM({ ...m, max: v })} />
            <NumberField label="Incremento" suffix={u} step={0.5} value={m.incremento} onChange={(v) => setM({ ...m, incremento: v })} />
          </div>
          <p className="text-[15px] text-muted">
            {preview.length ? `${preview.length} pesos: ${preview.slice(0, 8).join(', ')}${preview.length > 8 ? '…' : ''} ${u}` : 'Revisa los valores.'}
          </p>
        </Section>
      )}
    </div>
  );
}

export function GoalFields({ profile, onChange }: { profile: Profile; onChange: Change }) {
  return (
    <div className="space-y-6">
      <Section title="Objetivo principal">
        <div className="grid gap-2">
          {(Object.keys(OBJETIVO_NAME) as Objetivo[]).map((o) => {
            const p = PRESCRIPCION[o];
            const r = RANGOS_DESCANSO[o];
            return (
              <button
                key={o}
                aria-pressed={profile.objetivo === o}
                onClick={() => onChange({ ...profile, objetivo: o })}
                className={`card flex min-h-[64px] flex-col items-start px-5 py-3 text-left transition ${
                  profile.objetivo === o ? 'border-accent bg-accentSoft' : ''
                }`}
              >
                <span className="text-lg font-semibold">{OBJETIVO_NAME[o]}</span>
                <span className="text-[15px] text-muted">
                  {p.series} series de {p.reps} reps · descanso {r.series[0]}–{r.series[1]} s
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Nivel">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(NIVEL_NAME) as Nivel[]).map((n) => (
            <button key={n} className="chip px-2" aria-pressed={profile.nivel === n} onClick={() => onChange({ ...profile, nivel: n })}>
              {NIVEL_NAME[n]}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function LimitationsFields({ profile, onChange }: { profile: Profile; onChange: Change }) {
  const toggle = (a: Articulacion) => {
    const has = profile.limitaciones.includes(a);
    onChange({ ...profile, limitaciones: has ? profile.limitaciones.filter((x) => x !== a) : [...profile.limitaciones, a] });
  };
  return (
    <Section
      title="¿Tienes molestias o lesiones?"
      hint="Marca las zonas que debes cuidar. Puedes dejarlo vacío y cambiarlo después."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ARTICULACION_NAME) as Articulacion[]).map((a) => (
          <button key={a} className="chip" aria-pressed={profile.limitaciones.includes(a)} onClick={() => toggle(a)}>
            {ARTICULACION_NAME[a]}
          </button>
        ))}
      </div>
    </Section>
  );
}

export function isDumbbellsValid(m: Mancuernas): boolean {
  return availableWeights(m).length > 0 && (m.tipo === 'fijas' || m.max >= m.min);
}
