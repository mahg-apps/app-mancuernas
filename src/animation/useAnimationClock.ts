import { useEffect, useRef, useState } from 'react';

/**
 * Reloj de animación con requestAnimationFrame.
 * Devuelve la fase (0–1) de la repetición actual; respeta pausa y velocidad.
 */
export function useAnimationClock(durationMs: number, playing: boolean, speed: number): number {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current !== null) {
        const dt = now - last.current;
        phaseRef.current = (phaseRef.current + (dt * speed) / durationMs) % 1;
        setPhase(phaseRef.current);
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, speed, durationMs]);

  return phase;
}

/** true si el usuario pidió reducir el movimiento en su sistema. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
