// One small function per sound. Each builds a short throwaway node graph on
// the shared sfx bus and self-cleans on `ended` — no pooling, no buffers
// beyond the engine's shared noise loop. Every function no-ops until the
// engine is unlocked. Dark-atmospheric palette: filtered noise, low
// triangles/saws, no bare square-wave beeps.
import { audio } from './AudioEngine';

type Ctx = { ctx: AudioContext; out: GainNode; t: number };

function sfxCtx(): Ctx | null {
  const ctx = audio.ctx;
  const out = audio.sfxBus;
  if (!ctx || !out) return null;
  return { ctx, out, t: ctx.currentTime };
}

// Same-sound rate limit: multishot volleys and interpolated HP drops would
// otherwise machine-gun identical one-shots within a frame or two.
const lastPlay = new Map<string, number>();
function throttle(id: string, gapMs: number): boolean {
  const now = performance.now();
  if (now - (lastPlay.get(id) ?? -1e9) < gapMs) return true;
  lastPlay.set(id, now);
  return false;
}

function jitter(v: number, pct: number): number {
  return v * (1 + (Math.random() * 2 - 1) * pct);
}

/** Envelope → sfx bus. attack/hold/release in seconds. */
function env(c: Ctx, peak: number, attack: number, hold: number, release: number, dest: AudioNode = c.out): GainNode {
  const g = c.ctx.createGain();
  g.gain.setValueAtTime(0.0001, c.t);
  g.gain.linearRampToValueAtTime(peak, c.t + attack);
  g.gain.setValueAtTime(peak, c.t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, c.t + attack + hold + release);
  g.connect(dest);
  return g;
}

function osc(c: Ctx, type: OscillatorType, f0: number, f1: number, dur: number, dest: AudioNode, detuneCents = 0): void {
  const o = c.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(1, f0), c.t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), c.t + dur);
  o.detune.value = detuneCents;
  o.connect(dest);
  o.start(c.t);
  o.stop(c.t + dur + 0.05);
  o.onended = () => o.disconnect();
}

function noise(c: Ctx, dur: number, dest: AudioNode, playbackRate = 1): void {
  const buf = audio.noiseBuffer();
  if (!buf) return;
  const src = c.ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.playbackRate.value = playbackRate;
  src.connect(dest);
  src.start(c.t, Math.random() * 1.5);
  src.stop(c.t + dur + 0.05);
  src.onended = () => src.disconnect();
}

function bandpass(c: Ctx, f0: number, f1: number, dur: number, dest: AudioNode, q = 1): BiquadFilterNode {
  const f = c.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(Math.max(10, f0), c.t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), c.t + dur);
  f.Q.value = q;
  f.connect(dest);
  return f;
}

function lowpass(c: Ctx, f0: number, f1: number, dur: number, dest: AudioNode, q = 0.8): BiquadFilterNode {
  const f = c.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(Math.max(10, f0), c.t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), c.t + dur);
  f.Q.value = q;
  f.connect(dest);
  return f;
}

// ── UI ──────────────────────────────────────────────────────────────────────

/** Delegated-click classifier. Pure so it's testable without a DOM. */
export function uiSoundForClasses(className: string): 'tab' | 'click' | null {
  const classes = className.split(/\s+/);
  if (classes.includes('bm-nav-tab')) return 'tab';
  if (classes.includes('px-btn') || classes.includes('bm-acct-item')) return 'click';
  return null;
}

/** Short muted low-mid thump — a latch falling, not a beep. */
export function playUiClick(): void {
  const c = sfxCtx();
  if (!c || throttle('uiClick', 40)) return;
  osc(c, 'triangle', jitter(190, 0.06), 120, 0.09, lowpass(c, 900, 300, 0.09, env(c, 0.5, 0.002, 0, 0.09)));
  noise(c, 0.03, bandpass(c, 800, 800, 0.03, env(c, 0.12, 0.001, 0, 0.03), 2));
}

/** Softer click for nav-tab switches. */
export function playUiTab(): void {
  const c = sfxCtx();
  if (!c || throttle('uiTab', 60)) return;
  osc(c, 'triangle', jitter(150, 0.05), 100, 0.07, lowpass(c, 700, 250, 0.07, env(c, 0.32, 0.002, 0, 0.07)));
}

/** Flat double-knock: action rejected (can't afford, invalid). */
export function playDenied(): void {
  const c = sfxCtx();
  if (!c || throttle('denied', 150)) return;
  osc(c, 'triangle', 110, 100, 0.06, lowpass(c, 500, 300, 0.06, env(c, 0.5, 0.002, 0, 0.06)));
  const c2 = { ...c, t: c.t + 0.09 };
  osc(c2, 'triangle', 95, 85, 0.07, lowpass(c2, 450, 250, 0.07, env(c2, 0.5, 0.002, 0, 0.07)));
}
