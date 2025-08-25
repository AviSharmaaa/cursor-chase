// --- Web Audio: tiny synth "ding" ---
let audioCtx: AudioContext | null = null;

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AC();
  }
}

export function resumeAudio() {
  ensureAudio();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

/** Pleasant short chime; call on orb collection. */
export function playDing(pitch = 880) {
  if (!audioCtx) return;
  const ctx = audioCtx;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Slight "ping" character: tiny upward glide then fade
  osc.type = "sine";
  const t0 = ctx.currentTime;
  osc.frequency.setValueAtTime(pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(pitch * 1.2, t0 + 0.02);

  // ADSR (very fast attack, short decay)
  const g = gain.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(0.2, t0 + 0.01);
  g.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.22);
}
