import { ARROW_SPEED, EVADE_RANGE, effectAtRank, deriveElement, hasKeystone, WITHERING_VENOM_MANA_DRAIN } from '@arena/shared';
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

export type RangerSpellModifiers = {
  arrow: ArrowModifiers;
  multishot: MultishotModifiers;
  rain: RainModifiers;
  evade: EvadeModifiers;
  element: ElementType;
  elemental: ElementalModifiers;
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
  };
}
