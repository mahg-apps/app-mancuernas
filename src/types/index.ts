// Modelo de datos compartido por toda la app.
// Diseñado para crecer en las etapas 2–4 sin romper lo existente.

export type MuscleId =
  | 'pecho'
  | 'hombro_anterior'
  | 'hombro_lateral'
  | 'hombro_posterior'
  | 'biceps'
  | 'triceps'
  | 'antebrazos'
  | 'abdomen'
  | 'oblicuos'
  | 'espalda_alta'
  | 'dorsales'
  | 'espalda_baja'
  | 'gluteos'
  | 'cuadriceps'
  | 'isquiotibiales'
  | 'pantorrillas';

export type Zona = 'pecho' | 'hombros' | 'brazos' | 'core' | 'espalda' | 'piernas' | 'gluteos';
export type Nivel = 'principiante' | 'intermedio' | 'avanzado';
export type Objetivo = 'tonificar' | 'fuerza' | 'resistencia';
export type TipoEjercicio = 'fuerza' | 'calentamiento' | 'estiramiento';
export type Articulacion = 'rodilla' | 'hombro' | 'espalda_baja' | 'muneca' | 'codo';
export type Equipo = 'mancuernas' | 'banco' | 'piso';
export type Vista = 'frontal' | 'lateral';

// ---------- Animación ----------

/** Brazo: [flexión hombro, abducción hombro, rotación externa hombro, flexión codo, pronación, flexión muñeca?] en grados. */
export type ArmAngles = [number, number, number, number, number, number?];
/** Pierna: [flexión cadera, abducción cadera, flexión rodilla, flexión plantar tobillo] en grados. */
export type LegAngles = [number, number, number, number];
/** [pitch (inclinación adelante), roll (lateral), yaw (giro)] en grados. */
export type Tri = [number, number, number];

/** Pose resuelta: todos los ángulos articulares del personaje. */
export interface Pose {
  cuerpo: Tri; // orientación global de la pelvis
  torso: Tri; // [flexión, inclinación lateral, rotación] respecto a la pelvis
  cabeza: number; // flexión del cuello
  /** Elevación de los hombros (encogimientos), en unidades de escena. */
  hombrosY: number;
  brazoD: ArmAngles;
  brazoI: ArmAngles;
  piernaD: LegAngles;
  piernaI: LegAngles;
}

/** Pose parcial para escribir keyframes compactos. `brazos`/`piernas` aplican a ambos lados. */
export interface PoseInput {
  cuerpo?: Tri;
  torso?: Tri;
  cabeza?: number;
  hombrosY?: number;
  brazos?: ArmAngles;
  brazoD?: ArmAngles;
  brazoI?: ArmAngles;
  piernas?: LegAngles;
  piernaD?: LegAngles;
  piernaI?: LegAngles;
}

export type Ease = 'linear' | 'inOut' | 'in' | 'out';

export interface Keyframe {
  /** Momento dentro de una repetición, de 0 a 1. */
  t: number;
  pose: PoseInput;
  /** Curva usada para llegar a este keyframe desde el anterior. */
  ease?: Ease;
}

/** Elementos de escena (banco, etc.) en coordenadas del mundo. */
export interface Prop {
  tipo: 'banco';
  /** Centro lateral (X, + = lado izquierdo del personaje). */
  x: number;
  /** Extensión adelante/atrás [desde, hasta] (Z). */
  z: [number, number];
  /** Altura de la superficie. */
  alto: number;
  ancho?: number;
}

export interface ExerciseAnimation {
  /** Duración de una repetición a velocidad 1×. */
  duracionMs: number;
  /** Qué parte del cuerpo se apoya: define cómo se coloca la figura en la escena. */
  apoyo: 'pies' | 'gluteos' | 'espalda' | 'hombros';
  /** Qué manos sostienen mancuerna. `central`: una mancuerna con ambas manos; `ninguno`: sin peso. */
  agarre: 'ambas' | 'derecha' | 'izquierda' | 'central' | 'ninguno';
  /** Pie que queda fijo (en vez de los dos) y altura de su superficie (p. ej. un banco). */
  ancla?: 'derecho' | 'izquierdo';
  anclaAlto?: number;
  /** Resalta solo los músculos de un lado (estiramientos y ejercicios a una pierna). */
  resaltarLado?: 'derecha' | 'izquierda';
  /** Giro extra de cámara en grados para dar profundidad. */
  camara?: number;
  props?: Prop[];
  /** Pose base; los keyframes la sobrescriben. */
  base?: PoseInput;
  keyframes: Keyframe[];
  /** Curva de activación del músculo principal: pares [t, intensidad 0–1]. */
  activacion: [number, number][];
}

// ---------- Ejercicios ----------

export interface Exercise {
  id: string;
  nombre: string;
  zona: Zona;
  musculosPrincipales: MuscleId[];
  musculosSecundarios: MuscleId[];
  nivel: Nivel;
  tipo: TipoEjercicio;
  equipo: Equipo[];
  /** true si se trabaja un lado a la vez (las reps o el tiempo son por lado). */
  unilateral?: boolean;
  /** Calentamiento y estiramientos: duración en segundos (por lado si es unilateral). */
  duracionSeg?: number;
  pasos: string[];
  errores: string[];
  respiracion: string;
  /** Articulaciones que carga (para advertencias por limitaciones, etapa 2). */
  articulaciones: Articulacion[];
  /** Ids de ejercicios que pueden sustituirlo (etapa 2). */
  sustitutos: string[];
  /** Peso de referencia por mancuerna en kg: [principiante, intermedio, avanzado]. */
  cargaKg: [number, number, number];
  vista: Vista;
  animacion: ExerciseAnimation;
}

// ---------- Perfil ----------

export type Unidad = 'kg' | 'lb';

export type Mancuernas =
  | { tipo: 'fijas'; pesos: number[] }
  | { tipo: 'ajustables'; min: number; max: number; incremento: number };

export interface Descanso {
  /** Segundos entre series. */
  series: number;
  /** Segundos entre ejercicios. */
  ejercicios: number;
}

export interface Profile {
  unidad: Unidad;
  /** Pesos expresados en la unidad elegida. */
  mancuernas: Mancuernas;
  objetivo: Objetivo;
  nivel: Nivel;
  limitaciones: Articulacion[];
  /** Qué hacer con los ejercicios que cargan una zona limitada. */
  modoLimitaciones: 'advertir' | 'ocultar';
  /** Incluir por defecto calentamiento y estiramientos en las rutinas. */
  calentamiento: boolean;
  estiramientos: boolean;
  descansos: Record<Objetivo, Descanso>;
  creado: number;
  actualizado: number;
}

// ---------- Rutinas y sesiones (base para etapas siguientes) ----------

export interface RoutineItem {
  exerciseId: string;
  /** Si se omiten, se usan las recomendadas según el objetivo. */
  series?: number;
  reps?: string;
}

export interface Routine {
  id: string;
  nombre: string;
  predefinida: boolean;
  items: RoutineItem[];
  /** Si se omiten, se usa lo que diga el perfil. */
  calentamiento?: boolean;
  estiramientos?: boolean;
  creado: number;
  actualizado: number;
}

export interface SetLog {
  exerciseId: string;
  serie: number;
  reps: number;
  peso: number;
  /** Etapa 4: esfuerzo percibido. */
  esfuerzo?: 'facil' | 'bien' | 'dificil';
  ts: number;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  nombre: string;
  inicio: number;
  fin?: number;
  sets: SetLog[];
}
