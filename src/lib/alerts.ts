// Sonido y vibración para avisar el fin de los descansos.

let ctx: AudioContext | null = null;

/** Debe llamarse desde un toque del usuario (iOS no permite audio sin interacción). */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    if (ctx?.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, start: number, dur: number, gain = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Pitido corto para la cuenta 3-2-1. */
export function tick() {
  tone(660, 0, 0.12, 0.15);
}

/** Fin del descanso: tres tonos ascendentes y vibración. */
export function restFinished() {
  tone(660, 0, 0.18);
  tone(880, 0.22, 0.18);
  tone(1175, 0.44, 0.35);
  navigator.vibrate?.([300, 120, 300]);
}

/** Fin del entrenamiento. */
export function workoutFinished() {
  tone(880, 0, 0.2);
  tone(1175, 0.2, 0.2);
  tone(1568, 0.4, 0.5);
  navigator.vibrate?.([200, 100, 200, 100, 400]);
}
