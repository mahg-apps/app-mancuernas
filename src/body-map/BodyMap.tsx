import { MUSCLE_NAME } from '../data/muscles';
import type { MuscleId } from '../types';
import { BACK, FRONT, type Shape } from './paths';

export type BodySide = 'frontal' | 'posterior';

interface Props {
  side: BodySide;
  selected?: MuscleId | null;
  /** Para el mapa de un ejercicio: músculos principales (intenso) y secundarios (suave). */
  principales?: MuscleId[];
  secundarios?: MuscleId[];
  /** Músculos que tienen ejercicios (se ven un poco más claros). */
  available?: Set<MuscleId>;
  onSelect?: (m: MuscleId) => void;
  className?: string;
}

const C = {
  neutral: '#1b2230',
  muscle: '#28324a',
  available: '#33405c',
  selected: '#ff7a3d',
  primary: '#ff7a3d',
  secondary: '#a8573a',
  edge: '#0d1117',
};

export function BodyMap({ side, selected, principales, secundarios, available, onSelect, className }: Props) {
  const shapes = side === 'frontal' ? FRONT : BACK;
  const interactive = !!onSelect;

  const fillFor = (s: Shape) => {
    if (!s.m) return C.neutral;
    if (selected === s.m) return C.selected;
    if (principales?.includes(s.m)) return C.primary;
    if (secundarios?.includes(s.m)) return C.secondary;
    if (available?.has(s.m)) return C.available;
    return C.muscle;
  };

  const render = (s: Shape, i: number, mirrored: boolean) => {
    const fill = fillFor(s);
    const common = {
      d: s.d,
      fill,
      stroke: C.edge,
      strokeWidth: 1.6,
      strokeLinejoin: 'round' as const,
    };
    if (!s.m || !interactive) return <path key={`${i}-${mirrored}`} {...common} />;
    const m = s.m;
    return (
      <path
        key={`${i}-${mirrored}`}
        {...common}
        role="button"
        tabIndex={mirrored ? -1 : 0}
        aria-label={MUSCLE_NAME[m]}
        aria-pressed={selected === m}
        className="cursor-pointer outline-none transition-[fill] duration-150 hover:brightness-125 focus-visible:brightness-150"
        onClick={() => onSelect?.(m)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(m);
          }
        }}
      >
        <title>{MUSCLE_NAME[m]}</title>
      </path>
    );
  };

  return (
    <svg
      viewBox="20 6 160 410"
      className={className}
      role="group"
      aria-label={side === 'frontal' ? 'Vista frontal del cuerpo' : 'Vista posterior del cuerpo'}
    >
      <g>{shapes.map((s, i) => render(s, i, false))}</g>
      <g transform="translate(200,0) scale(-1,1)">
        {shapes.filter((s) => !s.center).map((s, i) => render(s, i, true))}
      </g>
    </svg>
  );
}
