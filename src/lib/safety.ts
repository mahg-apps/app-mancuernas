import { EXERCISES, getExercise } from '../data/exercises';
import type { Articulacion, Exercise, Nivel, Profile } from '../types';

/** Articulaciones limitadas del perfil que carga este ejercicio. */
export function limitedJoints(ex: Exercise, profile: Profile | null): Articulacion[] {
  if (!profile) return [];
  return ex.articulaciones.filter((a) => profile.limitaciones.includes(a));
}

/** true si el perfil pide ocultar los ejercicios que cargan zonas limitadas y este es uno. */
export function isHidden(ex: Exercise, profile: Profile | null): boolean {
  return profile?.modoLimitaciones === 'ocultar' && limitedJoints(ex, profile).length > 0;
}

/** Ejercicios visibles para el perfil (sin los ocultos por limitaciones). */
export function visibleExercises(profile: Profile | null, list: Exercise[] = EXERCISES): Exercise[] {
  return list.filter((e) => !isHidden(e, profile));
}

const NIVEL_N: Record<Nivel, number> = { principiante: 0, intermedio: 1, avanzado: 2 };

/**
 * Sustitutos para el mismo músculo que respetan las limitaciones.
 * Primero los definidos a mano en los datos; después los que más músculos comparten,
 * con preferencia por un nivel igual o menor al del perfil.
 */
export function substitutes(ex: Exercise, profile: Profile | null, limit = 4): Exercise[] {
  const ok = (e: Exercise) => e.id !== ex.id && e.tipo === ex.tipo && limitedJoints(e, profile).length === 0;
  const manual = ex.sustitutos.map(getExercise).filter((e): e is Exercise => !!e && ok(e));
  const nivel = profile ? NIVEL_N[profile.nivel] : 1;

  const score = (e: Exercise) => {
    const prin = e.musculosPrincipales.filter((m) => ex.musculosPrincipales.includes(m)).length;
    if (!prin) return -1;
    const sec = [...e.musculosPrincipales, ...e.musculosSecundarios].filter((m) =>
      [...ex.musculosPrincipales, ...ex.musculosSecundarios].includes(m),
    ).length;
    const nivelPen = Math.max(0, NIVEL_N[e.nivel] - nivel) * 2;
    return prin * 4 + sec - nivelPen + (e.zona === ex.zona ? 1 : 0);
  };

  const auto = EXERCISES.filter((e) => ok(e) && !manual.includes(e))
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e);

  return [...manual, ...auto].slice(0, limit);
}

/** Segundos que toma un ejercicio por tiempo (por ambos lados si es unilateral). */
export function timedSeconds(e: Exercise): number {
  return (e.duracionSeg ?? 30) * (e.unilateral ? 2 : 1);
}

const UPPER = new Set(['pecho', 'hombros', 'brazos', 'espalda']);
const LOWER = new Set(['piernas', 'gluteos']);

/**
 * Calentamiento de 3 a 5 minutos según las zonas de la rutina.
 * Siempre empieza con marcha; luego agrega movilidad de las zonas que se van a trabajar.
 */
export function buildWarmup(main: Exercise[], profile: Profile | null): Exercise[] {
  const zonas = new Set(main.map((e) => e.zona));
  const upper = [...zonas].some((z) => UPPER.has(z));
  const lower = [...zonas].some((z) => LOWER.has(z));
  const hinge = main.some((e) => e.musculosPrincipales.some((m) => m === 'isquiotibiales' || m === 'espalda_baja'));

  const wanted = ['marcha-brazos'];
  if (upper || !lower) wanted.push('circulos-brazos');
  if (lower) wanted.push('sentadilla-sin-peso', 'rotacion-cadera');
  if (hinge || lower) wanted.push('bisagra-cadera');
  wanted.push('rotacion-torso');
  // Si faltan minutos, completa con el resto.
  for (const id of ['circulos-brazos', 'rotacion-cadera', 'sentadilla-sin-peso', 'bisagra-cadera']) {
    if (!wanted.includes(id)) wanted.push(id);
  }

  const out: Exercise[] = [];
  let secs = 0;
  for (const id of wanted) {
    const e = getExercise(id);
    if (!e || limitedJoints(e, profile).length) continue;
    if (secs >= 180 && secs + timedSeconds(e) > 300) break;
    out.push(e);
    secs += timedSeconds(e);
    if (secs >= 240) break;
  }
  return out;
}

/** De 3 a 5 estiramientos de los músculos que trabajó la rutina. */
export function buildStretches(main: Exercise[], profile: Profile | null): Exercise[] {
  const worked = new Map<string, number>();
  for (const e of main) {
    e.musculosPrincipales.forEach((m) => worked.set(m, (worked.get(m) ?? 0) + 2));
    e.musculosSecundarios.forEach((m) => worked.set(m, (worked.get(m) ?? 0) + 1));
  }
  const pool = EXERCISES.filter((e) => e.tipo === 'estiramiento' && limitedJoints(e, profile).length === 0);
  const ranked = pool
    .map((e) => ({
      e,
      s: [...e.musculosPrincipales, ...e.musculosSecundarios].reduce((a, m) => a + (worked.get(m) ?? 0), 0),
    }))
    .sort((a, b) => b.s - a.s);
  const picked = ranked.filter((x) => x.s > 0).slice(0, 5).map((x) => x.e);
  for (const x of ranked) {
    if (picked.length >= 3) break;
    if (!picked.includes(x.e)) picked.push(x.e);
  }
  return picked;
}
