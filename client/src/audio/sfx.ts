// One small function per sound. Each builds a short throwaway node graph on
// the shared sfx bus and self-cleans on `ended` — no pooling, no buffers
// beyond the engine's shared noise loop. Every function no-ops until the
// engine is unlocked. Dark-atmospheric palette: filtered noise, low
// triangles/saws, no bare square-wave beeps.
import { audio } from './AudioEngine';
import type { SpellId } from '@arena/shared';

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

// ── Spells ──────────────────────────────────────────────────────────────────

/** Per-spell cast character. Fire spells lean whoosh+thump; ranger spells
 * lean snap+release; utility leans shimmer. */
const CAST_PARAMS: Record<number, { f0: number; f1: number; dur: number; noiseAmt: number }> = {
  1: { f0: 300, f1: 90, dur: 0.22, noiseAmt: 0.5 },   // fireball
  2: { f0: 200, f1: 70, dur: 0.3, noiseAmt: 0.7 },    // fire wall
  3: { f0: 140, f1: 45, dur: 0.5, noiseAmt: 0.6 },    // meteor
  4: { f0: 500, f1: 1400, dur: 0.18, noiseAmt: 0.15 }, // teleport (rise)
  5: { f0: 420, f1: 160, dur: 0.12, noiseAmt: 0.4 },  // power shot
  6: { f0: 380, f1: 140, dur: 0.14, noiseAmt: 0.5 },  // multishot
  7: { f0: 240, f1: 80, dur: 0.35, noiseAmt: 0.6 },   // rain of arrows
  8: { f0: 600, f1: 1100, dur: 0.14, noiseAmt: 0.2 }, // evade (rise)
};

export function playCast(spell: SpellId): void {
  const c = sfxCtx();
  if (!c || throttle(`cast${spell}`, 120)) return;
  const p = CAST_PARAMS[spell] ?? CAST_PARAMS[1];
  osc(c, 'triangle', jitter(p.f0, 0.05), p.f1, p.dur, lowpass(c, 1200, 300, p.dur, env(c, 0.45, 0.005, 0, p.dur)));
  noise(c, p.dur, bandpass(c, p.f0 * 3, p.f1 * 3, p.dur, env(c, p.noiseAmt * 0.5, 0.01, 0, p.dur), 1.2));
}

/** Projectile leaves the caster: short airy sweep. */
export function playFireballWhoosh(): void {
  const c = sfxCtx();
  if (!c || throttle('fbWhoosh', 90)) return;
  noise(c, 0.25, bandpass(c, jitter(600, 0.1), 220, 0.25, env(c, 0.35, 0.02, 0, 0.23), 1));
}

export function playFireballExplode(): void {
  const c = sfxCtx();
  if (!c || throttle('fbBoom', 90)) return;
  noise(c, 0.35, lowpass(c, 2200, 160, 0.35, env(c, 0.7, 0.004, 0, 0.35)));
  osc(c, 'sine', jitter(110, 0.08), 40, 0.3, env(c, 0.6, 0.004, 0, 0.3));
}

/** Thin snap for arrow spawn (throttled hard — multishot fires volleys). */
export function playArrowSpawn(): void {
  const c = sfxCtx();
  if (!c || throttle('arrow', 70)) return;
  noise(c, 0.09, bandpass(c, jitter(1900, 0.12), 700, 0.09, env(c, 0.28, 0.002, 0, 0.09), 1.6));
}

/** Long descending sweep while the meteor falls (~0.8s). */
export function playMeteorFall(): void {
  const c = sfxCtx();
  if (!c || throttle('meteorFall', 200)) return;
  noise(c, 0.85, bandpass(c, 1400, 130, 0.85, env(c, 0.4, 0.15, 0.3, 0.4), 0.8));
  osc(c, 'sawtooth', 220, 50, 0.85, lowpass(c, 700, 150, 0.85, env(c, 0.18, 0.15, 0.3, 0.4)));
}

export function playMeteorImpact(): void {
  const c = sfxCtx();
  if (!c || throttle('meteorHit', 150)) return;
  osc(c, 'sine', 90, 28, 0.7, env(c, 0.9, 0.004, 0.05, 0.65));
  noise(c, 0.6, lowpass(c, 1600, 90, 0.6, env(c, 0.65, 0.005, 0, 0.6)));
}

/** Volley launch: a cluster of thin whooshes. */
export function playRainVolley(): void {
  const c = sfxCtx();
  if (!c || throttle('rainVolley', 200)) return;
  for (let i = 0; i < 4; i++) {
    const ci = { ...c, t: c.t + i * jitter(0.05, 0.5) };
    noise(ci, 0.12, bandpass(ci, jitter(1700, 0.15), 600, 0.12, env(ci, 0.16, 0.003, 0, 0.12), 1.6));
  }
}

/** Scattered thud cluster where the arrows land. */
export function playRainImpact(): void {
  const c = sfxCtx();
  if (!c || throttle('rainHit', 200)) return;
  for (let i = 0; i < 5; i++) {
    const ci = { ...c, t: c.t + i * jitter(0.04, 0.6) };
    osc(ci, 'triangle', jitter(150, 0.2), 70, 0.08, lowpass(ci, 600, 250, 0.08, env(ci, 0.3, 0.003, 0, 0.08)));
  }
}

/** Detuned sines sweeping up — a shimmer, gone in a blink. */
export function playTeleport(): void {
  const c = sfxCtx();
  if (!c || throttle('teleport', 100)) return;
  const g = env(c, 0.3, 0.01, 0, 0.25);
  osc(c, 'sine', 500, 1600, 0.22, g, -12);
  osc(c, 'sine', 505, 1620, 0.22, g, 12);
  noise(c, 0.15, bandpass(c, 2500, 4000, 0.15, env(c, 0.1, 0.01, 0, 0.14), 2));
}

// ── Looping spell zones (fire walls, craters) ───────────────────────────────
// Keyed by server entity id; a hot variant of the torch-crackle generator.
const spellLoops = new Map<string, { gain: GainNode; stop: () => void }>();

export function startFireWallLoop(id: string): void {
  const c = sfxCtx();
  if (!c || spellLoops.has(id)) return;
  const gain = c.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, c.t);
  gain.gain.linearRampToValueAtTime(0.25, c.t + 0.3);
  gain.connect(c.out);
  let alive = true;
  let timer = 0;
  const burst = () => {
    if (!alive) return;
    const cc = sfxCtx();
    if (cc) {
      const dur = 0.03 + Math.random() * 0.07;
      noise(cc, dur, bandpass(cc, 900 + Math.random() * 1600, 700, dur,
        env(cc, 0.4 + Math.random() * 0.4, 0.004, 0, dur, gain), 3));
    }
    timer = window.setTimeout(burst, 40 + Math.random() * 120);
  };
  burst();
  spellLoops.set(id, {
    gain,
    stop: () => {
      alive = false;
      clearTimeout(timer);
      const ctx = audio.ctx;
      if (ctx) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        window.setTimeout(() => gain.disconnect(), 350);
      } else {
        gain.disconnect();
      }
    },
  });
}

export function stopFireWallLoop(id: string): void {
  spellLoops.get(id)?.stop();
  spellLoops.delete(id);
}

export function stopAllSpellLoops(): void {
  for (const [id] of spellLoops) stopFireWallLoop(id);
}

// ── Combat feedback ─────────────────────────────────────────────────────────

/** Dull mid thump, darker than the enemy-hit crack: you got hurt. */
export function playHitTaken(): void {
  const c = sfxCtx();
  if (!c || throttle('hitTaken', 150)) return;
  osc(c, 'triangle', jitter(120, 0.1), 55, 0.14, lowpass(c, 500, 200, 0.14, env(c, 0.6, 0.003, 0, 0.14)));
  noise(c, 0.08, lowpass(c, 900, 300, 0.08, env(c, 0.25, 0.002, 0, 0.08)));
}

/** Sharper, lighter crack: your damage landed. */
export function playHitDealt(): void {
  const c = sfxCtx();
  if (!c || throttle('hitDealt', 150)) return;
  osc(c, 'triangle', jitter(260, 0.1), 110, 0.08, lowpass(c, 1400, 500, 0.08, env(c, 0.4, 0.002, 0, 0.08)));
  noise(c, 0.05, bandpass(c, 1600, 900, 0.05, env(c, 0.2, 0.002, 0, 0.05), 1.5));
}

/** Low boom + falling-pitch groan. */
export function playDeath(): void {
  const c = sfxCtx();
  if (!c || throttle('death', 300)) return;
  osc(c, 'sine', 90, 30, 0.8, env(c, 0.7, 0.005, 0.1, 0.7));
  const groan = env(c, 0.3, 0.02, 0.1, 0.7);
  osc(c, 'sawtooth', 140, 60, 0.8, lowpass(c, 400, 120, 0.8, groan), -10);
  osc(c, 'sawtooth', 143, 62, 0.8, lowpass(c, 400, 120, 0.8, groan), 10);
}

/** Barely-there tick when a cooldown finishes. */
export function playCooldownReady(): void {
  const c = sfxCtx();
  if (!c || throttle('cdReady', 120)) return;
  osc(c, 'triangle', 480, 380, 0.05, lowpass(c, 1200, 800, 0.05, env(c, 0.12, 0.002, 0, 0.05)));
}

/** Dead thud: cast attempted without the mana for it. */
export function playNoMana(): void {
  const c = sfxCtx();
  if (!c || throttle('noMana', 400)) return;
  osc(c, 'triangle', 90, 80, 0.07, lowpass(c, 350, 250, 0.07, env(c, 0.4, 0.002, 0, 0.07)));
}
