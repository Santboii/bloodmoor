// Sampled ambience: a few always-running loop layers whose gains crossfade
// per scene. Layers at target 0 are fully stopped after the fade so idle
// scenes cost no CPU. Routed to the music bus (the "Music" slider governs
// it).
import { audio } from './AudioEngine';
import { startSampleLoop, onSampleDecoded, type SampleId } from './sampleBank';

export type SceneId = 'hall' | 'arena' | 'off';
export type LayerId = 'base' | 'torch' | 'wind' | 'pulse';

const FADE_S = 1.5;

/** Pure scene → per-layer gain map (unit gains, pre-bus). */
export function layerTargets(scene: SceneId, dueling: boolean): Record<LayerId, number> {
  switch (scene) {
    case 'hall':
      return { base: 0.9, torch: 0.6, wind: 0, pulse: 0 };
    case 'arena':
      return { base: 0, torch: 0, wind: 0.8, pulse: dueling ? 0.5 : 0 };
    case 'off':
      return { base: 0, torch: 0, wind: 0, pulse: 0 };
  }
}

type Layer = {
  gain: GainNode;
  stop: () => void;
};

let desired: SceneId = 'off';
let dueling = false;
const layers = new Map<LayerId, Layer>();
// Guards the stop-after-fade timer against a scene change mid-fade.
const generations = new Map<LayerId, number>();
let unlockHooked = false;
// Unlock can fire before a layer's sample has finished decoding (decode is
// promise-deferred past the synchronous onUnlock callback) — startLayer
// returns null in that case and the layer never gets into `layers`, so
// without this it would stay silent for the rest of the session since
// nothing else re-runs apply(). Re-apply as soon as the specific sample a
// layer needs decodes so a layer that raced the decode gets a second chance.
const LAYER_SAMPLE_IDS: ReadonlySet<SampleId> = new Set(['hall_base', 'hall_torch', 'arena_wind']);
let decodeHooked = false;

export function setScene(scene: SceneId): void {
  desired = scene;
  if (!unlockHooked) {
    unlockHooked = true;
    audio.onUnlock(() => apply());
  }
  if (!decodeHooked) {
    decodeHooked = true;
    onSampleDecoded(id => { if (LAYER_SAMPLE_IDS.has(id)) apply(); });
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
      const layer = startLayer(id);
      if (layer) layers.set(id, layer);
    }
    const layer = layers.get(id);
    if (!layer) continue;
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

function startLayer(id: LayerId): Layer | null {
  switch (id) {
    case 'base': return startSampleLoop('hall_base', 'music', 0);
    case 'torch': return startSampleLoop('hall_torch', 'music', 0);
    case 'wind': return startSampleLoop('arena_wind', 'music', 0);
    // Deep rumble: the hall-base loop slowed way down, not a distinct file.
    case 'pulse': return startSampleLoop('hall_base', 'music', 0, 0.55);
  }
}
