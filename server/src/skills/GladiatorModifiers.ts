import { effectAtRank, hasKeystone,
  SPEAR_STUN_TICKS, REFLECT_WINDOW_TICKS, LEAP_RANGE, LEAP_SLOW_TICKS,
  BLOCK_DAMAGE_REDUCTION, BLOCK_MOVE_MULT } from '@arena/shared';
import type { NodeId } from '@arena/shared';

export type GladiatorSpellModifiers = {
  jab:     { damageMin: number; damageMax: number; damageMultiplier: number; executioner: boolean };
  spear:   { damageMin: number; damageMax: number; stunTicks: number };
  reflect: { windowTicks: number };
  leap:    { range: number; slowFactor: number; slowTicks: number };
  block:   { damageReduction: number; moveMult: number; riposte: boolean };
};

export function buildGladiatorModifiers(skills: Map<NodeId, number>): GladiatorSpellModifiers {
  const rank = (id: NodeId) => skills.get(id) ?? 0;
  const ks = (id: NodeId) => hasKeystone(id, rank(id));

  const heavyRank = rank('arms.heavy_thrust');
  const stunRank = rank('arms.stunning_blow');
  const crushRank = rank('arms.crushing_landing');
  const bracingRank = rank('bulwark.bracing');
  const guardRank = rank('bulwark.mobile_guard');
  const perfectRank = rank('bulwark.perfect_guard');

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
    },
    reflect: {
      windowTicks: Math.round(REFLECT_WINDOW_TICKS * (1 + effectAtRank(0.15, perfectRank))),
    },
    leap: {
      range: LEAP_RANGE,
      // Base landing slow is 30% (factor 0.7); Crushing Landing deepens it,
      // floored at a 60% slow so it never becomes a pseudo-root.
      slowFactor: Math.max(0.4, 1 - Math.min(0.6, 0.30 * (1 + effectAtRank(0.10, crushRank)))),
      slowTicks: LEAP_SLOW_TICKS,
    },
    block: {
      damageReduction: Math.min(0.75, BLOCK_DAMAGE_REDUCTION + effectAtRank(0.02, bracingRank)),
      moveMult: Math.min(0.85, BLOCK_MOVE_MULT * (1 + effectAtRank(0.08, guardRank))),
      riposte: ks('bulwark.bracing'),
    },
  };
}
