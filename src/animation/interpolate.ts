import type { ArmAngles, Ease, ExerciseAnimation, Pose, PoseInput } from '../types';

export const DEFAULT_POSE: Pose = {
  cuerpo: [0, 0, 0],
  torso: [0, 0, 0],
  cabeza: 0,
  hombrosY: 0,
  brazoD: [0, 8, 0, 8, 90, 0],
  brazoI: [0, 8, 0, 8, 90, 0],
  piernaD: [0, 5, 0, 0],
  piernaI: [0, 5, 0, 0],
};

/** Completa la muñeca (opcional en los datos) para poder interpolar. */
const arm = (a: ArmAngles): ArmAngles => [a[0], a[1], a[2], a[3], a[4], a[5] ?? 0];

/** Combina una pose parcial sobre una pose completa. */
export function resolvePose(input: PoseInput | undefined, over: Pose = DEFAULT_POSE): Pose {
  const p: Pose = {
    cuerpo: [...over.cuerpo],
    torso: [...over.torso],
    cabeza: over.cabeza,
    hombrosY: over.hombrosY,
    brazoD: [...over.brazoD],
    brazoI: [...over.brazoI],
    piernaD: [...over.piernaD],
    piernaI: [...over.piernaI],
  };
  if (!input) return p;
  if (input.cuerpo) p.cuerpo = [...input.cuerpo];
  if (input.torso) p.torso = [...input.torso];
  if (input.cabeza !== undefined) p.cabeza = input.cabeza;
  if (input.hombrosY !== undefined) p.hombrosY = input.hombrosY;
  if (input.brazos) {
    p.brazoD = arm(input.brazos);
    p.brazoI = arm(input.brazos);
  }
  if (input.brazoD) p.brazoD = arm(input.brazoD);
  if (input.brazoI) p.brazoI = arm(input.brazoI);
  if (input.piernas) {
    p.piernaD = [...input.piernas];
    p.piernaI = [...input.piernas];
  }
  if (input.piernaD) p.piernaD = [...input.piernaD];
  if (input.piernaI) p.piernaI = [...input.piernaI];
  return p;
}

const EASES: Record<Ease, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

function lerpArr<T extends number[]>(a: T, b: T, k: number): T {
  return a.map((v, i) => v + (b[i] - v) * k) as T;
}

function lerpPose(a: Pose, b: Pose, k: number): Pose {
  return {
    cuerpo: lerpArr(a.cuerpo, b.cuerpo, k),
    torso: lerpArr(a.torso, b.torso, k),
    cabeza: a.cabeza + (b.cabeza - a.cabeza) * k,
    hombrosY: a.hombrosY + (b.hombrosY - a.hombrosY) * k,
    brazoD: lerpArr(a.brazoD as number[], b.brazoD as number[], k) as ArmAngles,
    brazoI: lerpArr(a.brazoI as number[], b.brazoI as number[], k) as ArmAngles,
    piernaD: lerpArr(a.piernaD, b.piernaD, k),
    piernaI: lerpArr(a.piernaI, b.piernaI, k),
  };
}

export interface CompiledAnimation {
  frames: { t: number; pose: Pose; ease: Ease }[];
  activacion: [number, number][];
}

/** Precalcula las poses completas de cada keyframe (cada uno hereda del anterior). */
export function compileAnimation(anim: ExerciseAnimation): CompiledAnimation {
  const base = resolvePose(anim.base);
  const sorted = [...anim.keyframes].sort((x, y) => x.t - y.t);
  let prev = base;
  const frames = sorted.map((kf) => {
    const pose = resolvePose(kf.pose, prev);
    prev = pose;
    return { t: kf.t, pose, ease: kf.ease ?? 'inOut' };
  });
  if (frames.length === 0) frames.push({ t: 0, pose: base, ease: 'linear' });
  // Cierra el bucle volviendo al primer keyframe.
  if (frames[frames.length - 1].t < 1) {
    frames.push({ t: 1, pose: frames[0].pose, ease: 'inOut' });
  }
  if (frames[0].t > 0) {
    frames.unshift({ t: 0, pose: frames[frames.length - 1].pose, ease: 'linear' });
  }
  return { frames, activacion: anim.activacion.length ? anim.activacion : [[0, 0.6]] };
}

/** Pose en el instante `t` (0–1) de una repetición. */
export function poseAt(c: CompiledAnimation, t: number): Pose {
  const f = c.frames;
  const tt = ((t % 1) + 1) % 1;
  for (let i = 1; i < f.length; i++) {
    if (tt <= f[i].t) {
      const span = f[i].t - f[i - 1].t || 1;
      const k = EASES[f[i].ease]((tt - f[i - 1].t) / span);
      return lerpPose(f[i - 1].pose, f[i].pose, k);
    }
  }
  return f[f.length - 1].pose;
}

/** Intensidad (0–1) del músculo principal en el instante `t`. */
export function activationAt(c: CompiledAnimation, t: number): number {
  const a = c.activacion;
  const tt = ((t % 1) + 1) % 1;
  if (tt <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (tt <= a[i][0]) {
      const span = a[i][0] - a[i - 1][0] || 1;
      const k = EASES.inOut((tt - a[i - 1][0]) / span);
      return a[i - 1][1] + (a[i][1] - a[i - 1][1]) * k;
    }
  }
  return a[a.length - 1][1];
}
