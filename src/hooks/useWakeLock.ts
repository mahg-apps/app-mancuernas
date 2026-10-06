import { useEffect } from 'react';

/** Mantiene la pantalla encendida mientras `active` sea true (Wake Lock API). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // El sistema puede negarlo (batería baja, pestaña oculta); se reintenta al volver.
      }
      if (cancelled) lock?.release().catch(() => {});
    };
    // El bloqueo se pierde al cambiar de app; se vuelve a pedir al regresar.
    const onVisible = () => document.visibilityState === 'visible' && request();

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
