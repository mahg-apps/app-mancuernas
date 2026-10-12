import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconClose, IconSearch } from '../../components/Icons';
import { EXERCISES, normalize } from '../../data/exercises';
import { MUSCLE_NAME, NIVEL_NAME, ZONAS } from '../../data/muscles';
import { visibleExercises } from '../../lib/safety';
import { useProfile } from '../../state/ProfileContext';
import type { Nivel, TipoEjercicio, Zona } from '../../types';

const TIPOS: { id: TipoEjercicio; nombre: string }[] = [
  { id: 'fuerza', nombre: 'Fuerza' },
  { id: 'calentamiento', nombre: 'Calentamiento' },
  { id: 'estiramiento', nombre: 'Estiramientos' },
];
import { ExerciseCard } from './ExerciseCard';

export function ExerciseList() {
  const [params, setParams] = useSearchParams();
  const zona = (params.get('zona') as Zona | null) ?? null;
  const q = params.get('q') ?? '';
  const tipo = (params.get('tipo') as TipoEjercicio | null) ?? 'fuerza';
  const nivel = (params.get('nivel') as Nivel | null) ?? null;
  const { profile } = useProfile();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const nq = normalize(q);
    return visibleExercises(profile, EXERCISES).filter((e) => {
      if (e.tipo !== tipo) return false;
      if (zona && e.zona !== zona) return false;
      if (nivel && e.nivel !== nivel) return false;
      if (!nq) return true;
      const hay = normalize(
        [e.nombre, ...e.musculosPrincipales.map((m) => MUSCLE_NAME[m]), ...e.musculosSecundarios.map((m) => MUSCLE_NAME[m])].join(' '),
      );
      return hay.includes(nq);
    });
  }, [zona, q, tipo, nivel, profile]);

  return (
    <div className="page">
      <h1 className="h1 mb-4">Ejercicios</h1>
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1" role="tablist" aria-label="Tipo de ejercicio">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tipo === t.id}
            className={`min-h-[48px] rounded-xl px-2 text-[15px] font-semibold transition ${tipo === t.id ? 'bg-surface2 text-ink' : 'text-muted'}`}
            onClick={() => update({ tipo: t.id === 'fuerza' ? null : t.id, nivel: null })}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-bg/95 px-4 pb-3 pt-2 backdrop-blur md:-mx-8 md:px-8">
        <label className="relative block">
          <span className="sr-only">Buscar ejercicio</span>
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input pl-12 pr-12"
            placeholder="Buscar por nombre o músculo"
            value={q}
            onChange={(e) => update({ q: e.target.value || null })}
          />
          {q && (
            <button
              className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-muted"
              onClick={() => update({ q: null })}
              aria-label="Borrar búsqueda"
            >
              <IconClose />
            </button>
          )}
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <button className="chip shrink-0" aria-pressed={!zona} onClick={() => update({ zona: null })}>
            Todas
          </button>
          {ZONAS.map((z) => (
            <button key={z.id} className="chip shrink-0" aria-pressed={zona === z.id} onClick={() => update({ zona: zona === z.id ? null : z.id })}>
              {z.nombre}
            </button>
          ))}
        </div>
        {tipo === 'fuerza' && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Nivel">
            {(Object.keys(NIVEL_NAME) as Nivel[]).map((n) => (
              <button key={n} className="chip shrink-0" aria-pressed={nivel === n} onClick={() => update({ nivel: nivel === n ? null : n })}>
                {NIVEL_NAME[n]}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mb-3 mt-1 text-[15px] text-muted">
        {list.length} {list.length === 1 ? 'ejercicio' : 'ejercicios'}
      </p>
      {list.length ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <ExerciseCard key={e.id} ex={e} />
          ))}
        </div>
      ) : (
        <p className="card p-6 text-center text-muted">No hay ejercicios con esos filtros.</p>
      )}
    </div>
  );
}
