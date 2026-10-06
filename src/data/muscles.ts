import type { Articulacion, MuscleId, Nivel, Objetivo, Zona } from '../types';

export interface MuscleInfo {
  id: MuscleId;
  nombre: string;
  zona: Zona;
}

export const MUSCLES: MuscleInfo[] = [
  { id: 'pecho', nombre: 'Pecho', zona: 'pecho' },
  { id: 'hombro_anterior', nombre: 'Hombro anterior', zona: 'hombros' },
  { id: 'hombro_lateral', nombre: 'Hombro lateral', zona: 'hombros' },
  { id: 'hombro_posterior', nombre: 'Hombro posterior', zona: 'hombros' },
  { id: 'biceps', nombre: 'Bíceps', zona: 'brazos' },
  { id: 'triceps', nombre: 'Tríceps', zona: 'brazos' },
  { id: 'antebrazos', nombre: 'Antebrazos', zona: 'brazos' },
  { id: 'abdomen', nombre: 'Abdomen', zona: 'core' },
  { id: 'oblicuos', nombre: 'Oblicuos', zona: 'core' },
  { id: 'espalda_alta', nombre: 'Espalda alta', zona: 'espalda' },
  { id: 'dorsales', nombre: 'Dorsales', zona: 'espalda' },
  { id: 'espalda_baja', nombre: 'Espalda baja', zona: 'espalda' },
  { id: 'gluteos', nombre: 'Glúteos', zona: 'gluteos' },
  { id: 'cuadriceps', nombre: 'Cuádriceps', zona: 'piernas' },
  { id: 'isquiotibiales', nombre: 'Isquiotibiales', zona: 'piernas' },
  { id: 'pantorrillas', nombre: 'Pantorrillas', zona: 'piernas' },
];

export const MUSCLE_NAME: Record<MuscleId, string> = Object.fromEntries(
  MUSCLES.map((m) => [m.id, m.nombre]),
) as Record<MuscleId, string>;

export const ZONAS: { id: Zona; nombre: string }[] = [
  { id: 'pecho', nombre: 'Pecho' },
  { id: 'hombros', nombre: 'Hombros' },
  { id: 'brazos', nombre: 'Brazos' },
  { id: 'espalda', nombre: 'Espalda' },
  { id: 'core', nombre: 'Core' },
  { id: 'gluteos', nombre: 'Glúteos' },
  { id: 'piernas', nombre: 'Piernas' },
];

export const ZONA_NAME: Record<Zona, string> = Object.fromEntries(ZONAS.map((z) => [z.id, z.nombre])) as Record<
  Zona,
  string
>;

export const NIVEL_NAME: Record<Nivel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const OBJETIVO_NAME: Record<Objetivo, string> = {
  tonificar: 'Tonificar',
  fuerza: 'Fuerza',
  resistencia: 'Resistencia',
};

export const ARTICULACION_NAME: Record<Articulacion, string> = {
  rodilla: 'Rodilla',
  hombro: 'Hombro',
  espalda_baja: 'Espalda baja',
  muneca: 'Muñeca',
  codo: 'Codo',
};
