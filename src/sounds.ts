/**
 * Spoonie sound effects using the Web Audio API.
 * No audio files required – all sounds are synthesized in the browser.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

// Unlock AudioContext on first user gesture (browser autoplay policy)
function unlockAudio() {
  getCtx();
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('keydown', unlockAudio);
}
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);
document.addEventListener('keydown', unlockAudio);

type WaveType = OscillatorType;

function tone(
  freq: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  wave: WaveType = 'sine',
  ac: AudioContext
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = wave;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Soft two-note chime – activity completed ✓ */
export function playActivityComplete(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(523, t, 0.25, 0.18, 'sine', ac);       // C5
  tone(784, t + 0.12, 0.35, 0.14, 'sine', ac); // G5
}

/** Slow gentle descend + soft bowl tone – recovery activity completed 🌿 */
export function playRecoveryComplete(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Soft descending tones like a singing bowl settling
  tone(528, t, 0.6, 0.10, 'sine', ac);          // 528 Hz "healing" freq
  tone(396, t + 0.25, 0.7, 0.08, 'sine', ac);   // soft fall
  tone(264, t + 0.55, 0.9, 0.06, 'sine', ac);   // deep warm fade
}

/** Quick bright pop – recovery activity added 🌿 */
export function playRecoveryAdd(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(440, t, 0.12, 0.12, 'sine', ac);        // A4
  tone(659, t + 0.08, 0.20, 0.10, 'sine', ac); // E5
}

/** Ascending triple chime – XP gained ⭐ */
export function playXpGain(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(659, t, 0.18, 0.12, 'triangle', ac);        // E5
  tone(784, t + 0.10, 0.18, 0.12, 'triangle', ac); // G5
  tone(1047, t + 0.20, 0.30, 0.10, 'triangle', ac); // C6
}

/** Short triumphant fanfare – level up 🚀 */
export function playLevelUp(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    tone(freq, t + i * 0.13, 0.30, 0.15, 'triangle', ac);
  });
  // Final chord shimmer
  tone(1319, t + 0.55, 0.5, 0.08, 'sine', ac); // E6
}

/** Warm celebration chord – day completed 🎉 */
export function playDayComplete(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Major chord C-E-G then rise to C6
  tone(523, t, 0.5, 0.13, 'sine', ac);
  tone(659, t + 0.05, 0.5, 0.11, 'sine', ac);
  tone(784, t + 0.10, 0.5, 0.10, 'sine', ac);
  tone(1047, t + 0.30, 0.8, 0.12, 'sine', ac);
}

/** Gentle descending tone – spoons borrowed ⚠️ */
export function playBorrowWarning(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(440, t, 0.20, 0.10, 'sine', ac);         // A4
  tone(349, t + 0.18, 0.30, 0.08, 'sine', ac);  // F4
}
