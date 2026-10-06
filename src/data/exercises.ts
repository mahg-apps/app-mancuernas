import type { Exercise, MuscleId } from '../types';
import raw from './exercises.json';

export const EXERCISES = raw as unknown as Exercise[];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** Ejercicios que trabajan un músculo: primero donde es principal, luego secundario. */
export function exercisesForMuscle(m: MuscleId): { principal: Exercise[]; secundario: Exercise[] } {
  return {
    principal: EXERCISES.filter((e) => e.musculosPrincipales.includes(m)),
    secundario: EXERCISES.filter((e) => e.musculosSecundarios.includes(m)),
  };
}

/** Búsqueda sin acentos ni mayúsculas. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
