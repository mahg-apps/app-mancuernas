// Álgebra mínima para el esqueleto 3D.
// Ejes del mundo: X = lado izquierdo del personaje, Y = arriba, Z = hacia adelante.

export type V3 = [number, number, number];
/** Matriz 3×3 en orden por filas. */
export type M3 = [number, number, number, number, number, number, number, number, number];

const DEG = Math.PI / 180;

export const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul(a: M3, b: M3): M3 {
  const r = new Array(9) as M3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
}

export function apply(m: M3, v: V3): V3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const lerpV = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Rotación sobre X. Con ángulo positivo, "arriba" se va hacia adelante. */
export function rx(deg: number): M3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

/** Rotación sobre Y (giro). */
export function ry(deg: number): M3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

/** Rotación sobre Z. Con ángulo positivo, "abajo" se va hacia +X. */
export function rz(deg: number): M3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
