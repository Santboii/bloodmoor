// One small function per sound, each a thin wrapper over the sample bank.
// Every function keeps its original name/guard/throttle; the body is now a
// playSample call against a vendored sample instead of synthesized DSP.
// Every function no-ops until the engine is unlocked.
import { audio } from './AudioEngine';
import { playSample, startSampleLoop, onSampleDecoded, type SampleId } from './sampleBank';
import type { SpellId } from '@arena/shared';

function ready(): boolean {
  return audio.ctx !== null && audio.sfxBus !== null;
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

// ── UI ──────────────────────────────────────────────────────────────────────

/** Delegated-click classifier. Pure so it's testable without a DOM. */
export function uiSoundForClasses(className: string): 'tab' | 'click' | null {
  const classes = className.split(/\s+/);
  if (classes.includes('bm-nav-tab')) return 'tab';
  if (classes.includes('px-btn') || classes.includes('bm-acct-item')) return 'click';
  return null;
}

export function playUiClick(): void {
  if (!ready() || throttle('uiClick', 40)) return;
  playSample('ui_click');
}

export function playUiTab(): void {
  if (!ready() || throttle('uiTab', 60)) return;
  playSample('ui_tab');
}

export function playDenied(): void {
  if (!ready() || throttle('denied', 150)) return;
  playSample('denied');
}

// ── Spells ──────────────────────────────────────────────────────────────────

const CAST_SAMPLE: Record<number, SampleId> = {
  1: 'cast_fire',
  2: 'cast_firewall',
  3: 'cast_meteor',
  4: 'teleport',
  5: 'cast_bow',
  6: 'cast_bow',
  7: 'cast_rain',
  8: 'evade',
};

export function playCast(spell: SpellId): void {
  if (!ready() || throttle(`cast${spell}`, 120)) return;
  playSample(CAST_SAMPLE[spell] ?? 'cast_fire');
}

/** Projectile leaves the caster: short airy sweep. */
export function playFireballWhoosh(): void {
  if (!ready() || throttle('fbWhoosh', 90)) return;
  playSample('fireball_whoosh');
}

export function playFireballExplode(): void {
  if (!ready() || throttle('fbBoom', 90)) return;
  playSample('fireball_explode');
}

/** Thin snap for arrow spawn (throttled hard — multishot fires volleys). */
export function playArrowSpawn(): void {
  if (!ready() || throttle('arrow', 70)) return;
  playSample('arrow_shot');
}

/** Long descending sweep while the meteor falls (~0.8s). */
export function playMeteorFall(): void {
  if (!ready() || throttle('meteorFall', 200)) return;
  playSample('meteor_fall');
}

export function playMeteorImpact(): void {
  if (!ready() || throttle('meteorHit', 150)) return;
  playSample('meteor_impact');
}

/** Volley launch. */
export function playRainVolley(): void {
  if (!ready() || throttle('rainVolley', 200)) return;
  playSample('rain_volley');
}

/** Scattered thud cluster where the arrows land: four plays spread across
 * the first quarter-second. */
export function playRainImpact(): void {
  if (!ready() || throttle('rainHit', 200)) return;
  for (let i = 0; i < 4; i++) {
    playSample('rain_impact', { delayS: (i / 4) * 0.25 + Math.random() * 0.03 });
  }
}

export function playTeleport(): void {
  if (!ready() || throttle('teleport', 100)) return;
  playSample('teleport');
}

// ── Looping spell zones (fire walls) ────────────────────────────────────────
const spellLoops = new Map<string, { gain: GainNode; stop: () => void }>();
// Wall ids that tried to start before firewall_loop finished decoding (unlock
// fires synchronously, decode is promise-deferred past it) — retried once
// the sample decodes so a wall cast right after unlock isn't silent forever.
const pendingWalls = new Set<string>();
let wallDecodeHooked = false;

function tryStartWall(id: string): void {
  if (spellLoops.has(id)) return;
  const loop = startSampleLoop('firewall_loop', 'sfx', 0.25);
  if (loop) {
    spellLoops.set(id, loop);
    pendingWalls.delete(id);
  } else {
    pendingWalls.add(id);
  }
}

export function startFireWallLoop(id: string): void {
  if (!ready() || spellLoops.has(id)) return;
  if (!wallDecodeHooked) {
    wallDecodeHooked = true;
    onSampleDecoded(decodedId => {
      if (decodedId !== 'firewall_loop') return;
      for (const pendingId of [...pendingWalls]) tryStartWall(pendingId);
    });
  }
  tryStartWall(id);
}

export function stopFireWallLoop(id: string): void {
  pendingWalls.delete(id);
  spellLoops.get(id)?.stop();
  spellLoops.delete(id);
}

export function stopAllSpellLoops(): void {
  for (const id of new Set([...spellLoops.keys(), ...pendingWalls])) stopFireWallLoop(id);
}

// ── Combat feedback ─────────────────────────────────────────────────────────

/** Dull mid thump, darker than the enemy-hit crack: you got hurt. */
export function playHitTaken(): void {
  if (!ready() || throttle('hitTaken', 150)) return;
  playSample('hit_taken');
}

/** Sharper, lighter crack: your damage landed. */
export function playHitDealt(): void {
  if (!ready() || throttle('hitDealt', 150)) return;
  playSample('hit_dealt');
}

export function playDeath(): void {
  if (!ready() || throttle('death', 300)) return;
  playSample('death');
}

/** Barely-there tick when a cooldown finishes. */
export function playCooldownReady(): void {
  if (!ready() || throttle('cdReady', 120)) return;
  playSample('cooldown_ready', { gain: 0.4 });
}

/** Dead thud: cast attempted without the mana for it. */
export function playNoMana(): void {
  if (!ready() || throttle('noMana', 400)) return;
  playSample('no_mana');
}

// ── Match flow & meta stingers ──────────────────────────────────────────────

export function playResultSwell(won: boolean): void {
  if (!ready() || throttle('result', 500)) return;
  playSample(won ? 'victory' : 'defeat');
}

export function playLevelUp(): void {
  if (!ready() || throttle('levelUp', 300)) return;
  playSample('level_up');
}

export function playGoldGain(): void {
  if (!ready() || throttle('gold', 200)) return;
  playSample('gold_gain');
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

/** Single sting sample, pitched up with rarity. */
export function playDropSting(rarity: string): void {
  if (!ready() || throttle('drop', 300)) return;
  playSample('drop_sting', { rate: Math.pow(2, dropStingSemitones(rarity) / 12) });
}

export function playDuelBegin(): void {
  if (!ready() || throttle('duelBegin', 500)) return;
  playSample('duel_begin');
}

export function playCountdownTick(): void {
  if (!ready() || throttle('cdTick', 300)) return;
  playSample('countdown');
}

/** Chat message / player joined. */
export function playChatTick(): void {
  if (!ready() || throttle('chat', 150)) return;
  playSample('chat');
}

export function playPlayerJoin(): void {
  if (!ready() || throttle('join', 200)) return;
  playSample('player_join');
}

// ── Items & skills ──────────────────────────────────────────────────────────

export function playEquip(): void {
  if (!ready() || throttle('equip', 100)) return;
  playSample('equip');
}

export function playUnequip(): void {
  if (!ready() || throttle('unequip', 100)) return;
  playSample('unequip');
}

export function playSell(): void {
  if (!ready() || throttle('sell', 150)) return;
  playSample('sell');
}

export function playPurchase(): void {
  if (!ready() || throttle('purchase', 150)) return;
  playSample('purchase');
}

export function playSkillSpend(): void {
  if (!ready() || throttle('skillSpend', 150)) return;
  playSample('skill_spend');
}
