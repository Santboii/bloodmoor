import {
  FIREBALL_SPEED, FIREBALL_RADIUS,
  effectAtRank, teleportMaxRange, countAtRank, hasKeystone,
  GUIDED_DESCENT_STEER_RADII,
  HELLFIRE_RADIUS_RATIO, HELLFIRE_DAMAGE_RATIO, HELLFIRE_SPEED_RATIO,
  type NodeId,
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

export type SpellModifiers = {
  fireball: FireballModifiers;
  firewall: FirewallModifiers;
  meteor: MeteorModifiers;
  teleport: TeleportModifiers;
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
      growth:          ieRank > 0,
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
  };
}
