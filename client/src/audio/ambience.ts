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
