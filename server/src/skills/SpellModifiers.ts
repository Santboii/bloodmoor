import {
  FIREBALL_SPEED, FIREBALL_RADIUS,
  effectAtRank, teleportMaxRange, countAtRank, hasKeystone,
  GUIDED_DESCENT_STEER_RADII,
  HELLFIRE_RADIUS_RATIO, HELLFIRE_DAMAGE_RATIO, HELLFIRE_SPEED_RATIO,
  type NodeId,
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
  embers: number;
  chainReaction: boolean;
  bounces: number;
  perpetual: boolean;
  huntersEmber: boolean;
  rollingDoom: boolean;
};

export type FirewallModifiers = {
  durationMultiplier: number;
  damageMultiplier: number;
  lengthMultiplier: number;
  widthMultiplier: number;
  ramp: boolean;
  growth: boolean;
  eternalPyre: boolean;
  firestorm: boolean;
  empowerFireball: boolean;
  blastfurnace: boolean;
};

export type MeteorModifiers = {
  chunks: number;
  ejecta: boolean;
  steerRadius: number;
  fallingStar: boolean;
  showerCount: number;
  extinction: boolean;
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
  const rank = (id: NodeId) => skills.get(id) ?? 0;
  const keystone = (id: NodeId) => hasKeystone(id, rank(id));

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

  const sfRank = rank('fire.seeking_flame');
  const efRank = rank('fire.enduring_flames');
  const shRank = rank('fire.searing_heat');
  const ieRank = rank('fire.inferno_expanse');
  const gdRank = rank('fire.blind_strike');

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
  const gdriftRank = rank('frost.glacial_drift');
  const cmRank = rank('frost.cold_mastery');

  const bcEffect = bcRank > 0 ? effectAtRank(0.05, bcRank) : 0;
  const chillFactor = Math.max(0.4, ICEBOLT_CHILL_FACTOR - bcEffect);
  const chillTicks = Math.round(ICEBOLT_CHILL_TICKS * (1 + bcEffect));

  // Cold Mastery is tree-wide: one multiplier lifts Ice Bolt, Blizzard, and
  // the orb together.
  const coldMasteryMult = 1 + (cmRank > 0 ? effectAtRank(0.06, cmRank) : 0);

  // Glacial Drift's single baseEffect (0.12) drives both halves of "travels
  // slower and lives longer": subtracted from speed, added to lifetime.
  const gdEffect = gdriftRank > 0 ? effectAtRank(0.12, gdriftRank) : 0;

  return {
    fireball: {
      speed:          fbSpeed,
      radius:         fbRadius,
      blastRadius:    fbBlastRadius,
      damageMin:      fbDmgMin,
      damageMax:      fbDmgMax,
      homingStrength: sfRank > 0 ? 12 * Math.pow(sfRank, 1.65) : 0,
      embers:         countAtRank('fire.volatile_ember', rank('fire.volatile_ember')),
      chainReaction:  keystone('fire.volatile_ember'),
      bounces:        countAtRank('fire.pyroclasm', rank('fire.pyroclasm')),
      perpetual:      keystone('fire.pyroclasm'),
      huntersEmber:   keystone('fire.seeking_flame'),
      rollingDoom:    keystone('fire.hellfire'),
    },
    firewall: {
      durationMultiplier: efRank > 0 ? 1 + effectAtRank(0.10, efRank) : 1,
      damageMultiplier:   shRank > 0 ? 1 + effectAtRank(0.08, shRank) : 1,
      lengthMultiplier:   ieRank > 0 ? 1 + effectAtRank(0.25, ieRank) : 1,
      widthMultiplier:    ieRank > 0 ? 1 + effectAtRank(0.25, ieRank) : 1,
      ramp:            efRank > 0,
      // Firestorm (the Inferno Expanse keystone) rotates the wall INSTEAD of
      // growing it — the spec replaces straight growth with rotation.
      growth:          ieRank > 0 && !keystone('fire.inferno_expanse'),
      empowerFireball: shRank > 0,
      eternalPyre:     keystone('fire.enduring_flames'),
      firestorm:       keystone('fire.inferno_expanse'),
      blastfurnace:    keystone('fire.searing_heat'),
    },
    meteor: {
      chunks:      countAtRank('fire.molten_impact', rank('fire.molten_impact')),
      ejecta:      keystone('fire.molten_impact'),
      steerRadius: gdRank > 0 ? GUIDED_DESCENT_STEER_RADII[Math.min(gdRank, GUIDED_DESCENT_STEER_RADII.length) - 1] : 0,
      fallingStar: keystone('fire.blind_strike'),
      showerCount: countAtRank('fire.cataclysm', rank('fire.cataclysm')),
      extinction:  keystone('fire.cataclysm'),
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
