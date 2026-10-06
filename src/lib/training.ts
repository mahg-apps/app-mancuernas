import type { Descanso, Exercise, Mancuernas, Nivel, Objetivo, Profile, Unidad } from '../types';

export interface Prescripcion {
  series: number;
  reps: string;
  /** Reps objetivo para el modo entrenamiento (el valor alto del rango). */
  repsObjetivo: number;
}

export const PRESCRIPCION: Record<Objetivo, Prescripcion> = {
  tonificar: { series: 3, reps: '12–15', repsObjetivo: 12 },
  fuerza: { series: 4, reps: '6–8', repsObjetivo: 8 },
  resistencia: { series: 3, reps: '15–20', repsObjetivo: 15 },
};

/** Descansos recomendados (en segundos), ajustables en Configuración. */
export const DESCANSOS_DEFAULT: Record<Objetivo, Descanso> = {
  tonificar: { series: 40, ejercicios: 75 },
  fuerza: { series: 105, ejercicios: 150 },
  resistencia: { series: 25, ejercicios: 50 },
};

export const RANGOS_DESCANSO: Record<Objetivo, { series: [number, number]; ejercicios: [number, number] }> = {
  tonificar: { series: [30, 45], ejercicios: [60, 90] },
  fuerza: { series: [90, 120], ejercicios: [120, 180] },
  resistencia: { series: [20, 30], ejercicios: [45, 60] },
};

const KG_PER_LB = 0.45359237;

export function toKg(v: number, u: Unidad): number {
  return u === 'kg' ? v : v * KG_PER_LB;
}

export function fromKg(kg: number, u: Unidad): number {
  return u === 'kg' ? kg : kg / KG_PER_LB;
}

/** Lista de pesos disponibles (en la unidad del perfil), ordenada. */
export function availableWeights(m: Mancuernas): number[] {
  if (m.tipo === 'fijas') return [...new Set(m.pesos)].filter((p) => p > 0).sort((a, b) => a - b);
  const out: number[] = [];
  const inc = m.incremento > 0 ? m.incremento : 1;
  for (let w = m.min; w <= m.max + 1e-9 && out.length < 200; w += inc) out.push(Math.round(w * 100) / 100);
  return out;
}

const NIVEL_IDX: Record<Nivel, 0 | 1 | 2> = { principiante: 0, intermedio: 1, avanzado: 2 };
const FACTOR_OBJETIVO: Record<Objetivo, number> = { tonificar: 1, fuerza: 1.15, resistencia: 0.8 };

/**
 * Peso sugerido por mancuerna, elegido SOLO entre los pesos disponibles.
 * Toma el peso disponible más cercano al objetivo sin pasarse; si todos lo superan, el más ligero.
 */
export function suggestWeight(ex: Exercise, profile: Profile): number | null {
  const pesos = availableWeights(profile.mancuernas);
  if (!pesos.length) return null;
  const targetKg = ex.cargaKg[NIVEL_IDX[profile.nivel]] * FACTOR_OBJETIVO[profile.objetivo];
  const target = fromKg(targetKg, profile.unidad);
  const below = pesos.filter((p) => p <= target * 1.05);
  return below.length ? below[below.length - 1] : pesos[0];
}

export function formatWeight(v: number | null, u: Unidad): string {
  if (v === null) return '—';
  const n = Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(/\.0$/, '');
  return `${n} ${u}`;
}

export function formatSeconds(total: number): string {
  const t = Math.max(0, Math.round(total));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m ? `${m}:${s.toString().padStart(2, '0')}` : `${s}`;
}

export function defaultProfile(): Profile {
  const now = Date.now();
  return {
    unidad: 'kg',
    mancuernas: { tipo: 'fijas', pesos: [] },
    objetivo: 'tonificar',
    nivel: 'principiante',
    limitaciones: [],
    descansos: structuredClone(DESCANSOS_DEFAULT),
    creado: now,
    actualizado: now,
  };
}
