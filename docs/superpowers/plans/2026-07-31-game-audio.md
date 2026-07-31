# Game Audio (Procedural SFX + Ambience) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add procedurally-synthesized sound effects and generative ambient music throughout BloodMoor via the Web Audio API — no audio asset files.

**Architecture:** A new `client/src/audio/` module: `AudioEngine.ts` (lazy AudioContext, master→music/sfx gain buses, localStorage settings), `sfx.ts` (one throwaway node-graph builder per sound), `ambience.ts` (crossfading generative layers keyed by scene), `settingsPopover.ts` (volume UI). Hooks piggyback on existing snapshot-diff sites in `SpellRenderer.ts` / `HUD.ts` / `main.ts`, one delegated click listener covers all UI buttons, and a Settings entry joins the shared nav bar's account menu.

**Tech Stack:** TypeScript (strict, ES2022), Vite 6, Web Audio API, Vitest (node environment — no jsdom).

**Spec:** `docs/superpowers/specs/2026-07-31-game-audio-design.md`

## Global Constraints

- **No new dependencies.** Web Audio API only. No audio asset files.
- **Audio never throws into game code**: every public audio function no-ops when the engine isn't ready; `AudioContext` construction failure → permanent no-ops + one `console.warn`.
- localStorage key: `bloodmoor.audio.v1`. Defaults: `{ musicVol: 60, sfxVol: 80, muted: false }`, volumes clamped 0–100.
- Client tests run in **node environment** (no DOM, no Web Audio): test only pure exported functions, following the existing `client/tests/LobbyUI.test.ts` style. Module top-levels in `client/src/audio/` must therefore never touch `window`/`document`/`AudioContext` at import time (guard `localStorage` with try/catch).
- Commands (run from the worktree root `/Users/danielgalvez/coding/bloodmoor/.claude/worktrees/game-audio`): client tests `cd client && npx vitest run`, client typecheck `cd client && npx tsc --noEmit`, dev servers `cd server && npm run dev` + `cd client && npm run dev`.
- **Never stage `client/dist/`** (a `vite build` dirties it — restore, don't commit).
- Match surrounding code style: hand-rolled DOM + innerHTML, `px-` / `bm-` CSS prefixes, comments only for non-obvious constraints.
- The rebased base is `menu-moor` tip `ad23cc3`. Do not merge/rebase further during implementation.
- Spec divergence already agreed: there is no in-match 3-2-1 countdown in the code (`GameState.phase` `'countdown'` is unused), so countdown ticks attach to the **rematch countdown** and a single "duel begins" hit plays at match start.

---

### Task 1: AudioEngine — buses, unlock, settings

**Files:**
- Create: `client/src/audio/AudioEngine.ts`
- Test: `client/tests/audioSettings.test.ts`

**Interfaces:**
- Consumes: nothing (foundation).
- Produces (used by every later task):
  - `type AudioSettings = { musicVol: number; sfxVol: number; muted: boolean }`
  - `const AUDIO_SETTINGS_KEY = 'bloodmoor.audio.v1'`
  - `const DEFAULT_AUDIO_SETTINGS: AudioSettings`
  - `function clampVol(v: unknown, fallback: number): number`
  - `function parseAudioSettings(raw: string | null): AudioSettings`
  - `const audio: AudioEngine` singleton with: `get ctx(): AudioContext | null`, `get sfxBus(): GainNode | null`, `get musicBus(): GainNode | null`, `get ready(): boolean`, `readonly settings: AudioSettings`, `installUnlockListener(): void`, `onUnlock(cb: () => void): void`, `setMusicVol(v: number): void`, `setSfxVol(v: number): void`, `setMuted(m: boolean): void`, `noiseBuffer(): AudioBuffer | null`

- [ ] **Step 1: Write the failing test**

Create `client/tests/audioSettings.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseAudioSettings, clampVol, DEFAULT_AUDIO_SETTINGS } from '../src/audio/AudioEngine';

describe('clampVol', () => {
  it('clamps to 0-100 and floors to integers', () => {
    expect(clampVol(150, 60)).toBe(100);
    expect(clampVol(-5, 60)).toBe(0);
    expect(clampVol(42.7, 60)).toBe(42);
  });

  it('falls back on non-numeric input', () => {
    expect(clampVol('loud', 60)).toBe(60);
    expect(clampVol(NaN, 80)).toBe(80);
    expect(clampVol(undefined, 80)).toBe(80);
  });
});

describe('parseAudioSettings', () => {
  it('returns defaults for null (first run)', () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('returns defaults for corrupt JSON', () => {
    expect(parseAudioSettings('{oops')).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('round-trips a valid payload', () => {
    const raw = JSON.stringify({ musicVol: 10, sfxVol: 90, muted: true });
    expect(parseAudioSettings(raw)).toEqual({ musicVol: 10, sfxVol: 90, muted: true });
  });

  it('clamps out-of-range fields and coerces muted to boolean', () => {
    const raw = JSON.stringify({ musicVol: 400, sfxVol: -1, muted: 'yes' });
    expect(parseAudioSettings(raw)).toEqual({ musicVol: 100, sfxVol: 0, muted: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run tests/audioSettings.test.ts`
Expected: FAIL — cannot resolve `../src/audio/AudioEngine`.

- [ ] **Step 3: Write the implementation**

Create `client/src/audio/AudioEngine.ts`:

```ts
// Procedural audio foundation. Owns the AudioContext and the bus graph
// (master → destination; music and sfx feed master). The context can only
// exist after a user gesture (browser autoplay policy), so construction is
// deferred to installUnlockListener's first pointerdown/keydown. Everything
// degrades to no-ops when the context is missing — audio must never throw
// into game code. Module top-level must stay side-effect-free for window/
// document/AudioContext: Vitest imports this file in a node environment.

export type AudioSettings = { musicVol: number; sfxVol: number; muted: boolean };

export const AUDIO_SETTINGS_KEY = 'bloodmoor.audio.v1';
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { musicVol: 60, sfxVol: 80, muted: false };

export function clampVol(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(v)));
}

export function parseAudioSettings(raw: string | null): AudioSettings {
  if (raw === null) return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      musicVol: clampVol(parsed.musicVol, DEFAULT_AUDIO_SETTINGS.musicVol),
      sfxVol: clampVol(parsed.sfxVol, DEFAULT_AUDIO_SETTINGS.sfxVol),
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private mode etc. */ }
}

/** Perceptual volume curve: slider 0-100 → gain. Squared so the low end of
 * the slider is usable instead of the top 20% doing all the work. */
function volToGain(v: number): number {
  return (v / 100) ** 2;
}

const VOLUME_RAMP_S = 0.05;

export class AudioEngine {
  readonly settings: AudioSettings;
  private ctx_: AudioContext | null = null;
  private failed = false;
  private master: GainNode | null = null;
  private music_: GainNode | null = null;
  private sfx_: GainNode | null = null;
  private noise_: AudioBuffer | null = null;
  private unlockCbs: (() => void)[] = [];

  constructor() {
    this.settings = parseAudioSettings(storageGet(AUDIO_SETTINGS_KEY));
  }

  get ctx(): AudioContext | null { return this.ctx_; }
  get sfxBus(): GainNode | null { return this.sfx_; }
  get musicBus(): GainNode | null { return this.music_; }
  get ready(): boolean { return this.ctx_ !== null; }

  /** Run cb once the context exists; if it already does, run now. */
  onUnlock(cb: () => void): void {
    if (this.ctx_) { cb(); return; }
    this.unlockCbs.push(cb);
  }

  /** One-shot capture-phase gesture listener — the first click/keypress
   * anywhere (auth screen, lobby) creates the context. */
  installUnlockListener(): void {
    const unlock = () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      this.init();
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  private init(): void {
    if (this.ctx_ || this.failed) return;
    try {
      this.ctx_ = new AudioContext();
      this.master = this.ctx_.createGain();
      this.master.connect(this.ctx_.destination);
      this.music_ = this.ctx_.createGain();
      this.music_.connect(this.master);
      this.sfx_ = this.ctx_.createGain();
      this.sfx_.connect(this.master);
      this.applyVolumes();
      const cbs = this.unlockCbs;
      this.unlockCbs = [];
      for (const cb of cbs) cb();
    } catch (err) {
      this.failed = true;
      this.ctx_ = null;
      console.warn('Audio unavailable, continuing silent:', err);
    }
  }

  private applyVolumes(): void {
    if (!this.ctx_ || !this.master || !this.music_ || !this.sfx_) return;
    const t = this.ctx_.currentTime + VOLUME_RAMP_S;
    this.master.gain.linearRampToValueAtTime(this.settings.muted ? 0 : 1, t);
    this.music_.gain.linearRampToValueAtTime(volToGain(this.settings.musicVol), t);
    this.sfx_.gain.linearRampToValueAtTime(volToGain(this.settings.sfxVol), t);
  }

  private save(): void {
    storageSet(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
  }

  setMusicVol(v: number): void {
    this.settings.musicVol = clampVol(v, DEFAULT_AUDIO_SETTINGS.musicVol);
    this.applyVolumes();
    this.save();
  }

  setSfxVol(v: number): void {
    this.settings.sfxVol = clampVol(v, DEFAULT_AUDIO_SETTINGS.sfxVol);
    this.applyVolumes();
    this.save();
  }

  setMuted(m: boolean): void {
    this.settings.muted = m;
    this.applyVolumes();
    this.save();
  }

  /** Shared 2s white-noise buffer — every noise-based sound loops a random
   * offset into this instead of allocating its own. */
  noiseBuffer(): AudioBuffer | null {
    if (!this.ctx_) return null;
    if (!this.noise_) {
      const len = this.ctx_.sampleRate * 2;
      this.noise_ = this.ctx_.createBuffer(1, len, this.ctx_.sampleRate);
      const d = this.noise_.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise_;
  }
}

export const audio = new AudioEngine();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run tests/audioSettings.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck and run the full client suite**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, 106 + 8 tests passing.

- [ ] **Step 6: Commit**

```bash
git add client/src/audio/AudioEngine.ts client/tests/audioSettings.test.ts
git commit -m "feat(audio): AudioEngine — lazy unlocked context, buses, persisted settings"
```

---

### Task 2: sfx core + UI sounds + delegated click listener + audition page

**Files:**
- Create: `client/src/audio/sfx.ts`
- Create: `client/audition.html`, `client/src/audition.ts` (dev-only harness, deleted in Task 9)
- Modify: `client/src/main.ts` (imports at top; unlock install + delegated listener right after `injectPixelTheme()`)
- Test: `client/tests/sfxUi.test.ts`

**Interfaces:**
- Consumes: `audio` singleton from Task 1.
- Produces (for later tasks): synthesis helpers **internal to sfx.ts** (`sfxCtx`, `throttle`, `jitter`, `env`, `osc`, `noise`, `bandpass`, `lowpass`) and exports:
  - `function uiSoundForClasses(className: string): 'tab' | 'click' | null`
  - `function playUiClick(): void`, `playUiTab(): void`, `playDenied(): void`
  - Later tasks append more `play*` exports to this same file using the same helpers.

- [ ] **Step 1: Write the failing test**

Create `client/tests/sfxUi.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { uiSoundForClasses } from '../src/audio/sfx';

describe('uiSoundForClasses', () => {
  it('maps nav tabs to the softer tab sound', () => {
    expect(uiSoundForClasses('bm-nav-tab px-btn')).toBe('tab');
    expect(uiSoundForClasses('bm-nav-tab px-btn active')).toBe('tab');
  });

  it('maps buttons and account-menu items to click', () => {
    expect(uiSoundForClasses('px-btn')).toBe('click');
    expect(uiSoundForClasses('bm-acct-item')).toBe('click');
    expect(uiSoundForClasses('bm-acct-btn px-btn')).toBe('click');
  });

  it('ignores everything else', () => {
    expect(uiSoundForClasses('bm-panel')).toBeNull();
    expect(uiSoundForClasses('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run tests/sfxUi.test.ts`
Expected: FAIL — cannot resolve `../src/audio/sfx`.

- [ ] **Step 3: Write sfx.ts (helpers + UI sounds)**

Create `client/src/audio/sfx.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run tests/sfxUi.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire unlock + delegated listener in main.ts**

In `client/src/main.ts`, add to the imports block:

```ts
import { audio } from './audio/AudioEngine';
import * as sfx from './audio/sfx';
```

Directly after the existing `injectPixelTheme();` line (line 27), add:

```ts
audio.installUnlockListener();
```

Directly after `const uiOverlay = document.getElementById('ui-overlay')!;` add:

```ts
// One delegated listener covers every button in the app: all clickable
// chrome shares the px-btn / bm-nav-tab / bm-acct-item classes. Capture
// phase so screens that stopPropagation still make a sound.
uiOverlay.addEventListener('click', (e) => {
  const btn = (e.target as Element | null)?.closest?.('.px-btn, .bm-acct-item');
  if (!btn) return;
  const kind = sfx.uiSoundForClasses(btn.className);
  if (kind === 'tab') sfx.playUiTab();
  else if (kind === 'click') sfx.playUiClick();
}, true);
```

- [ ] **Step 6: Create the audition harness**

Create `client/audition.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BloodMoor Audio Audition</title>
  <style>
    body { background: #14151a; color: #ddd; font-family: monospace; padding: 20px; }
    button { margin: 4px; padding: 8px 12px; background: #23252c; color: #ddd; border: 1px solid #444; cursor: pointer; }
    h2 { color: #ff7a1e; }
    label { display: block; margin: 8px 0; }
  </style>
</head>
<body>
  <h1>Audio Audition</h1>
  <div id="root"></div>
  <script type="module" src="/src/audition.ts"></script>
</body>
</html>
```

Create `client/src/audition.ts`:

```ts
// Dev-only audition harness (never shipped — deleted before merge). Lists
// every exported play* function as a button, plus ambience scenes and the
// volume sliders, for tuning sounds by ear at http://localhost:5173/audition.html
import { audio } from './audio/AudioEngine';
import * as sfx from './audio/sfx';

audio.installUnlockListener();

const root = document.getElementById('root')!;

const sfxHeader = document.createElement('h2');
sfxHeader.textContent = 'SFX';
root.appendChild(sfxHeader);
for (const [name, fn] of Object.entries(sfx)) {
  if (!name.startsWith('play') || typeof fn !== 'function') continue;
  const btn = document.createElement('button');
  btn.textContent = name;
  btn.addEventListener('click', () => (fn as (arg?: unknown) => void)(
    name === 'playDropSting' ? 'unique' : name === 'playResultSwell' ? true : name === 'playCast' ? 1 : undefined,
  ));
  root.appendChild(btn);
}

const volHeader = document.createElement('h2');
volHeader.textContent = 'Volume';
root.appendChild(volHeader);
for (const [label, get, set] of [
  ['music', () => audio.settings.musicVol, (v: number) => audio.setMusicVol(v)],
  ['sfx', () => audio.settings.sfxVol, (v: number) => audio.setSfxVol(v)],
] as const) {
  const wrap = document.createElement('label');
  wrap.textContent = `${label} `;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(get());
  slider.addEventListener('input', () => set(Number(slider.value)));
  wrap.appendChild(slider);
  root.appendChild(wrap);
}
```

(Ambience scene buttons are appended to this file in Task 3.)

- [ ] **Step 7: Typecheck, full suite, and audition by ear**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, all tests pass.
Then `cd client && npm run dev`, open `http://localhost:5173/audition.html`, click each SFX button — a muted thump (click), a softer thump (tab), a double-knock (denied). Adjust envelope/frequency constants by ear if a sound is harsh or inaudible; keep peaks ≤ 0.6.

- [ ] **Step 8: Commit**

```bash
git add client/src/audio/sfx.ts client/tests/sfxUi.test.ts client/src/main.ts client/audition.html client/src/audition.ts
git commit -m "feat(audio): sfx synthesis core, UI click sounds, delegated listener, audition page"
```

---

### Task 3: Ambience — generative layers and scene crossfades

**Files:**
- Create: `client/src/audio/ambience.ts`
- Modify: `client/src/audition.ts` (scene buttons)
- Test: `client/tests/ambience.test.ts`

**Interfaces:**
- Consumes: `audio` singleton (`ctx`, `musicBus`, `noiseBuffer()`, `onUnlock`).
- Produces (Task 6 wires these into main.ts):
  - `type SceneId = 'hall' | 'arena' | 'off'`
  - `type LayerId = 'wind' | 'crackle' | 'drone' | 'pulse'`
  - `function layerTargets(scene: SceneId, dueling: boolean): Record<LayerId, number>`
  - `function setScene(scene: SceneId): void` (idempotent, stores desire pre-unlock)
  - `function setDueling(d: boolean): void`

- [ ] **Step 1: Write the failing test**

Create `client/tests/ambience.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { layerTargets } from '../src/audio/ambience';

describe('layerTargets', () => {
  it('hall: wind, crackle, and drone; never the tension pulse', () => {
    const t = layerTargets('hall', false);
    expect(t.wind).toBeGreaterThan(0);
    expect(t.crackle).toBeGreaterThan(0);
    expect(t.drone).toBeGreaterThan(0);
    expect(t.pulse).toBe(0);
    expect(layerTargets('hall', true).pulse).toBe(0);
  });

  it('arena: wind and thinner drone, no torch crackle', () => {
    const t = layerTargets('arena', false);
    expect(t.wind).toBeGreaterThan(0);
    expect(t.crackle).toBe(0);
    expect(t.drone).toBeGreaterThan(0);
    expect(t.drone).toBeLessThan(layerTargets('hall', false).drone);
  });

  it('arena pulse only while dueling', () => {
    expect(layerTargets('arena', true).pulse).toBeGreaterThan(0);
    expect(layerTargets('arena', false).pulse).toBe(0);
  });

  it('off silences every layer', () => {
    expect(Object.values(layerTargets('off', true)).every(v => v === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run tests/ambience.test.ts`
Expected: FAIL — cannot resolve `../src/audio/ambience`.

- [ ] **Step 3: Write the implementation**

Create `client/src/audio/ambience.ts`:

```ts
// Generative ambience: a few always-running layers whose gains crossfade per
// scene. Layers at target 0 are fully stopped after the fade so idle scenes
// cost no CPU. All timing uses jittered timers — no loop seams, no two
// minutes identical. Routed to the music bus (the "Music" slider governs it).
import { audio } from './AudioEngine';

export type SceneId = 'hall' | 'arena' | 'off';
export type LayerId = 'wind' | 'crackle' | 'drone' | 'pulse';

const FADE_S = 1.5;

/** Pure scene → per-layer gain map (unit gains, pre-bus). */
export function layerTargets(scene: SceneId, dueling: boolean): Record<LayerId, number> {
  switch (scene) {
    case 'hall':
      return { wind: 0.35, crackle: 0.5, drone: 0.4, pulse: 0 };
    case 'arena':
      return { wind: 0.5, crackle: 0, drone: 0.22, pulse: dueling ? 0.35 : 0 };
    case 'off':
      return { wind: 0, crackle: 0, drone: 0, pulse: 0 };
  }
}

type Layer = {
  gain: GainNode;
  stop: () => void;
  /** Optional per-scene re-voicing (drone drops an octave in the arena). */
  setScene?: (scene: SceneId) => void;
};

let desired: SceneId = 'off';
let dueling = false;
const layers = new Map<LayerId, Layer>();
// Guards the stop-after-fade timer against a scene change mid-fade.
const generations = new Map<LayerId, number>();
let unlockHooked = false;

export function setScene(scene: SceneId): void {
  desired = scene;
  if (!unlockHooked) {
    unlockHooked = true;
    audio.onUnlock(() => apply());
  }
  apply();
}

export function setDueling(d: boolean): void {
  dueling = d;
  apply();
}

function apply(): void {
  const ctx = audio.ctx;
  const out = audio.musicBus;
  if (!ctx || !out) return;
  const targets = layerTargets(desired, dueling);
  for (const id of Object.keys(targets) as LayerId[]) {
    const target = targets[id];
    const gen = (generations.get(id) ?? 0) + 1;
    generations.set(id, gen);
    if (target > 0 && !layers.has(id)) {
      layers.set(id, startLayer(id, ctx, out));
    }
    const layer = layers.get(id);
    if (!layer) continue;
    layer.setScene?.(desired);
    layer.gain.gain.cancelScheduledValues(ctx.currentTime);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, ctx.currentTime);
    layer.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + FADE_S);
    if (target === 0) {
      window.setTimeout(() => {
        if (generations.get(id) !== gen) return; // re-raised mid-fade
        layers.get(id)?.stop();
        layers.delete(id);
      }, FADE_S * 1000 + 100);
    }
  }
}

function startLayer(id: LayerId, ctx: AudioContext, out: GainNode): Layer {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  switch (id) {
    case 'wind': return startWind(ctx, gain);
    case 'crackle': return startCrackle(ctx, gain);
    case 'drone': return startDrone(ctx, gain);
    case 'pulse': return startPulse(ctx, gain);
  }
}

/** Moor wind: looped noise through a slowly LFO-wandering bandpass. */
function startWind(ctx: AudioContext, gain: GainNode): Layer {
  const buf = audio.noiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 380;
  filter.Q.value = 0.6;
  filter.connect(gain);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 160;
  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);
  lfo.start();
  let src: AudioBufferSourceNode | null = null;
  if (buf) {
    src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.5; // darker, brown-ish
    src.connect(filter);
    src.start();
  }
  return {
    gain,
    stop: () => { src?.stop(); lfo.stop(); gain.disconnect(); },
  };
}

/** Torch crackle: irregular clusters of short bandpassed noise bursts. */
function startCrackle(ctx: AudioContext, gain: GainNode): Layer {
  let alive = true;
  let timer = 0;
  const scheduleBurst = () => {
    if (!alive) return;
    const buf = audio.noiseBuffer();
    if (buf) {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400 + Math.random() * 1800;
      bp.Q.value = 4;
      const burst = ctx.createGain();
      const dur = 0.02 + Math.random() * 0.06;
      burst.gain.setValueAtTime(0.0001, t);
      burst.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.5, t + 0.004);
      burst.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(burst); burst.connect(gain);
      src.start(t, Math.random() * 1.5);
      src.stop(t + dur + 0.05);
      src.onended = () => { src.disconnect(); bp.disconnect(); burst.disconnect(); };
    }
    // Clustered timing: mostly rapid ticks, occasional longer gaps.
    const gap = Math.random() < 0.7 ? 60 + Math.random() * 180 : 400 + Math.random() * 900;
    timer = window.setTimeout(scheduleBurst, gap);
  };
  scheduleBurst();
  return {
    gain,
    stop: () => { alive = false; clearTimeout(timer); gain.disconnect(); },
  };
}

// Slow minor progression roots (Hz, ~A1 territory). Fifth rides above.
const DRONE_ROOTS = [55.0, 43.65, 65.41, 49.0]; // A1 F1 C2 G1

/** Drone pad: two detuned saws + a fifth through a breathing lowpass,
 * stepping through the progression every ~7s (jittered). */
function startDrone(ctx: AudioContext, gain: GainNode): Layer {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  lp.Q.value = 0.7;
  lp.connect(gain);
  const breath = ctx.createOscillator();
  breath.frequency.value = 0.05;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 90;
  breath.connect(breathDepth);
  breathDepth.connect(lp.frequency);
  breath.start();

  const oscs: OscillatorNode[] = [];
  const mults = [1, 1, 1.5]; // root, root(detuned), fifth
  const detunes = [-8, 8, 0];
  for (let i = 0; i < mults.length; i++) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = DRONE_ROOTS[0] * mults[i];
    o.detune.value = detunes[i];
    const g = ctx.createGain();
    g.gain.value = i === 2 ? 0.15 : 0.3;
    o.connect(g);
    g.connect(lp);
    o.start();
    oscs.push(o);
  }

  let octave = 1; // arena re-voices an octave down
  let step = 0;
  let alive = true;
  let timer = 0;
  const advance = () => {
    if (!alive) return;
    step = (step + 1) % DRONE_ROOTS.length;
    const root = DRONE_ROOTS[step] * octave;
    for (let i = 0; i < oscs.length; i++) {
      oscs[i].frequency.linearRampToValueAtTime(root * mults[i], ctx.currentTime + 2.5);
    }
    timer = window.setTimeout(advance, 5500 + Math.random() * 3000);
  };
  timer = window.setTimeout(advance, 5500 + Math.random() * 3000);

  return {
    gain,
    setScene: (scene) => {
      const next = scene === 'arena' ? 0.5 : 1;
      if (next === octave) return;
      octave = next;
      const root = DRONE_ROOTS[step] * octave;
      for (let i = 0; i < oscs.length; i++) {
        oscs[i].frequency.linearRampToValueAtTime(root * mults[i], ctx.currentTime + 2);
      }
    },
    stop: () => {
      alive = false;
      clearTimeout(timer);
      for (const o of oscs) o.stop();
      breath.stop();
      gain.disconnect();
    },
  };
}

/** Dueling tension: low sine throb at ~70bpm. */
function startPulse(ctx: AudioContext, gain: GainNode): Layer {
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = 55;
  const amp = ctx.createGain();
  amp.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 70 / 60;
  const depth = ctx.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth);
  depth.connect(amp.gain);
  carrier.connect(amp);
  amp.connect(gain);
  carrier.start();
  lfo.start();
  return {
    gain,
    stop: () => { carrier.stop(); lfo.stop(); gain.disconnect(); },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run tests/ambience.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add scene buttons to the audition page**

Append to `client/src/audition.ts`:

```ts
import { setScene, setDueling } from './audio/ambience';

const ambHeader = document.createElement('h2');
ambHeader.textContent = 'Ambience';
root.appendChild(ambHeader);
for (const scene of ['hall', 'arena', 'off'] as const) {
  const btn = document.createElement('button');
  btn.textContent = `scene: ${scene}`;
  btn.addEventListener('click', () => setScene(scene));
  root.appendChild(btn);
}
for (const d of [true, false]) {
  const btn = document.createElement('button');
  btn.textContent = `dueling: ${d}`;
  btn.addEventListener('click', () => setDueling(d));
  root.appendChild(btn);
}
```

(Move the `import` to the top of the file with the others.)

- [ ] **Step 6: Typecheck, full suite, audition by ear**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean.
Then in the audition page: `scene: hall` should give wind + irregular crackle + a slowly-shifting low pad; `scene: arena` drops the crackle and darkens the drone; `dueling: true` adds a slow throb; `scene: off` fades to silence within ~2s and CPU (dev-tools performance monitor) returns to idle. Tune gains in `layerTargets` and filter/LFO constants by ear — keep the ambience clearly *behind* the SFX level.

- [ ] **Step 7: Commit**

```bash
git add client/src/audio/ambience.ts client/tests/ambience.test.ts client/src/audition.ts
git commit -m "feat(audio): generative ambience layers with scene crossfades"
```

---

### Task 4: Spell SFX — casts, projectiles, impacts, loops

**Files:**
- Modify: `client/src/audio/sfx.ts` (append spell sounds)
- Modify: `client/src/renderer/SpellRenderer.ts` (hook existing diff sites)
- Modify: `client/src/main.ts` (cast latch in `onGameState`)

**Interfaces:**
- Consumes: sfx helpers from Task 2; `SpellId` from `@arena/shared`.
- Produces (new exports on `sfx.ts`):
  - `playCast(spell: SpellId): void`
  - `playFireballWhoosh(): void`, `playFireballExplode(): void`
  - `playArrowSpawn(): void`
  - `playMeteorFall(): void`, `playMeteorImpact(): void`
  - `playRainVolley(): void`, `playRainImpact(): void`
  - `playTeleport(): void`
  - `startFireWallLoop(id: string): void`, `stopFireWallLoop(id: string): void`, `stopAllSpellLoops(): void`

No unit tests for this task (Web Audio + Three.js are untestable in the node environment); verification is the audition page plus a live match in Step 4. Keep the audition page working — it picks up new `play*` exports automatically.

- [ ] **Step 1: Append spell sounds to sfx.ts**

```ts
// ── Spells ──────────────────────────────────────────────────────────────────
import type { SpellId } from '@arena/shared';   // ← merge into the top import block

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
```

- [ ] **Step 2: Hook SpellRenderer diff sites**

In `client/src/renderer/SpellRenderer.ts`, add to imports:

```ts
import * as sfx from '../audio/sfx';
```

Then, at the existing sites (line numbers as of base `ad23cc3`):

1. `detectTeleports` (~line 159), inside `if (player.teleported) {`, add: `sfx.playTeleport();`
2. `syncFireballs` removal branch (~line 194), right after `this.particles.emitExplosion(...)`: `sfx.playFireballExplode();`
3. `syncFireballs` creation branch (~line 205), inside `if (!this.fireballs.has(fb.id)) {`: `sfx.playFireballWhoosh();`
4. `syncArrows` creation branch (~line 249), inside `if (!this.arrows.has(arrow.id)) {`: `sfx.playArrowSpawn();`
5. `syncFireWalls` creation branch (~line 299), inside `if (!this.fireWalls.has(fw.id)) {` but **only for real fire — not rain zones**, i.e. add at the top of the branch: `if (!isRainZone) sfx.startFireWallLoop(fw.id);`
6. `syncFireWalls` removal branch (~line 283), after `this.fireWalls.delete(id);`: `sfx.stopFireWallLoop(id);` (safe no-op for rain-zone ids that never started a loop)
7. `syncMeteors` creation branch (~line 362), inside `if (!this.meteors.has(meteor.id)) {`: `sfx.playMeteorFall();`
8. `syncMeteors` removal branch (~line 356), after `this.particles.emitMeteorImpact(...)`: `sfx.playMeteorImpact();`
9. `syncRainOfArrows` creation branch (~line 421), inside `if (!this.rainOfArrows.has(rain.id)) {`: `sfx.playRainVolley();`
10. `syncRainOfArrows` removal branch (~line 415), after `this.particles.emitRainImpact(...)`: `sfx.playRainImpact();`
11. `dispose()` (~line 450), first line: `sfx.stopAllSpellLoops();`

- [ ] **Step 3: Hook the cast latch in main.ts**

In `client/src/main.ts`, in `socket.onGameState` where casts are latched (~line 466):

```ts
    for (const [id, p] of Object.entries(state.players)) {
      if (p.castingSpell !== null) {
        pendingCastAnim.add(id);
        // Cast audio fires here, not in the render loop — the same one-tick
        // latch reasoning as the animation (see pendingCastAnim above).
        sfx.playCast(p.castingSpell);
      }
    }
```

(Replace the existing single-line body of that loop.)

- [ ] **Step 4: Typecheck, tests, and live verification**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean.
Audition page: click `playCast`, `playFireballExplode`, `playMeteorFall`, etc.
Then run a real duel (two browser windows, `cd server && npm run dev` + `cd client && npm run dev`, create/join a room, both ready): every fireball should cast-thump then whoosh then boom on impact; a fire wall should crackle while it burns and stop when it expires; meteor should sweep down and land heavy; teleport should shimmer. Confirm no console errors and no sound spam from multishot (throttles working).

- [ ] **Step 5: Commit**

```bash
git add client/src/audio/sfx.ts client/src/renderer/SpellRenderer.ts client/src/main.ts
git commit -m "feat(audio): spell casts, projectiles, impacts, and fire-wall loops"
```

---

### Task 5: Combat feedback — hits, deaths, cooldowns, out-of-mana

**Files:**
- Modify: `client/src/audio/sfx.ts` (append combat sounds)
- Modify: `client/src/hud/HUD.ts` (existing HP-diff and slot-state sites)
- Modify: `client/src/main.ts` (out-of-mana attempt in the input step loop)

**Interfaces:**
- Consumes: sfx helpers; HUD's existing `prevHp` / `slotEls` bookkeeping.
- Produces (new exports on `sfx.ts`): `playHitTaken(): void`, `playHitDealt(): void`, `playDeath(): void`, `playCooldownReady(): void`, `playNoMana(): void`

No new unit tests (DOM/Web Audio); live verification in Step 4. Note the interpolated-HP caveat: `StateBuffer` may surface an HP drop over several consecutive frames, so `playHitTaken`/`playHitDealt` must keep the 150ms throttle below.

- [ ] **Step 1: Append combat sounds to sfx.ts**

```ts
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
```

- [ ] **Step 2: Hook HUD diff sites**

In `client/src/hud/HUD.ts`, add to imports:

```ts
import * as sfx from '../audio/sfx';
```

Three edits in `update()` (line numbers as of base `ad23cc3`):

1. **Own hit + own death.** After the `lowPulse` block (~line 192), before the slot loop, add:

```ts
    const prevMe = this.prevHp[this.myId];
    if (prevMe !== undefined && me.hp < prevMe) {
      if (prevMe > 0 && me.hp <= 0) sfx.playDeath();
      else sfx.playHitTaken();
    }
```

2. **Cooldown-ready tick.** In the slot loop's cooldown branch (~line 203), extend:

```ts
      if (pct !== entry.lastPct) {
        // A slot that just finished cooling gives a soft ready tick.
        if (entry.lastPct > 0 && pct === 0) sfx.playCooldownReady();
        entry.cd.style.height = `${pct}%`;
        entry.slot.classList.toggle('cooling', pct > 0);
        entry.lastPct = pct;
      }
```

3. **Hit dealt + enemy death.** In the enemy-row white-flash branch (~line 251):

```ts
        if (entry.lastHp >= 0 && player.hp < entry.lastHp) {
          sfx.playHitDealt();
          entry.row.classList.add('hit');
          clearTimeout(entry.flashTimer);
          entry.flashTimer = window.setTimeout(() => entry!.row.classList.remove('hit'), 140);
        }
```

And in the elimination check (~line 262):

```ts
      const prev = this.prevHp[id];
      if (prev !== undefined && prev > 0 && player.hp <= 0) {
        sfx.playDeath();
        this.showElimination(player.displayName);
      }
```

- [ ] **Step 3: Out-of-mana attempt in main.ts**

In `client/src/main.ts`, inside the render loop's fixed-step input while-loop (~line 669), after `const frame = inputHandler.buildInputFrame();` add:

```ts
    // Cast attempted without the mana: the server will silently ignore it,
    // so give local feedback. Cooldown-blocked casts stay silent — the
    // grayed slot already communicates those.
    if (frame.castSpell) {
      const me = stateBuffer.getLatest()?.players[myId];
      if (me && me.hp > 0 && (me.cooldowns[frame.castSpell] ?? 0) <= 0
          && me.mana < SPELL_CONFIG[frame.castSpell].manaCost) {
        sfx.playNoMana();
      }
    }
```

(`SPELL_CONFIG` is already imported in main.ts.)

- [ ] **Step 4: Typecheck, tests, and live verification**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean.
Live duel: each fireball landing on the enemy gives a light crack + their plate flashes; getting hit gives a darker thump; a kill gives the boom-groan under the elimination toast; spamming a spell with an empty mana pool gives the dead thud (throttled, not machine-gunning); a finished cooldown ticks softly. Verify no double-firing from HP interpolation (single thump per fireball hit).

- [ ] **Step 5: Commit**

```bash
git add client/src/audio/sfx.ts client/src/hud/HUD.ts client/src/main.ts
git commit -m "feat(audio): combat feedback — hits, deaths, cooldown ready, no-mana"
```

---

### Task 6: Match flow — scenes, stingers, result rewards, countdown, social

**Files:**
- Modify: `client/src/audio/sfx.ts` (append stingers)
- Modify: `client/src/main.ts` (scene wiring, duel-begin, chat/join sounds)
- Modify: `client/src/lobby/LobbyUI.ts` (`showResult` reward stingers, rematch countdown ticks)
- Test: `client/tests/sfxStingers.test.ts`

**Interfaces:**
- Consumes: `setScene`/`setDueling` from Task 3; `ItemRarity` from `@arena/shared`.
- Produces (new exports on `sfx.ts`):
  - `function dropStingSemitones(rarity: string): number` (pure, tested)
  - `playResultSwell(won: boolean): void`, `playLevelUp(): void`, `playGoldGain(): void`, `playDropSting(rarity: string): void`
  - `playDuelBegin(): void`, `playCountdownTick(): void`
  - `playChatTick(): void`, `playPlayerJoin(): void`

- [ ] **Step 1: Write the failing test**

Create `client/tests/sfxStingers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dropStingSemitones } from '../src/audio/sfx';

describe('dropStingSemitones', () => {
  it('rises with rarity tier', () => {
    expect(dropStingSemitones('basic')).toBe(0);
    expect(dropStingSemitones('magic')).toBe(3);
    expect(dropStingSemitones('rare')).toBe(7);
    expect(dropStingSemitones('unique')).toBe(12);
  });

  it('treats unknown rarities as basic', () => {
    expect(dropStingSemitones('mythic-nonsense')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run tests/sfxStingers.test.ts`
Expected: FAIL — `dropStingSemitones` is not exported.

- [ ] **Step 3: Append stingers to sfx.ts**

```ts
// ── Match flow & meta stingers ──────────────────────────────────────────────

/** Brass-ish swell: detuned saws under an opening lowpass. Victory lifts a
 * major third at the crest; defeat slumps a semitone. */
export function playResultSwell(won: boolean): void {
  const c = sfxCtx();
  if (!c || throttle('result', 500)) return;
  const root = 87.3; // F2
  const g = env(c, 0.5, 0.6, 0.4, 1.2);
  const lp = lowpass(c, 200, 1400, 1.0, g, 0.9);
  for (const [mult, det] of [[1, -7], [1, 7], [1.5, 0]] as const) {
    const o = c.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(root * mult, c.t);
    const shift = won ? Math.pow(2, 4 / 12) : Math.pow(2, -1 / 12);
    o.frequency.linearRampToValueAtTime(root * mult * shift, c.t + 1.2);
    o.detune.value = det;
    o.connect(lp);
    o.start(c.t);
    o.stop(c.t + 2.3);
    o.onended = () => o.disconnect();
  }
}

/** Rising two-note dark chime. */
export function playLevelUp(): void {
  const c = sfxCtx();
  if (!c || throttle('levelUp', 300)) return;
  osc(c, 'triangle', 220, 220, 0.25, lowpass(c, 1200, 900, 0.25, env(c, 0.4, 0.01, 0.05, 0.2)));
  const c2 = { ...c, t: c.t + 0.18 };
  osc(c2, 'triangle', 330, 330, 0.4, lowpass(c2, 1600, 1100, 0.4, env(c2, 0.45, 0.01, 0.1, 0.35)));
}

/** Two coin-like metallic ticks. */
export function playGoldGain(): void {
  const c = sfxCtx();
  if (!c || throttle('gold', 200)) return;
  for (const dt of [0, 0.09]) {
    const ci = { ...c, t: c.t + dt };
    const g = env(ci, 0.25, 0.002, 0, 0.12);
    osc(ci, 'triangle', jitter(1250, 0.05), 1100, 0.12, g);
    osc(ci, 'triangle', jitter(1930, 0.05), 1700, 0.1, g); // inharmonic partner
  }
}

/** Pure rarity → pitch-lift map for the drop sting. */
export function dropStingSemitones(rarity: string): number {
  switch (rarity) {
    case 'magic': return 3;
    case 'rare': return 7;
    case 'unique': return 12;
    default: return 0; // 'basic' and anything unknown
  }
}

/** Metallic strike with inharmonic partials; brighter with rarity. */
export function playDropSting(rarity: string): void {
  const c = sfxCtx();
  if (!c || throttle('drop', 300)) return;
  const lift = Math.pow(2, dropStingSemitones(rarity) / 12);
  const g = env(c, 0.45, 0.005, 0.05, 0.8);
  for (const partial of [1, 2.76, 5.4]) { // bell-like inharmonic series
    osc(c, 'triangle', 392 * lift * partial, 392 * lift * partial, 0.85, g);
  }
}

/** Single deep tom hit: the duel begins. */
export function playDuelBegin(): void {
  const c = sfxCtx();
  if (!c || throttle('duelBegin', 500)) return;
  osc(c, 'sine', 130, 45, 0.4, env(c, 0.8, 0.004, 0.03, 0.38));
  noise(c, 0.12, lowpass(c, 800, 200, 0.12, env(c, 0.3, 0.003, 0, 0.12)));
}

/** Deep tom tick for each countdown second. */
export function playCountdownTick(): void {
  const c = sfxCtx();
  if (!c || throttle('cdTick', 300)) return;
  osc(c, 'sine', 110, 60, 0.18, env(c, 0.5, 0.004, 0, 0.18));
}

/** Low woodblock-ish tick: chat message / player joined. */
export function playChatTick(): void {
  const c = sfxCtx();
  if (!c || throttle('chat', 150)) return;
  osc(c, 'triangle', jitter(340, 0.06), 250, 0.06, lowpass(c, 1100, 700, 0.06, env(c, 0.22, 0.002, 0, 0.06)));
}

/** Slightly warmer double-tick: someone entered the lobby. */
export function playPlayerJoin(): void {
  const c = sfxCtx();
  if (!c || throttle('join', 200)) return;
  osc(c, 'triangle', 280, 260, 0.07, lowpass(c, 1000, 700, 0.07, env(c, 0.25, 0.002, 0, 0.07)));
  const c2 = { ...c, t: c.t + 0.1 };
  osc(c2, 'triangle', 350, 330, 0.08, lowpass(c2, 1100, 800, 0.08, env(c2, 0.25, 0.002, 0, 0.08)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run tests/sfxStingers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Scene + stinger wiring in main.ts**

Add to main.ts imports:

```ts
import { setScene, setDueling } from './audio/ambience';
```

Six edits:

1. After the `audio.installUnlockListener();` line (from Task 2), add: `setScene('hall');` — ambience starts as soon as the first gesture unlocks the context, on whatever menu screen is up.
2. In `startGame()` (~line 610), after `hud.show();` add:

```ts
  setScene('arena');
  setDueling(true);
  sfx.playDuelBegin();
```

3. In `stopGame()` (~line 631), after `hud.hide();` add: `setDueling(false);` — `stopGame()` is the single choke point for every match exit (duel end, opponent disconnect, rejoin failure, logout), so the tension pulse can't outlive a match. The scene deliberately stays `'arena'` here — the result screen keeps arena ambience per the spec; hall returns via the edits below.
4. In the lobby callbacks' `onReturnToLobby` (~line 392), first line: `setScene('hall');`
5. In `handleLogout` (~line 136), after `stopGame();` add: `setScene('hall');`
6. In `setupSocketHandlers`:
   - `socket.onChatMessage` (~line 434): extend the handler body to
     ```ts
     socket.onChatMessage(({ senderId, displayName, text }) => {
       if (senderId !== myId) sfx.playChatTick();
       lobby.appendChatMessage(senderId, displayName, text);
     });
     ```
   - `socket.onPlayerJoined` (~line 438): add `sfx.playPlayerJoin();` as the first line of the handler.

- [ ] **Step 6: Result-screen reward stingers + countdown ticks in LobbyUI.ts**

In `client/src/lobby/LobbyUI.ts`, add to imports:

```ts
import * as sfx from '../audio/sfx';
```

In `showResult` (~line 404): the reward blocks already compute their animation delays; capture them and schedule matching sounds. After `const hasLevelUp = ...`, the code builds `xpHtml`, then `rewardDelay`/`goldHtml`/`spoilsHtml`. Modify to capture:

```ts
    let rewardDelay = hasLevelUp ? 1.1 : 0.8;
    let goldHtml = '';
    let goldDelay = 0;
    if (matchResult && matchResult.goldGained > 0) {
      goldDelay = rewardDelay;
      goldHtml = `<div class="bm-result-gold" style="animation-delay:${rewardDelay}s">+${matchResult.goldGained} <i class="fa fa-coins"></i> Gold</div>`;
      rewardDelay += 0.3;
    }

    let spoilsHtml = '';
    let spoilsDelay = 0;
    const droppedItem = matchResult?.droppedItem;
    const droppedBase = droppedItem ? itemBase(droppedItem) : undefined;
    if (droppedItem && droppedBase) {
      spoilsDelay = rewardDelay;
      // ... existing spoilsHtml construction unchanged ...
```

Then, immediately after the `this.ui.innerHTML = \`...\`` assignment at the end of `showResult`, add:

```ts
    // Sound beats mirror the visual reveal sequence above.
    sfx.playResultSwell(won);
    if (hasLevelUp) window.setTimeout(() => sfx.playLevelUp(), 900);
    if (goldDelay > 0) window.setTimeout(() => sfx.playGoldGain(), goldDelay * 1000);
    if (droppedItem && spoilsDelay > 0) {
      const rarity = droppedItem.rarity;
      window.setTimeout(() => sfx.playDropSting(rarity), spoilsDelay * 1000);
    }
```

In `showRematchCountdown` (~line 529): add `sfx.playCountdownTick();` right after the `let remaining = countdown;` line, and inside the `setInterval` callback, after `remaining--;`, change the early-return block to play a tick when the countdown is still running:

```ts
    this.rematchInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        if (this.rematchInterval) clearInterval(this.rematchInterval);
        this.rematchInterval = null;
        if (isRequester) {
          this.disableRematch();
        }
        return;
      }
      sfx.playCountdownTick();
      // ... existing button-label update unchanged ...
```

- [ ] **Step 7: Typecheck, tests, and live verification**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean.
Live: log in (hall ambience fades in after the first click), start a duel (ambience darkens, throb starts, deep begin-hit), finish it (throb stops, swell plays won/lost variant, gold/drop stingers land on their visual beats), request a rematch (per-second toms), return to lobby (hall ambience returns). Chat messages from the other window tick; your own don't.

- [ ] **Step 8: Commit**

```bash
git add client/src/audio/sfx.ts client/tests/sfxStingers.test.ts client/src/main.ts client/src/lobby/LobbyUI.ts
git commit -m "feat(audio): scene wiring, match stingers, result rewards, countdown, social ticks"
```

---

### Task 7: Menu-screen SFX — gear, shop, skills

**Files:**
- Modify: `client/src/audio/sfx.ts` (append item/skill sounds)
- Modify: `client/src/items/GearScreen.ts`, `client/src/items/ShopScreen.ts`, `client/src/skills/SkillTreeUI.ts`

**Interfaces:**
- Consumes: sfx helpers; `playDenied`, `playDropSting` already exist.
- Produces (new exports on `sfx.ts`): `playEquip(): void`, `playUnequip(): void`, `playSell(): void`, `playPurchase(): void`, `playSkillSpend(): void`

No new unit tests (handlers are DOM+Supabase); verify via audition page and Step 3. Each hook goes on the **optimistic/local** path — these actions are Supabase RPCs, so the sound plays when the user acts, not when the network returns.

- [ ] **Step 1: Append item/skill sounds to sfx.ts**

```ts
// ── Items & skills ──────────────────────────────────────────────────────────

/** Leather-ish thud: item slotted into gear. */
export function playEquip(): void {
  const c = sfxCtx();
  if (!c || throttle('equip', 100)) return;
  osc(c, 'triangle', jitter(170, 0.08), 90, 0.1, lowpass(c, 700, 300, 0.1, env(c, 0.45, 0.003, 0, 0.1)));
  noise(c, 0.06, bandpass(c, 500, 350, 0.06, env(c, 0.2, 0.003, 0, 0.06), 1));
}

/** Lighter reverse of equip: item pulled back out. */
export function playUnequip(): void {
  const c = sfxCtx();
  if (!c || throttle('unequip', 100)) return;
  osc(c, 'triangle', jitter(110, 0.08), 170, 0.09, lowpass(c, 600, 400, 0.09, env(c, 0.32, 0.003, 0, 0.09)));
}

/** Coin tick + fading whoosh: sold to the void. */
export function playSell(): void {
  const c = sfxCtx();
  if (!c || throttle('sell', 150)) return;
  osc(c, 'triangle', 1250, 1100, 0.1, env(c, 0.2, 0.002, 0, 0.1));
  noise(c, 0.3, bandpass(c, 900, 250, 0.3, env(c, 0.2, 0.02, 0, 0.28), 1));
}

/** Two coin ticks landing in the till: purchase committed. */
export function playPurchase(): void {
  const c = sfxCtx();
  if (!c || throttle('purchase', 150)) return;
  for (const dt of [0, 0.08]) {
    const ci = { ...c, t: c.t + dt };
    osc(ci, 'triangle', jitter(1150, 0.06), 1000, 0.1, env(ci, 0.22, 0.002, 0, 0.1));
  }
  osc(c, 'triangle', 160, 100, 0.09, lowpass(c, 600, 300, 0.09, env(c, 0.3, 0.003, 0, 0.09)));
}

/** Stone-thunk + faint ember shimmer: a skill point committed. */
export function playSkillSpend(): void {
  const c = sfxCtx();
  if (!c || throttle('skillSpend', 150)) return;
  osc(c, 'triangle', jitter(140, 0.06), 60, 0.14, lowpass(c, 500, 200, 0.14, env(c, 0.55, 0.003, 0, 0.14)));
  const c2 = { ...c, t: c.t + 0.1 };
  noise(c2, 0.25, bandpass(c2, 2400, 3600, 0.25, env(c2, 0.08, 0.03, 0, 0.22), 2.5));
}
```

- [ ] **Step 2: Hook the screen handlers**

Add `import * as sfx from '../audio/sfx';` to each of the three files.

**`client/src/items/GearScreen.ts`:**
- `equipOptimistic` (~line 343): `sfx.playEquip();` as the first line.
- `handleUnequip` (~line 364): `sfx.playUnequip();` as the first line.
- `handleSell` (~line 481): the method builds a `run` closure and (for uniques) routes through `showConfirm`. Add `sfx.playSell();` as the **first synchronous line inside the `run` closure** (so a cancelled unique-sell confirm makes no sound). Read the method before editing — there is a comment at ~line 169 about the first-synchronous-line pattern; follow it.

**`client/src/items/ShopScreen.ts`:**
- `handleBuySlot` (~line 348): read the method; it guards on affordability/in-flight before calling `buyVendorSlot`. Add `sfx.playDenied();` in the insufficient-gold early-return branch, and `sfx.playPurchase();` immediately before the `buyVendorSlot(...)` RPC call (optimistic).
- The lootbox open path (`handleOpenLootbox` → `renderReveal`, ~line 272): add `sfx.playPurchase();` immediately before the `openLootbox(...)` RPC call, and in `renderReveal`, `sfx.playDropSting(item.rarity);` where the revealed item is first rendered (reuse the reveal's item variable — read the method for its actual name).

**`client/src/skills/SkillTreeUI.ts`:**
- `buyNode` (~line 620): read the method; add `sfx.playDenied();` in the can't-afford/blocked early-return branch and `sfx.playSkillSpend();` on the path that commits the purchase (first line of the success path, before the RPC).
- The right-click refund path (search for where refund is invoked, near the `superBtn` listener at ~line 572): `sfx.playUnequip();` when a rank is refunded.
- `handleRespec` (~line 692): inside the `showConfirm` accept callback, first line: `sfx.playUnequip();`

- [ ] **Step 3: Typecheck, tests, and live verification**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean.
Live: equip/unequip/sell items in Gear (unique sell only sounds after confirming), buy a vendor slot and open a lootbox in Shop (drop sting pitch rises with rarity), spend and refund a skill point, attempt a purchase you can't afford (double-knock).

- [ ] **Step 4: Commit**

```bash
git add client/src/audio/sfx.ts client/src/items/GearScreen.ts client/src/items/ShopScreen.ts client/src/skills/SkillTreeUI.ts
git commit -m "feat(audio): gear, shop, and skill-tree action sounds"
```

---

### Task 8: Settings popover + nav-bar Settings entry

**Files:**
- Create: `client/src/audio/settingsPopover.ts`
- Modify: `client/src/ui/navBar.ts` (menu item, `NavHandlers`, `NavAccountHandlers`, `wireNavBar`)
- Modify: `client/src/main.ts` (`navAccountHandlers` + popover instance)
- Modify: `client/src/lobby/LobbyUI.ts`, `client/src/skills/SkillTreeUI.ts`, `client/src/items/GearScreen.ts`, `client/src/items/ShopScreen.ts`, `client/src/admin/AdminScreen.ts` (pass `onSettings` through their `wireNavBar` calls)
- Test: modify `client/tests/LobbyUI.test.ts` (menu expectations), create `client/tests/settingsPopover.test.ts`

**Interfaces:**
- Consumes: `audio` singleton; nav plumbing from `navBar.ts`.
- Produces:
  - `navBar.ts`: `AccountMenuItem['id']` union gains `'settings'`; `accountMenuItems` inserts `{ id: 'settings', label: 'Settings' }` immediately before Sign Out; `NavAccountHandlers` and `NavHandlers` gain `onSettings: () => void`; `wireNavBar`'s `menuActions` gains `settings: () => handlers.onSettings()`.
  - `settingsPopover.ts`: `function settingsMarkup(s: AudioSettings): string` (pure, tested) and `class SettingsPopover { constructor(container: HTMLElement); show(): void }`.

- [ ] **Step 1: Write the failing tests**

Modify `client/tests/LobbyUI.test.ts` — the two `accountMenuItems` expectations become:

```ts
    expect(accountMenuItems(false).map(i => i.id)).toEqual(['credits', 'settings', 'logout']);
```

and

```ts
    expect(accountMenuItems(true).map(i => i.id)).toEqual(['credits', 'admin', 'settings', 'logout']);
```

Create `client/tests/settingsPopover.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { settingsMarkup } from '../src/audio/settingsPopover';

describe('settingsMarkup', () => {
  it('renders both sliders at the current values', () => {
    const html = settingsMarkup({ musicVol: 25, sfxVol: 75, muted: false });
    expect(html).toContain('data-audio-music');
    expect(html).toContain('value="25"');
    expect(html).toContain('data-audio-sfx');
    expect(html).toContain('value="75"');
  });

  it('reflects the mute state on the toggle', () => {
    expect(settingsMarkup({ musicVol: 60, sfxVol: 80, muted: true })).toContain('checked');
    expect(settingsMarkup({ musicVol: 60, sfxVol: 80, muted: false })).not.toContain('checked');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run tests/LobbyUI.test.ts tests/settingsPopover.test.ts`
Expected: both FAIL (menu missing `settings`; module missing).

- [ ] **Step 3: Implement navBar changes**

In `client/src/ui/navBar.ts`:

```ts
export type AccountMenuItem = { id: 'credits' | 'admin' | 'settings' | 'logout'; label: string };

export function accountMenuItems(isAdmin: boolean): AccountMenuItem[] {
  const items: AccountMenuItem[] = [
    { id: 'credits', label: 'Credits' },
  ];
  if (isAdmin) items.push({ id: 'admin', label: '⚙ Admin' });
  items.push({ id: 'settings', label: 'Settings' });
  items.push({ id: 'logout', label: 'Sign Out' });
  return items;
}
```

Extend both handler types:

```ts
export type NavAccountHandlers = { onCredits: () => void; onLogout: () => void; onSettings: () => void };
```

```ts
export type NavHandlers = {
  /** Fires for a section tab and for the account menu's Admin entry. Never
   * fires for the active section. */
  onNavigate: (key: NavKey) => void;
  onCredits: () => void;
  onLogout: () => void;
  onSettings: () => void;
};
```

And in `wireNavBar`'s `menuActions`:

```ts
  const menuActions: Record<string, () => void> = {
    credits: () => handlers.onCredits(),
    admin: () => handlers.onNavigate('admin'),
    settings: () => handlers.onSettings(),
    logout: () => handlers.onLogout(),
  };
```

- [ ] **Step 4: Implement the popover**

Create `client/src/audio/settingsPopover.ts`:

```ts
// Volume settings modal, styled after the existing confirm dialogs
// (SkillTreeUI.showConfirm / GearScreen.showConfirm: fixed-inset overlay,
// z-index 500, px-panel chrome). Changes apply live and persist immediately.
import { audio, AudioSettings } from './AudioEngine';
import { injectStylesOnce } from '../ui/castleTheme';

const CSS = `
.au-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:500;}
.au-panel{background:var(--px-panel);padding:24px 28px;min-width:320px;box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 12px 32px rgba(0,0,0,0.7);}
.au-title{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:1px;margin-bottom:18px;}
.au-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-text);letter-spacing:1px;}
.au-row label{width:70px;text-transform:uppercase;}
.au-row input[type=range]{flex:1;accent-color:var(--px-accent);}
.au-actions{display:flex;justify-content:flex-end;margin-top:18px;}
`;

/** Markup only — pure for testability. */
export function settingsMarkup(s: AudioSettings): string {
  return `
    <div class="au-panel">
      <div class="au-title">Settings</div>
      <div class="au-row"><label>Music</label><input type="range" min="0" max="100" value="${s.musicVol}" data-audio-music></div>
      <div class="au-row"><label>SFX</label><input type="range" min="0" max="100" value="${s.sfxVol}" data-audio-sfx></div>
      <div class="au-row"><label>Mute</label><input type="checkbox" ${s.muted ? 'checked' : ''} data-audio-mute></div>
      <div class="au-actions"><button class="px-btn" data-audio-close>Done</button></div>
    </div>`;
}

export class SettingsPopover {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    injectStylesOnce('au-settings-css', CSS);
    this.el = document.createElement('div');
    this.el.className = 'au-overlay';
    this.el.style.display = 'none';
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
    container.appendChild(this.el);
  }

  show(): void {
    this.el.innerHTML = settingsMarkup(audio.settings);
    const music = this.el.querySelector('[data-audio-music]') as HTMLInputElement;
    const sfxSlider = this.el.querySelector('[data-audio-sfx]') as HTMLInputElement;
    const mute = this.el.querySelector('[data-audio-mute]') as HTMLInputElement;
    music.addEventListener('input', () => audio.setMusicVol(Number(music.value)));
    sfxSlider.addEventListener('input', () => audio.setSfxVol(Number(sfxSlider.value)));
    mute.addEventListener('change', () => audio.setMuted(mute.checked));
    (this.el.querySelector('[data-audio-close]') as HTMLElement).addEventListener('click', () => this.hide());
    this.el.style.display = '';
  }

  private hide(): void {
    this.el.style.display = 'none';
  }
}
```

- [ ] **Step 5: Thread onSettings through main.ts and the five screens**

In `client/src/main.ts`:

```ts
import { SettingsPopover } from './audio/settingsPopover';
```

After `const creditsScreen = new CreditsScreen(uiOverlay);` add:

```ts
const settingsPopover = new SettingsPopover(uiOverlay);
```

Extend `navAccountHandlers` (~line 129):

```ts
const navAccountHandlers = {
  onCredits: () => { void creditsScreen.show(); },
  onLogout: () => { void handleLogout(); },
  onSettings: () => { settingsPopover.show(); },
};
```

The four sub-screens (`SkillTreeUI`, `GearScreen`, `ShopScreen`, `AdminScreen`) each call `wireNavBar(this.el, { ... })` (lines ~337/259/319/277) passing handlers built from `this.navHandlers` — add to each object literal:

```ts
      onSettings: () => this.navHandlers.onSettings(),
```

`LobbyUI` wires its nav from its own callbacks object (line ~322). Add `onOpenSettings: () => void;` to the LobbyUI callbacks interface, pass `onSettings: () => this.callbacks.onOpenSettings()` in its `wireNavBar` call, and in main.ts's `new LobbyUI(uiOverlay, {...})` add:

```ts
  onOpenSettings: () => { settingsPopover.show(); },
```

(Read each call site first; the typecheck in Step 6 catches any missed one — `NavHandlers.onSettings` is required, not optional, precisely so the compiler enforces all five.)

- [ ] **Step 6: Run tests + typecheck**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean typecheck (all five wireNavBar sites updated), all tests pass including the updated LobbyUI menu expectations.

- [ ] **Step 7: Live verification**

Dev servers up: the account dropdown on lobby/skills/gear/shop shows Settings above Sign Out; the popover opens, sliders audibly change ambience (music) and click volume (SFX) live; mute silences everything; reload the page — settings persist (localStorage `bloodmoor.audio.v1`).

- [ ] **Step 8: Commit**

```bash
git add client/src/audio/settingsPopover.ts client/src/ui/navBar.ts client/src/main.ts client/src/lobby/LobbyUI.ts client/src/skills/SkillTreeUI.ts client/src/items/GearScreen.ts client/src/items/ShopScreen.ts client/src/admin/AdminScreen.ts client/tests/LobbyUI.test.ts client/tests/settingsPopover.test.ts
git commit -m "feat(audio): settings popover with music/sfx sliders and nav-bar entry"
```

---

### Task 9: Final verification and cleanup

**Files:**
- Delete: `client/audition.html`, `client/src/audition.ts`
- No other source changes expected (fix anything verification surfaces).

- [ ] **Step 1: Full-app sound pass**

With both dev servers running, walk the entire flow in two browser windows and tick off against the spec's inventory (`docs/superpowers/specs/2026-07-31-game-audio-design.md`):
login → hall ambience on first click → character select → lobby → open gear/shop/skills (tab sounds, action sounds) → settings popover (sliders live, persist across reload) → create+join room → ready (clicks) → duel (begin hit, arena ambience + throb, casts/whoosh/impacts, hits both directions, fire-wall crackle loop stops on expiry, cooldown ticks, no-mana thud, death boom) → result (swell + gold/drop beats) → rematch countdown toms → rematch → return to lobby (hall returns) → logout.
Also verify: muting from the settings popover kills everything instantly; no console errors; dev-tools performance monitor shows CPU returning to idle on `scene: off`-equivalent states (e.g. pre-unlock).

- [ ] **Step 2: Delete the audition harness**

```bash
git rm client/audition.html client/src/audition.ts
```

- [ ] **Step 3: Full test suites + typecheck + build**

Run from the worktree root:

```bash
npm test
cd client && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: 304 root tests, all client tests, clean typecheck, successful build.
Then restore the build-dirtied dist: `git checkout -- dist` (from `client/`; verify with `git status` that `client/dist` is clean and **not staged**).

- [ ] **Step 4: Commit cleanup**

```bash
git add -A ':!client/dist'
git commit -m "chore(audio): remove dev audition harness"
```

- [ ] **Step 5: Wrap up**

Verify the full diff (`git log --oneline ad23cc3..HEAD`, `git diff ad23cc3 --stat`) matches the plan's file list. Report completion — merge target is `menu-moor` (coordinate with the session that owns it) per the base-branch decision in the spec discussion.
