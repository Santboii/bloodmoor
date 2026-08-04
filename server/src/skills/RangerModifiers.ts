import { ARROW_SPEED, EVADE_RANGE, effectAtRank, deriveElement, hasKeystone, WITHERING_VENOM_MANA_DRAIN } from '@arena/shared';
import {
  TRAP_DAMAGE_MIN, TRAP_DAMAGE_MAX, TRAP_TRIGGER_RADIUS, TRAP_BLAST_RADIUS,
  TRAP_BASE_CAP, TRAP_ARM_TICKS, HAMSTRING_SLOW_FACTOR, HAMSTRING_SLOW_TICKS,
  CALTROPS_RADIUS, CALTROPS_SLOW_FACTOR,
  DEADFALL_DAMAGE_MIN, DEADFALL_DAMAGE_MAX, DEADFALL_TRIGGER_RADIUS,
  DEADFALL_BLAST_RADIUS, DEADFALL_CHAIN_RADIUS,
} from '@arena/shared';
import type { NodeId, ArrowElement } from '@arena/shared';

export type ElementType = ArrowElement;

export type ArrowModifiers = {
  speed: number;
  damageMin: number;
  damageMax: number;
  homing: number;
  guidedRedirects: number;
  homingTickReduction: number;
  relentless: boolean;
  predator: boolean;
};

export type MultishotModifiers = {
  arrowCount: number;
  damageMin: number;
  damageMax: number;
  echoVolley: boolean;
};

export type RainModifiers = {
  durationMultiplier: number;
  damageMultiplier: number;
  radiusMultiplier: number;
  stormcall: boolean;
  exposed: boolean;
  twinStorm: boolean;
};

export type EvadeModifiers = {
  range: number;
  combatRoll: boolean;
  shadowstep: boolean;
  cooldownMultiplier: number;
  secondWind: boolean;
};

export type BurnModifiers = {
  damagePerSecond: number;
  duration: number;
  ignite: boolean;
};

export type FreezeModifiers = {
  slowPercent: number;
  duration: number;
  deepFreeze: boolean;
};

export type PoisonModifiers = {
  damagePerSecond: number;
  duration: number;
  manaRegenReduction: number;
  manaDrainPerSecond: number;
};

export type ElementalModifiers = {
  burn: BurnModifiers;
  freeze: FreezeModifiers;
  poison: PoisonModifiers;
};

export type TrapModifiers = {
  damageMin: number;
  damageMax: number;
  triggerRadius: number;
  blastRadius: number;
  maxArmed: number;
  armTicks: number;
  shardCount: number;
  shardsHome: boolean;      // Scattershot
  slowFactor: number;       // 1 when Hamstring is unskilled
  slowTicks: number;
  hamstring: boolean;
  countermeasure: boolean;
  cooldownMultiplier: number;  // Field Kit — applies to all three hunter spells
  rearm: boolean;
};

export type CaltropsModifiers = {
  radius: number;
  slowFactor: number;
  damageMultiplier: number;
  mire: boolean;
  secondHandful: boolean;
  bleedingGround: boolean;
};

export type DeadfallModifiers = {
  damageMin: number;
  damageMax: number;
  triggerRadius: number;
  blastRadius: number;
  chainRadius: number;
  chainDamageMultiplier: number;
  roots: boolean;
};

export type RangerSpellModifiers = {
  arrow: ArrowModifiers;
  multishot: MultishotModifiers;
  rain: RainModifiers;
  evade: EvadeModifiers;
  element: ElementType;
  elemental: ElementalModifiers;
  trap: TrapModifiers;
  caltrops: CaltropsModifiers;
  deadfall: DeadfallModifiers;
};

export function buildRangerModifiers(skills: Map<NodeId, number>): RangerSpellModifiers {
  const rank = (id: NodeId) => skills.get(id) ?? 0;
  const has = (id: NodeId) => rank(id) > 0;
  const ks = (id: NodeId) => hasKeystone(id, rank(id));

  let homing = 0;
  if (has('archer.guided')) homing = 1;

  const guidedRank = rank('archer.guided');
  const homingRank = rank('archer.homing');
  const barrageRank = rank('archer.barrage');
  const sustainedRank = rank('archer.sustained_rain');
  const piercingRank = rank('archer.piercing_rain');
  const wideRank = rank('archer.wide_rain');
  const acrobaticsRank = rank('archer_utility.acrobatics');

  // Highest-effective-rank wins (burn > freeze > poison tiebreak) — skills
  // here is the match's merged tree + item talent ranks, so an item's
  // higher-ranked off-tree element can outrank a lower tree rank.
  const element = deriveElement(skills);

  const burnRank = rank('archer.burn');
  const freezeRank = rank('archer.freeze');
  const poisonRank = rank('archer.poison');

  const serratedRank = rank('hunter.serrated_spikes');
  const cacheRank    = rank('hunter.trap_cache');
  const tripwireRank = rank('hunter.tripwire');
  const shrapnelRank = rank('hunter.shrapnel');
  const barbsRank    = rank('hunter.rusted_barbs');
  const scatterRank  = rank('hunter.wide_scatter');
  const wireRank     = rank('hunter.barbed_wire');
  const jawsRank     = rank('hunter.heavy_jaws');
  const cascadeRank  = rank('hunter.cascade');
  const fieldKitRank = rank('hunter.field_kit');

  const trapDamageMult  = serratedRank > 0 ? 1 + effectAtRank(0.08, serratedRank) : 1;
  const triggerRadius   = TRAP_TRIGGER_RADIUS * (tripwireRank > 0 ? 1 + effectAtRank(0.15, tripwireRank) : 1);
  const deadfallDmgMult = jawsRank > 0 ? 1 + effectAtRank(0.10, jawsRank) : 1;
  // Slow factor is a movement multiplier, so ranks push it DOWN. Floor it so
  // stacked item ranks can never produce a de-facto root — the tree is allowed
  // exactly one root, on Maimed.
  const caltropsSlow = Math.max(0.15, CALTROPS_SLOW_FACTOR - (barbsRank > 0 ? effectAtRank(0.10, barbsRank) : 0));

  return {
    arrow: {
      speed: ARROW_SPEED,
      damageMin: 60,
      damageMax: 90,
      homing,
      guidedRedirects: guidedRank,
      homingTickReduction: homingRank > 0 ? Math.floor(effectAtRank(6, homingRank)) : 0,
      relentless: ks('archer.guided'),
      predator: ks('archer.homing'),
    },
    multishot: {
      arrowCount: 3 + (barrageRank > 0 ? Math.floor(effectAtRank(2, barrageRank)) : 0),
      damageMin: 40,
      damageMax: 60,
      echoVolley: ks('archer.barrage'),
    },
    rain: {
      durationMultiplier: sustainedRank > 0 ? 1 + effectAtRank(0.35, sustainedRank) : 1,
      damageMultiplier: piercingRank > 0 ? 1 + effectAtRank(0.25, piercingRank) : 1,
      radiusMultiplier: wideRank > 0 ? 1 + effectAtRank(0.15, wideRank) : 1,
      stormcall: ks('archer.sustained_rain'),
      exposed: ks('archer.piercing_rain'),
      twinStorm: ks('archer.wide_rain'),
    },
    evade: {
      range: EVADE_RANGE,
      combatRoll: has('archer_utility.combat_roll'),
      shadowstep: has('archer_utility.shadowstep'),
      cooldownMultiplier: acrobaticsRank > 0 ? 1 - effectAtRank(0.10, acrobaticsRank) : 1,
      secondWind: ks('archer_utility.acrobatics'),
    },
    element,
    elemental: {
      burn: {
        damagePerSecond: 10 + (burnRank > 0 ? effectAtRank(12, burnRank) : 0),
        duration: 3,
        ignite: ks('archer.burn'),
      },
      freeze: {
        slowPercent: 0.30 + (freezeRank > 0 ? effectAtRank(0.09, freezeRank) : 0),
        duration: 2,
        deepFreeze: ks('archer.freeze'),
      },
      poison: {
        damagePerSecond: 4 + (poisonRank > 0 ? effectAtRank(7, poisonRank) : 0),
        duration: 5,
        manaRegenReduction: 0.30 + (poisonRank > 0 ? effectAtRank(0.07, poisonRank) : 0),
        manaDrainPerSecond: ks('archer.poison') ? WITHERING_VENOM_MANA_DRAIN : 0,
      },
    },
    trap: {
      damageMin: TRAP_DAMAGE_MIN * trapDamageMult,
      damageMax: TRAP_DAMAGE_MAX * trapDamageMult,
      triggerRadius,
      blastRadius: TRAP_BLAST_RADIUS,
      // Count-based: one extra armed trap per rank, no diminishing curve —
      // effectAtRank's rank^0.7 floors small integers and would make rank 2 a
      // no-op, the same reason FIRE_COUNT_RANKS exists.
      maxArmed: TRAP_BASE_CAP + cacheRank,
      armTicks: ks('hunter.trap_cache') ? 0 : TRAP_ARM_TICKS,
      shardCount: shrapnelRank > 0 ? 2 + shrapnelRank : 0,
      shardsHome: ks('hunter.shrapnel'),
      slowFactor: ks('hunter.serrated_spikes') ? HAMSTRING_SLOW_FACTOR : 1,
      slowTicks: ks('hunter.serrated_spikes') ? HAMSTRING_SLOW_TICKS : 0,
      hamstring: ks('hunter.serrated_spikes'),
      countermeasure: ks('hunter.tripwire'),
      cooldownMultiplier: fieldKitRank > 0 ? 1 - effectAtRank(0.08, fieldKitRank) : 1,
      rearm: ks('hunter.field_kit'),
    },
    caltrops: {
      radius: CALTROPS_RADIUS * (scatterRank > 0 ? 1 + effectAtRank(0.20, scatterRank) : 1),
      slowFactor: caltropsSlow,
      damageMultiplier: wireRank > 0 ? 1 + effectAtRank(0.08, wireRank) : 1,
      mire: ks('hunter.rusted_barbs'),
      secondHandful: ks('hunter.wide_scatter'),
      bleedingGround: ks('hunter.barbed_wire'),
    },
    deadfall: {
      damageMin: DEADFALL_DAMAGE_MIN * deadfallDmgMult,
      damageMax: DEADFALL_DAMAGE_MAX * deadfallDmgMult,
      triggerRadius: DEADFALL_TRIGGER_RADIUS,
      blastRadius: DEADFALL_BLAST_RADIUS,
      chainRadius: ks('hunter.cascade') ? Infinity : DEADFALL_CHAIN_RADIUS,
      chainDamageMultiplier: cascadeRank > 0 ? 1 + effectAtRank(0.15, cascadeRank) : 1,
      roots: ks('hunter.heavy_jaws'),
    },
  };
}
