import {
  TICK_RATE, ICE_RAY_RAMP_TICKS,
  ICE_RAY_DAMAGE_MIN_PER_SEC, ICE_RAY_DAMAGE_MAX_PER_SEC,
  ICE_RAY_MANA_MIN_PER_SEC, ICE_RAY_MANA_MAX_PER_SEC,
  ICE_RAY_HALF_WIDTH_MIN, ICE_RAY_HALF_WIDTH_MAX,
} from './types.js';

export type IceRayRamp = {
  damagePerTick: number;
  manaPerTick: number;
  halfWidth: number;
};

/**
 * The ray's strength at a given channel duration. Everything ramps linearly to
 * full at ICE_RAY_RAMP_TICKS and then holds — past the cap the values clamp
 * rather than continuing to climb.
 *
 * Shared rather than server-only because the client reads halfWidth to size
 * the beam it draws.
 */
export function iceRayRamp(channelTicks: number): IceRayRamp {
  const t = Math.min(Math.max(channelTicks, 0) / ICE_RAY_RAMP_TICKS, 1);
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    damagePerTick: lerp(ICE_RAY_DAMAGE_MIN_PER_SEC, ICE_RAY_DAMAGE_MAX_PER_SEC) / TICK_RATE,
    manaPerTick: lerp(ICE_RAY_MANA_MIN_PER_SEC, ICE_RAY_MANA_MAX_PER_SEC) / TICK_RATE,
    halfWidth: lerp(ICE_RAY_HALF_WIDTH_MIN, ICE_RAY_HALF_WIDTH_MAX),
  };
}
