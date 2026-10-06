import type { MuscleId } from '../types';

// Silueta original, estilo geométrico. Coordenadas en un lienzo de 200×420.
// Se dibuja solo el lado izquierdo de la pantalla (x < 100) y se refleja para el otro.
// `m: null` = zona neutra (cabeza, manos, rodillas…), no se puede seleccionar.

export interface Shape {
  m: MuscleId | null;
  d: string;
  /** Si es true, la forma está centrada y no se refleja. */
  center?: boolean;
}

const rect = (x: number, y: number, w: number, h: number, r = 3) =>
  `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;

const HEAD = ellipse(100, 30, 16, 20);
const NECK = 'M92,46 L108,46 L111,60 L89,60 Z';
const HAND = ellipse(42, 216, 6.5, 11);
const KNEE = ellipse(82, 326, 10, 8);
const FOREARM = 'M50,157 Q42,177 39,201 Q43,207 50,205 Q58,184 63,158 Q57,152 50,157 Z';
const SHIN = 'M77,336 L89,336 Q92,364 89,394 L80,394 Q76,364 77,336 Z';
const FOOT = 'M76,396 L90,396 Q94,404 92,410 L74,410 Q72,402 76,396 Z';

export const FRONT: Shape[] = [
  { m: null, d: HEAD, center: true },
  { m: null, d: NECK, center: true },
  { m: 'espalda_alta', d: 'M90,57 Q81,63 71,67 L86,70 Q91,64 91,57 Z' },
  { m: 'hombro_lateral', d: 'M70,68 Q54,68 50,84 Q48,98 53,111 Q57,95 61,85 Q65,75 70,68 Z' },
  { m: 'hombro_anterior', d: 'M71,68 Q66,75 62,85 Q58,96 55,111 Q65,106 71,96 Q77,85 82,73 Z' },
  { m: 'pecho', d: 'M98.5,72 L85,72 Q75,80 73,96 Q74,111 86,116 Q94,118 98.5,116 Z' },
  { m: 'biceps', d: 'M54,115 Q48,131 49,148 Q54,156 60,152 Q66,136 69,111 Q62,108 54,115 Z' },
  { m: 'antebrazos', d: FOREARM },
  { m: null, d: HAND },
  { m: 'abdomen', d: rect(88, 120, 10.5, 16) },
  { m: 'abdomen', d: rect(88, 139, 10.5, 16) },
  { m: 'abdomen', d: rect(88, 158, 10.5, 17) },
  { m: 'abdomen', d: rect(88, 178, 10.5, 21) },
  { m: 'oblicuos', d: 'M85.5,120 Q78,119 75,124 Q72,150 76,176 Q79,192 85.5,201 Z' },
  { m: null, d: 'M78,194 Q81,199 86,203 L98.5,203 L98.5,232 Q86,227 72,224 Q74,208 78,194 Z' },
  { m: 'cuadriceps', d: 'M72,227 Q64,262 68,300 Q73,317 90,317 Q97,296 98,262 Q98,244 93,234 Z' },
  { m: null, d: KNEE },
  { m: null, d: SHIN },
  { m: 'pantorrillas', d: 'M73,338 Q66,360 72,388 L78,388 Q75,362 78,338 Z' },
  { m: 'pantorrillas', d: 'M89,340 Q95,358 92,384 L89,384 Q90,362 88,340 Z' },
  { m: null, d: FOOT },
];

export const BACK: Shape[] = [
  { m: null, d: HEAD, center: true },
  { m: null, d: NECK, center: true },
  { m: 'espalda_alta', d: 'M100,46 L92,51 Q85,61 70,67 Q84,76 90,96 L100,124 Z' },
  { m: 'hombro_posterior', d: 'M69,68 Q54,69 50,85 Q49,99 53,111 Q62,97 70,89 Q76,81 80,74 Z' },
  { m: 'triceps', d: 'M54,115 Q48,132 50,150 Q56,156 62,151 Q67,132 67,111 Q60,108 54,115 Z' },
  { m: 'antebrazos', d: FOREARM },
  { m: null, d: HAND },
  { m: 'dorsales', d: 'M89,101 L98.5,129 L98.5,176 Q88,176 82,168 Q72,140 72,112 Q73,97 79,88 Q85,92 89,101 Z' },
  { m: 'espalda_baja', d: 'M84,180 L98.5,180 L98.5,206 Q90,206 84,201 Q81,190 84,180 Z' },
  { m: null, d: 'M80,170 Q78,186 79,198 L74,204 Q72,186 76,170 Z' },
  { m: 'gluteos', d: 'M98.5,209 Q86,207 76,212 Q70,226 72,242 Q80,256 98.5,252 Z' },
  { m: 'isquiotibiales', d: 'M72,247 Q66,276 70,306 Q76,318 92,316 Q98,290 98,257 Q86,259 72,247 Z' },
  { m: null, d: KNEE },
  { m: null, d: SHIN },
  { m: 'pantorrillas', d: 'M71,334 Q62,356 70,380 Q78,390 91,384 Q96,356 91,334 Q81,328 71,334 Z' },
  { m: null, d: FOOT },
];
