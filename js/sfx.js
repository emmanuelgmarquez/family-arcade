// Tiny synthesized UI sounds (no audio files, works offline).
import { prefs } from './util.js';

let ctx = null;
let enabled = prefs.get('sound', true);

function audio() {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}

function tone(freq, { at = 0, dur = 0.08, type = 'square', vol = 0.05, slide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  get enabled() { return enabled; },
  setEnabled(v) { enabled = !!v; prefs.set('sound', enabled); if (enabled) this.select(); },
  move() { tone(880, { dur: 0.04, vol: 0.025, type: 'triangle' }); },
  select() { tone(660, { dur: 0.06 }); tone(990, { at: 0.06, dur: 0.09 }); },
  back() { tone(520, { dur: 0.06, type: 'triangle' }); tone(390, { at: 0.05, dur: 0.08, type: 'triangle' }); },
  open() { tone(440, { dur: 0.07, type: 'triangle', slide: 220 }); },
  launch() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.12, vol: 0.045 }));
  },
  success() { [784, 988, 1318].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.14, vol: 0.04, type: 'triangle' })); },
  error() { tone(220, { dur: 0.18, type: 'sawtooth', vol: 0.03, slide: -80 }); },
  /** Must be called from a user gesture once so iOS allows sound. */
  unlock() { audio(); }
};
