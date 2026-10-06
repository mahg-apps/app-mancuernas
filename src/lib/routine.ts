import { getExercise } from '../data/exercises';
import type { Exercise, Profile, Routine, RoutineItem } from '../types';
import { PRESCRIPCION } from './training';

/** Segundos aproximados por repetición. */
const SEG_POR_REP = 3.5;

export interface PlannedItem {
  exercise: Exercise;
  series: number;
  reps: string;
  repsObjetivo: number;
}

/** Combina cada ejercicio de la rutina con las series y reps del objetivo del perfil. */
export function planRoutine(r: Routine, profile: Profile): PlannedItem[] {
  const pres = PRESCRIPCION[profile.objetivo];
  return r.items
    .map((it: RoutineItem) => {
      const exercise = getExercise(it.exerciseId);
      if (!exercise) return null;
      const reps = it.reps ?? pres.reps;
      return {
        exercise,
        series: it.series ?? pres.series,
        reps,
        repsObjetivo: parseInt(reps, 10) || pres.repsObjetivo,
      };
    })
    .filter((x): x is PlannedItem => x !== null);
}

/** Duración estimada en minutos, incluyendo descansos. */
export function estimateMinutes(r: Routine, profile: Profile): number {
  const plan = planRoutine(r, profile);
  const rest = profile.descansos[profile.objetivo];
  let s = 0;
  plan.forEach((p, i) => {
    const lados = p.exercise.unilateral ? 2 : 1;
    s += p.series * p.repsObjetivo * SEG_POR_REP * lados;
    s += (p.series - 1) * rest.series;
    if (i < plan.length - 1) s += rest.ejercicios;
  });
  return Math.max(1, Math.round(s / 60));
}
