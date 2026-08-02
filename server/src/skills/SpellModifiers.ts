import {
  FIREBALL_SPEED, FIREBALL_RADIUS,
  effectAtRank, teleportMaxRange,
  HELLFIRE_RADIUS_RATIO, HELLFIRE_DAMAGE_RATIO, HELLFIRE_SPEED_RATIO,
  ICEBOLT_SPEED, ICEBOLT_DAMAGE_MIN, ICEBOLT_DAMAGE_MAX,
  ICEBOLT_CHILL_FACTOR, ICEBOLT_CHILL_TICKS,
  FROZEN_ORB_SHARDS_PER_VOLLEY, FROZEN_ORB_SHARD_DAMAGE_MIN, FROZEN_ORB_SHARD_DAMAGE_MAX,
} from '@arena/shared';

export type FireballModifiers = {
  speed: number;
  radius: number;
  blastRadius: number;
  damageMin: number;
  damageMax: number;
  homingStrength: number;
  split: number;
};

export type FirewallModifiers = {
  durationMultiplier: number;
  damageMultiplier: number;
  lengthMultiplier: number;
  widthMultiplier: number;
};

export type MeteorModifiers = {
  hidden: boolean;
  moltenImpact: boolean;
  radiusMultiplier: number;
};

export type TeleportModifiers = {
  maxRange: number;
  etherealForm: boolean;
  phantomStep: boolean;
};

export type IceBoltModifiers = {
  speed: number;
  damageMin: number;
  damageMax: number;
  pierce: number;
  splinters: number;
  chillFactor: number;
  chillTicks: number;
  impaler: boolean;
  flashFreeze: boolean;
  frostbite: number;
  rimeheart: boolean;
  flechette: boolean;
};

export type BlizzardModifiers = {
  durationMultiplier: number;
  radiusMultiplier: number;
  damageMultiplier: number;
  permafrost: boolean;
  absoluteZero: boolean;
  blindingSquall: boolean;
};

export type FrozenOrbModifiers = {
  speedMultiplier: number;
  lifetimeMultiplier: number;
  shardsPerVolley: number;
  damageMin: number;
  damageMax: number;
  detonateOnExpiry: boolean;
  absoluteCold: boolean;
};

export type SpellModifiers = {
  fireball: FireballModifiers;
  firewall: FirewallModifiers;
  meteor: MeteorModifiers;
  teleport: TeleportModifiers;
  iceBolt: IceBoltModifiers;
  blizzard: BlizzardModifiers;
  frozenOrb: FrozenOrbModifiers;
};

export function buildSpellModifiers(skills: Map<string, number>): SpellModifiers {
  const rank = (id: string) => skills.get(id) ?? 0;

  const veRank = rank('fire.volatile_ember');
  const hfRank = rank('fire.hellfire');

  let fbRadius = FIREBALL_RADIUS;
  let fbBlastRadius = FIREBALL_RADIUS;
  let fbSpeed  = FIREBALL_SPEED;
  let fbDmgMin = 80;
  let fbDmgMax = 120;

  if (hfRank > 0) {
    const e = effectAtRank(1.0, hfRank);
    fbRadius *= 1 + HELLFIRE_RADIUS_RATIO * e;
    fbBlastRadius *= 1 + HELLFIRE_RADIUS_RATIO * e;
    fbSpeed  *= 1 - HELLFIRE_SPEED_RATIO * e;
    fbDmgMin *= 1 + HELLFIRE_DAMAGE_RATIO * e;
    fbDmgMax *= 1 + HELLFIRE_DAMAGE_RATIO * e;
  }
  if (veRank > 0) fbBlastRadius *= 1 + effectAtRank(0.4, veRank);

  const sfRank = rank('fire.seeking_flame');
  const pyRank = rank('fire.pyroclasm');

  // Frost tree. Bitter Chill's single baseEffect (0.05) drives both halves of
  // "stronger and lasts longer": subtracted from the factor (floored at 0.4
  // so no stack of ranks approaches a root), added as a duration multiplier.
  const bcRank = rank('frost.bitter_chill');
  const ilRank = rank('frost.ice_lance');
  const frostbiteRank = rank('frost.frostbite');
  const siRank = rank('frost.splintering_ice');
  const lwRank = rank('frost.lingering_winter');
  const dcRank = rank('frost.deepening_cold');
  const woRank = rank('frost.whiteout');
  const ssRank = rank('frost.shard_storm');
  const gdRank = rank('frost.glacial_drift');
  const cmRank = rank('frost.cold_mastery');

  const bcEffect = bcRank > 0 ? effectAtRank(0.05, bcRank) : 0;
  const chillFactor = Math.max(0.4, ICEBOLT_CHILL_FACTOR - bcEffect);
  const chillTicks = Math.round(ICEBOLT_CHILL_TICKS * (1 + bcEffect));

  // Cold Mastery is tree-wide: one multiplier lifts Ice Bolt, Blizzard, and
  // the orb together.
  const coldMasteryMult = 1 + (cmRank > 0 ? effectAtRank(0.06, cmRank) : 0);

  // Glacial Drift's single baseEffect (0.12) drives both halves of "travels
  // slower and lives longer": subtracted from speed, added to lifetime.
  const gdEffect = gdRank > 0 ? effectAtRank(0.12, gdRank) : 0;

  return {
    fireball: {
      speed:          fbSpeed,
      radius:         fbRadius,
      blastRadius:    fbBlastRadius,
      damageMin:      fbDmgMin,
      damageMax:      fbDmgMax,
      homingStrength: sfRank > 0 ? 12 * Math.pow(sfRank, 1.65) : 0,
      split:          pyRank > 0 ? Math.floor(effectAtRank(1, pyRank)) : 0,
    },
    firewall: {
      durationMultiplier: rank('fire.enduring_flames') > 0  ? 1 + effectAtRank(0.10, rank('fire.enduring_flames'))  : 1,
      damageMultiplier:   rank('fire.searing_heat') > 0     ? 1 + effectAtRank(0.08, rank('fire.searing_heat'))     : 1,
      lengthMultiplier:   rank('fire.inferno_expanse') > 0  ? 1 + effectAtRank(0.25, rank('fire.inferno_expanse'))  : 1,
      widthMultiplier:    rank('fire.inferno_expanse') > 0  ? 1 + effectAtRank(0.25, rank('fire.inferno_expanse'))  : 1,
    },
    meteor: {
      hidden:           rank('fire.blind_strike') > 0,
      moltenImpact:     rank('fire.molten_impact') > 0,
      radiusMultiplier: rank('fire.cataclysm') > 0 ? 1 + effectAtRank(0.15, rank('fire.cataclysm')) : 1,
    },
    teleport: {
      maxRange:     teleportMaxRange(rank('utility.phase_shift')),
      etherealForm: rank('utility.ethereal_form') > 0,
      phantomStep:  rank('utility.phantom_step') > 0,
    },
    iceBolt: {
      speed:      ICEBOLT_SPEED,
      damageMin:  ICEBOLT_DAMAGE_MIN * coldMasteryMult,
      damageMax:  ICEBOLT_DAMAGE_MAX * coldMasteryMult,
      pierce:     ilRank > 0 ? Math.floor(effectAtRank(1, ilRank)) : 0,
      splinters:  siRank > 0 ? Math.floor(effectAtRank(1, siRank)) : 0,
      chillFactor,
      chillTicks,
      impaler:     ilRank > 3,
      flashFreeze: bcRank > 5,
      frostbite:   frostbiteRank > 0 ? effectAtRank(0.10, frostbiteRank) : 0,
      rimeheart:   frostbiteRank > 3,
      flechette:   siRank > 3,
    },
    blizzard: {
      durationMultiplier: lwRank > 0 ? 1 + effectAtRank(0.10, lwRank) : 1,
      radiusMultiplier:   woRank > 0 ? 1 + effectAtRank(0.20, woRank) : 1,
      damageMultiplier:   (dcRank > 0 ? 1 + effectAtRank(0.08, dcRank) : 1) * coldMasteryMult,
      permafrost:     lwRank > 5,
      absoluteZero:   dcRank > 5,
      blindingSquall: woRank > 5,
    },
    frozenOrb: {
      speedMultiplier:    1 - gdEffect,
      lifetimeMultiplier: 1 + gdEffect,
      shardsPerVolley:    FROZEN_ORB_SHARDS_PER_VOLLEY + (ssRank > 0 ? Math.floor(effectAtRank(2, ssRank)) : 0),
      damageMin:          FROZEN_ORB_SHARD_DAMAGE_MIN * coldMasteryMult,
      damageMax:          FROZEN_ORB_SHARD_DAMAGE_MAX * coldMasteryMult,
      detonateOnExpiry: ssRank > 3,
      absoluteCold:     cmRank > 5,
    },
  };
}
