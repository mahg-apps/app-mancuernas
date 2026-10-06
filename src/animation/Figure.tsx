import { memo, useMemo } from 'react';
import type { Exercise } from '../types';
import { activationAt, compileAnimation, poseAt } from './interpolate';
import { buildScene, makeCamera, sceneBounds, solveSkeleton, type Drawable } from './rig';
import { useAnimationClock } from './useAnimationClock';

interface Props {
  exercise: Exercise;
  playing?: boolean;
  speed?: number;
  /** Fase fija (0–1) para miniaturas estáticas. Ignora `playing`. */
  staticPhase?: number;
  highlight?: boolean;
  className?: string;
  title?: string;
}

const SAMPLES = 24;

function DrawableEl({ d }: { d: Drawable }) {
  if (d.kind === 'circle') {
    return <circle cx={d.c[0]} cy={d.c[1]} r={d.r} fill={d.fill} opacity={d.opacity} />;
  }
  if (d.kind === 'line') {
    return (
      <line
        x1={d.a[0]}
        y1={d.a[1]}
        x2={d.b[0]}
        y2={d.b[1]}
        stroke={d.fill}
        strokeWidth={d.w}
        strokeLinecap="round"
        opacity={d.opacity}
      />
    );
  }
  return (
    <polygon
      points={d.pts.map((p) => p.join(',')).join(' ')}
      fill={d.fill}
      stroke={d.fill}
      strokeWidth={d.w}
      strokeLinejoin="round"
      opacity={d.opacity}
    />
  );
}

/** Personaje animado que ejecuta un ejercicio a partir de sus keyframes. */
function FigureInner({ exercise, playing = true, speed = 1, staticPhase, highlight = true, className, title }: Props) {
  const anim = exercise.animacion;
  const compiled = useMemo(() => compileAnimation(anim), [anim]);
  const camera = useMemo(
    () => makeCamera(exercise.vista, anim.camara ?? (exercise.vista === 'lateral' ? 14 : 0)),
    [exercise.vista, anim.camara],
  );

  // Encuadre estable: se calcula sobre toda la repetición.
  const box = useMemo(() => {
    const lists: Drawable[][] = [];
    for (let i = 0; i < SAMPLES; i++) {
      lists.push(buildScene(solveSkeleton(poseAt(compiled, i / SAMPLES)), anim, camera, null));
    }
    const b = sceneBounds(lists);
    const pad = 14;
    // Proporción mínima para que no quede demasiado alargado.
    const w = Math.max(b.w + pad * 2, (b.h + pad * 2) * 0.75);
    const h = Math.max(b.h + pad * 2, w * 0.75);
    const cx = b.x + b.w / 2;
    return { x: cx - w / 2, y: b.y + b.h + pad - h, w, h };
  }, [compiled, anim, camera]);

  const isStatic = staticPhase !== undefined;
  const livePhase = useAnimationClock(anim.duracionMs, !isStatic && playing, speed);
  const phase = isStatic ? staticPhase : livePhase;

  const pose = poseAt(compiled, phase);
  const scene = buildScene(
    solveSkeleton(pose),
    anim,
    camera,
    highlight
      ? {
          principales: exercise.musculosPrincipales,
          secundarios: exercise.musculosSecundarios,
          intensidad: activationAt(compiled, phase),
        }
      : null,
  );

  const floorY = 0;
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className={className}
      role="img"
      aria-label={title ?? `Animación: ${exercise.nombre}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="floor-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7a3d" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ff7a3d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={box.x + box.w / 2} cy={floorY + 2} rx={box.w * 0.42} ry={7} fill="url(#floor-glow)" />
      <line x1={box.x} y1={floorY + 1} x2={box.x + box.w} y2={floorY + 1} stroke="#2b3546" strokeWidth={1.5} />
      {scene.map((d, i) => (
        <DrawableEl key={i} d={d} />
      ))}
    </svg>
  );
}

export const Figure = memo(FigureInner);
