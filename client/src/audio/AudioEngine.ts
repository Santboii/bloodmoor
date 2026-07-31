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
      // Safari/iOS can hand back a context already 'suspended' despite this
      // running inside a user gesture, and can suspend a running context
      // when the tab backgrounds without ever auto-resuming it.
      if (this.ctx_.state === 'suspended') void this.ctx_.resume();
      window.addEventListener('pointerdown', () => {
        if (this.ctx_ && this.ctx_.state === 'suspended') void this.ctx_.resume();
      }, true);
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
    const t0 = this.ctx_.currentTime;
    const t = t0 + VOLUME_RAMP_S;
    this.master.gain.setValueAtTime(this.master.gain.value, t0);
    this.master.gain.linearRampToValueAtTime(this.settings.muted ? 0 : 1, t);
    this.music_.gain.setValueAtTime(this.music_.gain.value, t0);
    this.music_.gain.linearRampToValueAtTime(volToGain(this.settings.musicVol), t);
    this.sfx_.gain.setValueAtTime(this.sfx_.gain.value, t0);
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
