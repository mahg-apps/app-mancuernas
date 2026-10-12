import type { ArmAngles, ExerciseAnimation, LegAngles, MuscleId, Pose, Prop, Vista } from '../types';
import { add, apply, IDENTITY, mul, rx, ry, rz, scale, type M3, type V3 } from './math';

// Proporciones del personaje (unidades de escena; ~180 de alto).
export const BODY = {
  columna: 56,
  hombroAncho: 17,
  hombroAltura: 52,
  caderaAncho: 9,
  cuello: 9,
  cabeza: 11,
  brazo: 30,
  antebrazo: 27,
  mano: 5,
  muslo: 44,
  pierna: 42,
  torsoGrosor: 22,
};

/** -1 = derecha del personaje (−X), +1 = izquierda (+X). */
type Side = -1 | 1;

interface Bone {
  a: V3;
  b: V3;
  m: M3; // orientación del segmento
}

export interface Skeleton {
  pelvis: V3;
  pelvisM: M3;
  torsoM: M3;
  cuello: V3;
  cabeza: V3;
  hombro: Record<Side, V3>;
  brazo: Record<Side, Bone>;
  antebrazo: Record<Side, Bone>;
  mano: Record<Side, V3>;
  manoM: Record<Side, M3>;
  cadera: Record<Side, V3>;
  muslo: Record<Side, Bone>;
  pierna: Record<Side, Bone>;
  talon: Record<Side, V3>;
  punta: Record<Side, V3>;
}

function solveArm(torsoM: M3, shoulder: V3, s: Side, a: ArmAngles) {
  const [flex, abd, rot, codo, prono] = a;
  const mUpper = mul(torsoM, mul(rz(s * abd), mul(rx(-flex), ry(s * rot))));
  const elbow = add(shoulder, apply(mUpper, [0, -BODY.brazo, 0]));
  const mFore = mul(mUpper, mul(rx(-codo), ry(s * prono)));
  const wrist = add(elbow, apply(mFore, [0, -BODY.antebrazo, 0]));
  const hand = add(wrist, apply(mFore, [0, -BODY.mano, 0]));
  return {
    upper: { a: shoulder, b: elbow, m: mUpper },
    fore: { a: elbow, b: wrist, m: mFore },
    hand,
    handM: mFore,
  };
}

function solveLeg(pelvisM: M3, hip: V3, s: Side, l: LegAngles, yaw: number) {
  const [flex, abd, rodilla, tobillo] = l;
  const mThigh = mul(pelvisM, mul(rz(s * abd), rx(-flex)));
  const knee = add(hip, apply(mThigh, [0, -BODY.muslo, 0]));
  const mShin = mul(mThigh, rx(rodilla));
  const ankle = add(knee, apply(mShin, [0, -BODY.pierna, 0]));
  // El pie se orienta respecto al suelo: plano salvo flexión plantar.
  const mFoot = mul(ry(yaw), rx(tobillo));
  const heel = add(ankle, apply(mFoot, [0, -5, -4]));
  const toe = add(ankle, apply(mFoot, [0, -5, 14]));
  return { thigh: { a: hip, b: knee, m: mThigh }, shin: { a: knee, b: ankle, m: mShin }, heel, toe };
}

/** Cinemática directa: de ángulos articulares a posiciones 3D (pelvis en el origen). */
export function solveSkeleton(p: Pose): Skeleton {
  const [pitch, roll, yaw] = p.cuerpo;
  const pelvisM = mul(ry(yaw), mul(rx(pitch), rz(roll)));
  const [tf, tl, tr] = p.torso;
  const torsoM = mul(pelvisM, mul(rx(tf), mul(rz(tl), ry(tr))));
  const pelvis: V3 = [0, 0, 0];
  const cuello = apply(torsoM, [0, BODY.columna, 0]);
  const headM = mul(torsoM, rx(p.cabeza));
  const cabeza = add(cuello, apply(headM, [0, BODY.cuello + BODY.cabeza - 2, 1.5]));

  const sk = { pelvis, pelvisM, torsoM, cuello, cabeza } as Skeleton;
  sk.hombro = {} as Skeleton['hombro'];
  sk.brazo = {} as Skeleton['brazo'];
  sk.antebrazo = {} as Skeleton['antebrazo'];
  sk.mano = {} as Skeleton['mano'];
  sk.manoM = {} as Skeleton['manoM'];
  sk.cadera = {} as Skeleton['cadera'];
  sk.muslo = {} as Skeleton['muslo'];
  sk.pierna = {} as Skeleton['pierna'];
  sk.talon = {} as Skeleton['talon'];
  sk.punta = {} as Skeleton['punta'];

  for (const s of [-1, 1] as Side[]) {
    const shoulder = apply(torsoM, [s * BODY.hombroAncho, BODY.hombroAltura, 0]);
    const arm = solveArm(torsoM, shoulder, s, s === -1 ? p.brazoD : p.brazoI);
    sk.hombro[s] = shoulder;
    sk.brazo[s] = arm.upper;
    sk.antebrazo[s] = arm.fore;
    sk.mano[s] = arm.hand;
    sk.manoM[s] = arm.handM;

    const hip = apply(pelvisM, [s * BODY.caderaAncho, -3, 0]);
    const leg = solveLeg(pelvisM, hip, s, s === -1 ? p.piernaD : p.piernaI, yaw);
    sk.cadera[s] = hip;
    sk.muslo[s] = leg.thigh;
    sk.pierna[s] = leg.shin;
    sk.talon[s] = leg.heel;
    sk.punta[s] = leg.toe;
  }
  return sk;
}

/** Altura de la superficie de apoyo: el banco si hay, si no el piso. */
function surface(anim: ExerciseAnimation): number {
  return anim.props?.find((p) => p.tipo === 'banco')?.alto ?? 0;
}

/** Desplazamiento que coloca al personaje sobre el suelo o el banco. */
export function groundOffset(sk: Skeleton, anim: ExerciseAnimation): V3 {
  if (anim.apoyo === 'pies') {
    const pts = [sk.talon[-1], sk.talon[1], sk.punta[-1], sk.punta[1]];
    const minY = Math.min(...pts.map((p) => p[1]));
    // Las puntas de los pies apoyados quedan fijas en el piso (si uno se levanta, no cuenta).
    const planted = ([-1, 1] as Side[]).filter((s) => Math.min(sk.talon[s][1], sk.punta[s][1]) < minY + 4);
    const cx = planted.reduce((a, s) => a + sk.punta[s][0], 0) / planted.length;
    const cz = planted.reduce((a, s) => a + sk.punta[s][2], 0) / planted.length;
    return [-cx, 3 - minY, -cz];
  }
  if (anim.apoyo === 'gluteos') {
    return [0, 10, 0];
  }
  if (anim.apoyo === 'hombros') {
    // La parte alta de la espalda descansa sobre el banco (hip thrust) o el piso (puente).
    const mid = scale(add(sk.hombro[-1], sk.hombro[1]), 0.5);
    return [-mid[0], surface(anim) + BODY.torsoGrosor / 2 - 1 - mid[1], -mid[2]];
  }
  return [0, surface(anim) + BODY.torsoGrosor / 2 - 1, 0];
}

// ---------- Proyección y dibujo ----------

export type Drawable =
  | { kind: 'line'; a: [number, number]; b: [number, number]; w: number; fill: string; depth: number; opacity?: number }
  | { kind: 'circle'; c: [number, number]; r: number; fill: string; depth: number; opacity?: number }
  | { kind: 'poly'; pts: [number, number][]; w: number; fill: string; depth: number; opacity?: number };

interface Camera {
  m: M3;
  vista: Vista;
}

export function makeCamera(vista: Vista, yaw = 0): Camera {
  return { m: yaw ? ry(yaw) : IDENTITY, vista };
}

function project(cam: Camera, p: V3): { uv: [number, number]; depth: number } {
  const q = apply(cam.m, p);
  if (cam.vista === 'lateral') return { uv: [q[2], -q[1]], depth: q[0] };
  return { uv: [q[0], -q[1]], depth: -q[2] };
}

/** Cuánto mira una normal hacia la cámara (−1 a 1). */
function facing(cam: Camera, n: V3): number {
  const q = apply(cam.m, n);
  return cam.vista === 'lateral' ? -q[0] : q[2];
}

export const COLORS = {
  cerca: '#c7d1e0',
  lejos: '#6d7a90',
  torso: '#aab6c9',
  pesa: '#55657e',
  pesaBorde: '#8a98ae',
  mango: '#9aa6b8',
  banco: '#2a3445',
  bancoBorde: '#3a4659',
  acento: '#ff7a3d',
  acentoSuave: '#ffb08a',
};

interface MuscleOverlay {
  bone: 'brazo' | 'antebrazo' | 'muslo' | 'pierna' | 'torso' | 'hombro' | 'cadera';
  from: number;
  to: number;
  offset: V3; // en el marco local del segmento
  w: number;
  normal: V3; // para ocultar músculos que miran al lado contrario
  bilateralX?: number; // para el torso: separa en dos lados
}

const OVERLAYS: Record<MuscleId, MuscleOverlay> = {
  pecho: { bone: 'torso', from: 0.66, to: 0.86, offset: [0, 0, 7], w: 10, normal: [0, 0, 1], bilateralX: 7 },
  abdomen: { bone: 'torso', from: 0.12, to: 0.55, offset: [0, 0, 7], w: 9, normal: [0, 0, 1] },
  oblicuos: { bone: 'torso', from: 0.12, to: 0.5, offset: [0, 0, 3], w: 6, normal: [0, 0, 1], bilateralX: 12 },
  espalda_alta: { bone: 'torso', from: 0.72, to: 0.95, offset: [0, 0, -7], w: 10, normal: [0, 0, -1], bilateralX: 6 },
  dorsales: { bone: 'torso', from: 0.42, to: 0.75, offset: [0, 0, -6], w: 9, normal: [0, 0, -1], bilateralX: 10 },
  espalda_baja: { bone: 'torso', from: 0.08, to: 0.38, offset: [0, 0, -7], w: 8, normal: [0, 0, -1], bilateralX: 4 },
  gluteos: { bone: 'cadera', from: 0, to: 0, offset: [0, -2, -8], w: 13, normal: [0, 0, -1] },
  hombro_anterior: { bone: 'hombro', from: 0, to: 0, offset: [0, 0, 4], w: 10, normal: [0, 0, 1] },
  hombro_lateral: { bone: 'hombro', from: 0, to: 0, offset: [3, 1, 0], w: 10, normal: [1, 0, 0] },
  hombro_posterior: { bone: 'hombro', from: 0, to: 0, offset: [0, 0, -4], w: 10, normal: [0, 0, -1] },
  biceps: { bone: 'brazo', from: 0.25, to: 0.8, offset: [0, 0, 2.5], w: 6.5, normal: [0, 0, 1] },
  triceps: { bone: 'brazo', from: 0.15, to: 0.8, offset: [0, 0, -2.5], w: 6.5, normal: [0, 0, -1] },
  antebrazos: { bone: 'antebrazo', from: 0.08, to: 0.65, offset: [0, 0, 0], w: 7, normal: [0, 0, 1] },
  cuadriceps: { bone: 'muslo', from: 0.15, to: 0.85, offset: [0, 0, 3.5], w: 9, normal: [0, 0, 1] },
  isquiotibiales: { bone: 'muslo', from: 0.2, to: 0.85, offset: [0, 0, -3.5], w: 8, normal: [0, 0, -1] },
  pantorrillas: { bone: 'pierna', from: 0.1, to: 0.55, offset: [0, 0, -3], w: 7.5, normal: [0, 0, -1] },
};

export interface Highlight {
  principales: MuscleId[];
  secundarios: MuscleId[];
  /** Intensidad 0–1 de la fase de trabajo. */
  intensidad: number;
}

// Los props están en coordenadas del mundo (no se desplazan con el personaje).
function propDrawables(cam: Camera, prop: Prop): Drawable[] {
  const w = (prop.ancho ?? 26) / 2;
  const y = prop.alto;
  const [z0, z1] = prop.z;
  const x = prop.x;
  const corners: V3[] = [
    [x - w, y, z0],
    [x + w, y, z0],
    [x + w, y, z1],
    [x - w, y, z1],
  ];
  const top = corners.map((c) => project(cam, c));
  // Los elementos de escena siempre quedan detrás del cuerpo.
  const depth = top.reduce((s, t) => s + t.depth, 0) / 4 + 60;
  const pad: Drawable = {
    kind: 'poly',
    pts: top.map((t) => t.uv),
    w: 8,
    fill: COLORS.bancoBorde,
    depth,
  };
  const legs: Drawable[] = [z0 + 8, z1 - 8].map((z) => {
    const a = project(cam, [x, y - 4, z]);
    const b = project(cam, [x, 0, z]);
    return { kind: 'line', a: a.uv, b: b.uv, w: 6, fill: COLORS.banco, depth: a.depth + 60.01 };
  });
  return [...legs, pad];
}

/** Construye la lista de figuras 2D, ordenadas de atrás hacia adelante. */
export function buildScene(
  sk: Skeleton,
  anim: ExerciseAnimation,
  cam: Camera,
  hl: Highlight | null,
): Drawable[] {
  const off = groundOffset(sk, anim);
  const P = (v: V3) => project(cam, add(v, off));
  const out: Drawable[] = [];

  const sideColor = (s: Side) => {
    // El lado más cercano a la cámara se ve más claro.
    const d = P(sk.hombro[s]).depth - P(sk.hombro[(-s) as Side]).depth;
    return d <= 0 ? COLORS.cerca : COLORS.lejos;
  };

  const line = (a: V3, b: V3, w: number, fill: string, dBias = 0, opacity?: number) => {
    const pa = P(a);
    const pb = P(b);
    out.push({ kind: 'line', a: pa.uv, b: pb.uv, w, fill, depth: (pa.depth + pb.depth) / 2 + dBias, opacity });
  };

  for (const prop of anim.props ?? []) out.push(...propDrawables(cam, prop));

  // Torso como polígono redondeado (en vista lateral se ve como cápsula).
  const torsoPts = [sk.hombro[-1], sk.hombro[1], sk.cadera[1], sk.cadera[-1]].map((v) => P(v));
  out.push({
    kind: 'poly',
    pts: torsoPts.map((t) => t.uv),
    w: BODY.torsoGrosor,
    fill: COLORS.torso,
    depth: P(sk.pelvis).depth,
  });
  line(sk.cuello, apply(sk.torsoM, [0, BODY.columna - 6, 0]), 8, COLORS.torso, -0.01);
  const head = P(sk.cabeza);
  out.push({ kind: 'circle', c: head.uv, r: BODY.cabeza, fill: COLORS.cerca, depth: head.depth - 0.02 });

  for (const s of [-1, 1] as Side[]) {
    const c = sideColor(s);
    line(sk.muslo[s].a, sk.muslo[s].b, 14, c);
    line(sk.pierna[s].a, sk.pierna[s].b, 10.5, c);
    line(sk.talon[s], sk.punta[s], 6, c, -0.5);
    line(sk.brazo[s].a, sk.brazo[s].b, 10, c);
    line(sk.antebrazo[s].a, sk.antebrazo[s].b, 8.5, c);
  }

  // Mancuernas.
  const dumbbell = (center: V3, axis: V3, bias: number) => {
    const half = 9;
    const plate = 5;
    const e1 = add(center, scale(axis, half));
    const e2 = add(center, scale(axis, -half));
    line(e2, e1, 3.5, COLORS.mango, bias);
    for (const e of [e1, e2]) {
      const sgn = e === e1 ? 1 : -1;
      line(add(e, scale(axis, -sgn * 0.5)), add(e, scale(axis, sgn * plate)), 13, COLORS.pesa, bias - 0.05);
    }
  };
  const hands: Side[] = anim.agarre === 'ambas' ? [-1, 1] : anim.agarre === 'derecha' ? [-1] : anim.agarre === 'izquierda' ? [1] : [];
  for (const s of hands) dumbbell(sk.mano[s], apply(sk.manoM[s], [1, 0, 0]), -0.6);
  if (anim.agarre === 'central') {
    const mid = scale(add(sk.mano[-1], sk.mano[1]), 0.5);
    dumbbell(add(mid, apply(sk.torsoM, [0, -9, 4])), apply(sk.torsoM, [0, 1, 0]), -8);
  }

  // Resaltado muscular.
  if (hl) {
    const draw = (id: MuscleId, strength: number, color: string) => {
      const o = OVERLAYS[id];
      const onlySide = anim.resaltarLado === 'derecha' ? -1 : anim.resaltarLado === 'izquierda' ? 1 : 0;
      for (const s of [-1, 1] as Side[]) {
        if (onlySide && s !== onlySide && o.bone !== 'torso') continue;
        let a: V3;
        let b: V3;
        let m: M3;
        let normalM: M3;
        if (o.bone === 'torso') {
          m = sk.torsoM;
          normalM = m;
          const x = (o.bilateralX ?? 0) * s;
          a = apply(m, add([x, BODY.columna * o.from, 0], o.offset));
          b = apply(m, add([x, BODY.columna * o.to, 0], o.offset));
          if (!o.bilateralX && s === 1) continue;
        } else if (o.bone === 'hombro') {
          m = sk.torsoM;
          normalM = m;
          const local: V3 = [o.offset[0] * s, o.offset[1], o.offset[2]];
          a = add(sk.hombro[s], apply(m, local));
          b = a;
        } else if (o.bone === 'cadera') {
          m = sk.pelvisM;
          normalM = m;
          a = add(sk.cadera[s], apply(m, o.offset));
          b = add(a, apply(m, [0, 3, 0]));
        } else {
          const bone = sk[o.bone][s];
          m = bone.m;
          normalM = m;
          const len = o.bone === 'brazo' ? BODY.brazo : o.bone === 'antebrazo' ? BODY.antebrazo : o.bone === 'muslo' ? BODY.muslo : BODY.pierna;
          a = add(bone.a, apply(m, add([0, -len * o.from, 0], o.offset)));
          b = add(bone.a, apply(m, add([0, -len * o.to, 0], o.offset)));
        }
        const n = apply(normalM, o.bone === 'hombro' ? [o.normal[0] * s, o.normal[1], o.normal[2]] : o.normal);
        const vis = Math.max(0, Math.min(1, (facing(cam, n) + 0.75) / 0.6));
        if (vis <= 0.02) continue;
        const pa = P(a);
        const pb = P(b);
        const partDepth =
          o.bone === 'torso' ? P(sk.pelvis).depth - 0.3 : (P(sk.hombro[s]).depth + P(sk.cadera[s]).depth) / 2;
        // Si el lado está detrás del cuerpo, lo dibujamos justo encima de su segmento.
        const depth = o.bone === 'torso' ? partDepth : (pa.depth + pb.depth) / 2 - 0.4;
        out.push({
          kind: 'line',
          a: pa.uv,
          b: pb.uv,
          w: o.w,
          fill: color,
          depth,
          opacity: strength * vis,
        });
      }
    };
    for (const id of hl.secundarios) draw(id, 0.35 + 0.25 * hl.intensidad, COLORS.acentoSuave);
    for (const id of hl.principales) draw(id, 0.45 + 0.55 * hl.intensidad, COLORS.acento);
  }

  out.sort((a, b) => b.depth - a.depth);
  return out;
}

/** Caja que contiene toda la animación, para encuadrar la escena sin saltos. */
export function sceneBounds(drawables: Drawable[][]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number, r: number) => {
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  };
  for (const list of drawables) {
    for (const d of list) {
      if (d.kind === 'circle') grow(d.c[0], d.c[1], d.r);
      else if (d.kind === 'line') {
        grow(d.a[0], d.a[1], d.w / 2);
        grow(d.b[0], d.b[1], d.w / 2);
      } else d.pts.forEach((p) => grow(p[0], p[1], d.w / 2));
    }
  }
  maxY = Math.max(maxY, 0);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
