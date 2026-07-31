// Vendored-sample bank: manifest + fetch/decode + one-shot and looping
// playback. Files fetch eagerly (fire-and-forget) so they're already in
// memory by the time the engine unlocks; decoding needs an AudioContext so
// it happens on `audio.onUnlock`. Missing/failed samples degrade to silence
// with exactly one console.warn per id — audio must never throw into game
// code. Module top-level stays side-effect-free for window/document/
// AudioContext: Vitest imports this file in a node environment, so all
// fetch/decode work is deferred to initSampleBank(), never run at import time.
import { audio } from './AudioEngine';

export type SampleId =
  | 'ui_click' | 'ui_tab' | 'denied' | 'player_join' | 'cooldown_ready' | 'no_mana'
  | 'chat' | 'purchase' | 'sell' | 'gold_gain' | 'equip' | 'unequip' | 'skill_spend'
  | 'drop_sting' | 'cast_fire' | 'cast_firewall' | 'cast_meteor' | 'cast_rain' | 'cast_bow'
  | 'fireball_whoosh' | 'fireball_explode' | 'meteor_fall' | 'meteor_impact' | 'arrow_shot'
  | 'rain_volley' | 'rain_impact' | 'evade' | 'teleport' | 'hit_taken' | 'hit_dealt' | 'death'
  | 'countdown' | 'duel_begin' | 'victory' | 'defeat' | 'level_up' | 'firewall_loop'
  | 'hall_base' | 'hall_torch' | 'arena_wind';

type ManifestEntry = { path: string; gain?: number; loop?: boolean };

export const SAMPLE_MANIFEST: Record<SampleId, ManifestEntry> = {
  ui_click: { path: '/assets/audio/sfx/ui_click.mp3' },
  ui_tab: { path: '/assets/audio/sfx/ui_tab.mp3' },
  denied: { path: '/assets/audio/sfx/denied.mp3' },
  player_join: { path: '/assets/audio/sfx/player_join.mp3' },
  cooldown_ready: { path: '/assets/audio/sfx/cooldown_ready.mp3' },
  no_mana: { path: '/assets/audio/sfx/no_mana.mp3' },
  chat: { path: '/assets/audio/sfx/chat.mp3' },
  purchase: { path: '/assets/audio/sfx/purchase.mp3' },
  sell: { path: '/assets/audio/sfx/sell.mp3' },
  gold_gain: { path: '/assets/audio/sfx/gold_gain.mp3' },
  equip: { path: '/assets/audio/sfx/equip.mp3' },
  unequip: { path: '/assets/audio/sfx/unequip.mp3' },
  skill_spend: { path: '/assets/audio/sfx/skill_spend.mp3' },
  drop_sting: { path: '/assets/audio/sfx/drop_sting.mp3' },
  cast_fire: { path: '/assets/audio/sfx/cast_fire.mp3' },
  cast_firewall: { path: '/assets/audio/sfx/cast_firewall.mp3' },
  cast_meteor: { path: '/assets/audio/sfx/cast_meteor.mp3' },
  cast_rain: { path: '/assets/audio/sfx/cast_rain.mp3' },
  cast_bow: { path: '/assets/audio/sfx/cast_bow.mp3' },
  fireball_whoosh: { path: '/assets/audio/sfx/fireball_whoosh.mp3' },
  fireball_explode: { path: '/assets/audio/sfx/fireball_explode.mp3' },
  meteor_fall: { path: '/assets/audio/sfx/meteor_fall.mp3' },
  meteor_impact: { path: '/assets/audio/sfx/meteor_impact.mp3' },
  arrow_shot: { path: '/assets/audio/sfx/arrow_shot.mp3' },
  rain_volley: { path: '/assets/audio/sfx/rain_volley.mp3' },
  rain_impact: { path: '/assets/audio/sfx/rain_impact.mp3' },
  evade: { path: '/assets/audio/sfx/evade.mp3' },
  teleport: { path: '/assets/audio/sfx/teleport.mp3' },
  hit_taken: { path: '/assets/audio/sfx/hit_taken.mp3' },
  hit_dealt: { path: '/assets/audio/sfx/hit_dealt.mp3' },
  death: { path: '/assets/audio/sfx/death.mp3' },
  countdown: { path: '/assets/audio/sfx/countdown.mp3' },
  duel_begin: { path: '/assets/audio/sfx/duel_begin.mp3' },
  victory: { path: '/assets/audio/sfx/victory.mp3' },
  defeat: { path: '/assets/audio/sfx/defeat.mp3' },
  level_up: { path: '/assets/audio/sfx/level_up.mp3' },
  firewall_loop: { path: '/assets/audio/sfx/firewall_loop.mp3', loop: true },
  hall_base: { path: '/assets/audio/amb/hall_base.mp3', loop: true },
  hall_torch: { path: '/assets/audio/amb/hall_torch.mp3', loop: true },
  arena_wind: { path: '/assets/audio/amb/arena_wind.mp3', loop: true },
};

const raw = new Map<SampleId, ArrayBuffer>();
const buffers = new Map<SampleId, AudioBuffer>();
const decoding = new Set<SampleId>();
const warned = new Set<SampleId>();
let started = false;

function warnMissing(id: SampleId): void {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`sampleBank: missing/undecoded sample "${id}"`);
}

function tryDecode(id: SampleId): void {
  const ctx = audio.ctx;
  const data = raw.get(id);
  if (!ctx || !data || buffers.has(id) || decoding.has(id)) return;
  decoding.add(id);
  // decodeAudioData detaches/consumes the buffer, so hand it a copy — the
  // raw bytes stay available in case decode needs retrying.
  ctx.decodeAudioData(data.slice(0))
    .then(buf => { buffers.set(id, buf); })
    .catch(() => { warnMissing(id); })
    .finally(() => { decoding.delete(id); });
}

/** Fire-and-forget fetch of every manifest path, decoding each into an
 * AudioBuffer once the engine unlocks. Safe to call before or after unlock;
 * safe to call more than once (subsequent calls no-op). */
export function initSampleBank(): void {
  if (started) return;
  started = true;
  const ids = Object.keys(SAMPLE_MANIFEST) as SampleId[];
  for (const id of ids) {
    fetch(SAMPLE_MANIFEST[id].path)
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.arrayBuffer(); })
      .then(buf => { raw.set(id, buf); tryDecode(id); })
      .catch(() => { warnMissing(id); });
  }
  audio.onUnlock(() => { for (const id of ids) tryDecode(id); });
}

type Bus = 'sfx' | 'music';

function busNode(bus: Bus): GainNode | null {
  return bus === 'music' ? audio.musicBus : audio.sfxBus;
}

/** Play a decoded sample once on the given bus. No-ops (plus one warn per
 * missing id) if the engine isn't unlocked or the sample never decoded. */
export function playSample(
  id: SampleId,
  opts: { rate?: number; rateJitter?: number; gain?: number; bus?: Bus; delayS?: number } = {},
): void {
  const ctx = audio.ctx;
  const out = busNode(opts.bus ?? 'sfx');
  if (!ctx || !out) return;
  const buf = buffers.get(id);
  if (!buf) { warnMissing(id); return; }
  const manifest = SAMPLE_MANIFEST[id];
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const jitterPct = opts.rateJitter ?? 0.04;
  const baseRate = opts.rate ?? 1;
  src.playbackRate.value = baseRate * (1 + (Math.random() * 2 - 1) * jitterPct);
  const gain = ctx.createGain();
  gain.gain.value = opts.gain ?? manifest.gain ?? 1;
  src.connect(gain);
  gain.connect(out);
  src.start(ctx.currentTime + (opts.delayS ?? 0));
  src.onended = () => { src.disconnect(); gain.disconnect(); };
}

/** Start a looping decoded sample on the given bus at an optional playback
 * rate (e.g. slowed down for a deep-rumble variant). Returns a handle whose
 * `stop()` fades the gain out before disconnecting, or null (plus one warn
 * per missing id) if the engine isn't unlocked or the sample never decoded. */
export function startSampleLoop(
  id: SampleId,
  bus: Bus,
  initialGain: number,
  rate = 1,
): { gain: GainNode; stop(): void } | null {
  const ctx = audio.ctx;
  const out = busNode(bus);
  if (!ctx || !out) return null;
  const buf = buffers.get(id);
  if (!buf) { warnMissing(id); return null; }
  const gain = ctx.createGain();
  gain.gain.value = initialGain;
  gain.connect(out);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.playbackRate.value = rate;
  src.connect(gain);
  src.start(ctx.currentTime);
  let stopped = false;
  return {
    gain,
    stop: () => {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0.0001, t + 0.25);
      window.setTimeout(() => {
        try { src.stop(); } catch { /* already stopped */ }
        src.disconnect();
        gain.disconnect();
      }, 300);
    },
  };
}
