import { getExercise } from '../data/exercises';
import type { Exercise, Profile, Routine, RoutineItem } from '../types';
import { buildStretches, buildWarmup, timedSeconds } from './safety';
import { PRESCRIPCION } from './training';

/** Segundos aproximados por repetición. */
const SEG_POR_REP = 3.5;
/** Pausa de preparación antes de cada ejercicio por tiempo. */
export const PREP_SEG = 5;

export type Bloque = 'calentamiento' | 'principal' | 'estiramiento';

export interface PlannedItem {
  exercise: Exercise;
  bloque: Bloque;
  modo: 'reps' | 'tiempo';
  /** Series (por repeticiones) o lados (por tiempo: 1 o 2). */
  series: number;
  reps: string;
  repsObjetivo: number;
  /** Duración por lado de los ejercicios por tiempo. */
  segundos: number;
}

export interface PlanOptions {
  calentamiento: boolean;
  estiramientos: boolean;
}

/** Opciones por defecto: lo que diga la rutina y, si no dice nada, el perfil. */
export function defaultOptions(r: Routine, profile: Profile): PlanOptions {
  return {
    calentamiento: r.calentamiento ?? profile.calentamiento,
    estiramientos: r.estiramientos ?? profile.estiramientos,
  };
}

function timed(e: Exercise, bloque: Bloque): PlannedItem {
  return { exercise: e, bloque, modo: 'tiempo', series: e.unilateral ? 2 : 1, reps: '', repsObjetivo: 0, segundos: e.duracionSeg ?? 30 };
}

/** Ejercicios principales de la rutina con series y reps según el objetivo del perfil. */
export function planMain(r: Routine, profile: Profile): PlannedItem[] {
  const pres = PRESCRIPCION[profile.objetivo];
  return r.items
    .map((it: RoutineItem): PlannedItem | null => {
      const exercise = getExercise(it.exerciseId);
      if (!exercise) return null;
      if (exercise.tipo !== 'fuerza') return timed(exercise, 'principal');
      const reps = it.reps ?? pres.reps;
      return {
        exercise,
        bloque: 'principal',
        modo: 'reps',
        series: it.series ?? pres.series,
        reps,
        repsObjetivo: parseInt(reps, 10) || pres.repsObjetivo,
        segundos: 0,
      };
    })
    .filter((x): x is PlannedItem => x !== null);
}

/** Plan completo: calentamiento + rutina + estiramientos. */
export function planRoutine(r: Routine, profile: Profile, opts: PlanOptions = defaultOptions(r, profile)): PlannedItem[] {
  const main = planMain(r, profile);
  const mainEx = main.map((p) => p.exercise);
  const warm = opts.calentamiento ? buildWarmup(mainEx, profile).map((e) => timed(e, 'calentamiento')) : [];
  const stretch = opts.estiramientos ? buildStretches(mainEx, profile).map((e) => timed(e, 'estiramiento')) : [];
  return [...warm, ...main, ...stretch];
}

/** Duración estimada en minutos, incluyendo descansos, calentamiento y estiramientos. */
export function estimateMinutes(r: Routine, profile: Profile, opts?: PlanOptions): number {
  const plan = planRoutine(r, profile, opts);
  const rest = profile.descansos[profile.objetivo];
  const mainCount = plan.filter((p) => p.bloque === 'principal').length;
  let s = 0;
  let seen = 0;
  for (const p of plan) {
    if (p.modo === 'tiempo') {
      s += timedSeconds(p.exercise) + PREP_SEG * p.series;
      continue;
    }
    seen++;
    const lados = p.exercise.unilateral ? 2 : 1;
    s += p.series * p.repsObjetivo * SEG_POR_REP * lados;
    s += (p.series - 1) * rest.series;
    if (seen < mainCount) s += rest.ejercicios;
  }
  return Math.max(1, Math.round(s / 60));
}
