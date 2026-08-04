import { effectAtRank, hasKeystone, countAtRank,
  SPEAR_STUN_TICKS, REFLECT_WINDOW_TICKS, LEAP_RANGE, LEAP_SLOW_TICKS,
  BLOCK_DAMAGE_REDUCTION, BLOCK_MOVE_MULT,
  BLEED_BASE_DPS, WAR_CRY_RADIUS, WAR_CRY_SLOW_FACTOR, WAR_CRY_SLOW_TICKS,
  DUST_RADIUS, DUST_DURATION_TICKS, FLURRY_HITS, IRON_SKIN_HP_PER_RANK,
  HARPOON_DAMAGE_MIN, HARPOON_DAMAGE_MAX, FLURRY_HIT_DAMAGE_MIN, FLURRY_HIT_DAMAGE_MAX } from '@arena/shared';
import type { NodeId } from '@arena/shared';

export type GladiatorSpellModifiers = {
  jab:     { damageMin: number; damageMax: number; damageMultiplier: number; executioner: boolean };
  spear:   { damageMin: number; damageMax: number; stunTicks: number; bleedDps: number; hemorrhage: boolean };
  reflect: { windowTicks: number; mirrorGuard: boolean };
  leap:    { range: number; slowFactor: number; slowTicks: number; seismicSlam: boolean; cooldownMultiplier: number; skirmisher: boolean };
  block:   { damageReduction: number; moveMult: number; riposte: boolean; unstoppableGuard: boolean; juggernaut: boolean };
  warCry:  { radius: number; slowFactor: number; slowTicks: number; rally: boolean };
  harpoon: { damageMin: number; damageMax: number; cooldownMultiplier: number; skewer: boolean };
  dust:    { radius: number; durationTicks: number; vanish: boolean };
  flurry:  { hits: number; damageMin: number; damageMax: number; bloodsong: boolean };
  stun:    { concussion: boolean };
  ironSkinHp: number;
};

export function buildGladiatorModifiers(skills: Map<NodeId, number>): GladiatorSpellModifiers {
  const rank = (id: NodeId) => skills.get(id) ?? 0;
  const ks = (id: NodeId) => hasKeystone(id, rank(id));

  const heavyRank = rank('arms.heavy_thrust');
  const stunRank = rank('arms.stunning_blow');
  const crushRank = rank('arms.crushing_landing');
  const soaringRank = rank('gladiator_utility.soaring_reach');
  const momentumRank = rank('gladiator_utility.momentum');
  const bracingRank = rank('bulwark.bracing');
  const guardRank = rank('bulwark.mobile_guard');
  const perfectRank = rank('bulwark.perfect_guard');
  const serratedRank = rank('arms.serrated_edge');
  const extRank = rank('arms.extended_flurry');
  const reelRank = rank('arms.quick_reel');
  const presenceRank = rank('bulwark.intimidating_presence');
  const sandRank = rank('bulwark.sandstorm');
  const ironRank = rank('bulwark.iron_skin');

  return {
    jab: {
      damageMin: 75,
      damageMax: 100,
      damageMultiplier: 1 + effectAtRank(0.08, heavyRank),
      executioner: ks('arms.heavy_thrust'),
    },
    spear: {
      damageMin: 70,
      damageMax: 100,
      stunTicks: Math.round(SPEAR_STUN_TICKS * (1 + effectAtRank(0.15, stunRank))),
      bleedDps: serratedRank > 0 ? BLEED_BASE_DPS + effectAtRank(4, serratedRank) : 0,
      hemorrhage: ks('arms.serrated_edge'),
    },
    reflect: {
      windowTicks: Math.round(REFLECT_WINDOW_TICKS * (1 + effectAtRank(0.15, perfectRank))),
      mirrorGuard: ks('bulwark.perfect_guard'),
    },
    leap: {
      range: LEAP_RANGE * (1 + effectAtRank(0.08, soaringRank)),
      // Base landing slow is 30% (factor 0.7); Crushing Landing deepens it,
      // floored at a 60% slow so it never becomes a pseudo-root.
      slowFactor: Math.max(0.4, 1 - Math.min(0.6, 0.30 * (1 + effectAtRank(0.10, crushRank)))),
      slowTicks: LEAP_SLOW_TICKS,
      seismicSlam: ks('arms.crushing_landing'),
      cooldownMultiplier: 1 - effectAtRank(0.10, momentumRank),
      skirmisher: ks('gladiator_utility.momentum'),
    },
    block: {
      damageReduction: Math.min(0.75, BLOCK_DAMAGE_REDUCTION + effectAtRank(0.02, bracingRank)),
      moveMult: Math.min(0.85, BLOCK_MOVE_MULT * (1 + effectAtRank(0.08, guardRank))),
      riposte: ks('bulwark.bracing'),
      unstoppableGuard: ks('bulwark.mobile_guard'),
      juggernaut: ks('bulwark.iron_skin'),
    },
    warCry: {
      radius: WAR_CRY_RADIUS,
      slowFactor: Math.max(0.5, WAR_CRY_SLOW_FACTOR - effectAtRank(0.12, presenceRank) * 0.5),
      slowTicks: Math.round(WAR_CRY_SLOW_TICKS * (1 + effectAtRank(0.12, presenceRank))),
      rally: ks('bulwark.intimidating_presence'),
    },
    harpoon: {
      damageMin: HARPOON_DAMAGE_MIN,
      damageMax: HARPOON_DAMAGE_MAX,
      cooldownMultiplier: 1 - effectAtRank(0.10, reelRank),
      skewer: ks('arms.quick_reel'),
    },
    dust: {
      radius: DUST_RADIUS * (1 + effectAtRank(0.15, sandRank)),
      durationTicks: Math.round(DUST_DURATION_TICKS * (1 + effectAtRank(0.15, sandRank))),
      vanish: ks('bulwark.sandstorm'),
    },
    flurry: {
      hits: FLURRY_HITS + countAtRank('arms.extended_flurry', extRank),
      damageMin: FLURRY_HIT_DAMAGE_MIN,
      damageMax: FLURRY_HIT_DAMAGE_MAX,
      bloodsong: ks('arms.extended_flurry'),
    },
    stun: {
      concussion: ks('arms.stunning_blow'),
    },
    ironSkinHp: IRON_SKIN_HP_PER_RANK * ironRank,
  };
}
