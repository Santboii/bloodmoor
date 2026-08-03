import {
  GameState, PlayerState, InputFrame, Vec2, SpellId, NodeId,
  SPELL_CONFIG, MANA_REGEN_PER_TICK, TICK_RATE,
  FIREWALL_DAMAGE_PER_TICK, FIREWALL_MAX_LENGTH, TELEPORT_MAX_RANGE, METEOR_AOE_RADIUS, FIREBALL_RADIUS, PLAYER_HALF_SIZE, PLAYER_SPEED,
  DUEL_MODE,
  ARROW_SPEED, EVADE_RANGE, EVADE_INVULN_TICKS, EVADE_DURATION_TICKS, EVADE_MAX_CHARGES,
  RAIN_SUSTAINED_TICKS, RAIN_DAMAGE_PER_TICK, GUIDED_MOMENTUM_PER_REDIRECT,
  ECHO_VOLLEY_DELAY_TICKS, ECHO_VOLLEY_DAMAGE_RATIO, EXPOSED_DAMAGE_MULT,
  STORMCALL_DRIFT_SPEED, DELTA, TWIN_STORM_RADIUS_RATIO,
  DEEP_FREEZE_ROOT_TICKS, DEEP_FREEZE_COOLDOWN_TICKS,
  ICEBOLT_CHILL_FACTOR, ICEBOLT_CHILL_TICKS,
  BLIZZARD_DAMAGE_PER_TICK,
  FROZEN_ORB_VOLLEY_INTERVAL_TICKS,
  FROZEN_ORB_SHARD_SPEED, FROZEN_ORB_SHARD_DAMAGE_MIN, FROZEN_ORB_SHARD_DAMAGE_MAX,
  FROZEN_ORB_SHARD_LIFETIME_TICKS,
  IMPALER_PIERCE_DAMAGE_BONUS,
  PERMAFROST_LINGER_TICKS,
  CATACLYSMIC_ORB_DAMAGE, CATACLYSMIC_ORB_RADIUS,
  ABSOLUTE_ZERO_DWELL_TICKS,
  ICE_RAY_MOVE_MULT, iceRayRamp,
  REST_CAST_TICKS, REST_REGEN_FRACTION_PER_SEC, REST_COOLDOWN_TICKS,
  computeLoadout,
  gearVisualsFor,
} from '@arena/shared';
import type { CharacterClass, Appearance, ItemRow } from '@arena/shared';
import type { GameModeConfig, RainOfArrowsState, EchoVolleyState, FireWallState, FrozenOrbState } from '@arena/shared';
import { SPELL_BINDINGS, CLASS_DEFAULT_NODE, classOfSpell, CLASS_DEFAULT_APPEARANCE, IGNITE_BURST_DAMAGE } from '@arena/shared';
import { movePlayer, clampToArena, resolvePlayerPillarCollisions, clampTeleport } from '../physics/Movement.ts';
import { hasLineOfSight } from '../physics/LineOfSight.ts';
import { spawnFireball, advanceFireball, isFireballExpired, fireballHitsPlayer, fireballDamage } from '../spells/Fireball.ts';
import { spawnIceBolt, advanceIceBolt, isIceBoltExpired, iceBoltHitsPlayer, iceBoltDamage } from '../spells/IceBolt.ts';
import { iceRayEnd, iceRayHitsPlayer } from '../spells/IceRay.ts';
import { spawnBlizzard } from '../spells/Blizzard.ts';
import { spawnFrozenOrb, advanceFrozenOrb, isFrozenOrbExpired, orbVolleyDue, spawnOrbVolley } from '../spells/FrozenOrb.ts';
import { spawnFireWall, spawnFireCrater, fireWallDamagesPlayer } from '../spells/FireWall.ts';
import { spawnMeteor, meteorDetonates, meteorHitsPlayer, meteorDamage } from '../spells/Meteor.ts';
import { buildSpellModifiers } from '../skills/SpellModifiers.ts';
import { spawnArrow, advanceArrow, isArrowExpired, arrowHitsPlayer, arrowDamage } from '../spells/Arrow.ts';
import { spawnRainOfArrows, rainDetonates } from '../spells/RainOfArrows.ts';
import { buildRangerModifiers } from '../skills/RangerModifiers.ts';
import type { RangerSpellModifiers } from '../skills/RangerModifiers.ts';

export type PlayerInit = {
  id: string; displayName: string; charClass: CharacterClass; spawnPos: Vec2;
  appearance?: Appearance;
  items?: ItemRow[]; // equipped gear — computeLoadout folds these into the StatBlock below
};

/** Applies/refreshes the owner's elemental status on a tick-local player
 *  object. Gear damage mult is baked into the DoT at application (the tick
 *  loop has no attacker id once the effect is fields on the target). */
function applyElementStatus(target: PlayerState, ownerAM: RangerSpellModifiers, atkDamageMult: number, tick: number): void {
  const el = ownerAM.elemental;
  if (ownerAM.element === 'burn') {
    target.burnUntil = tick + Math.round(el.burn.duration * TICK_RATE);
    target.burnDps = el.burn.damagePerSecond * atkDamageMult;
  } else if (ownerAM.element === 'freeze') {
    target.slowUntil = tick + Math.round(el.freeze.duration * TICK_RATE);
    target.slowFactor = Math.max(0, 1 - el.freeze.slowPercent);
    if (el.freeze.deepFreeze && (target.freezeRootReadyAt ?? 0) <= tick) {
      target.rootUntil = tick + DEEP_FREEZE_ROOT_TICKS;
      target.freezeRootReadyAt = tick + DEEP_FREEZE_COOLDOWN_TICKS;
    }
  } else if (ownerAM.element === 'poison') {
    target.poisonUntil = tick + Math.round(el.poison.duration * TICK_RATE);
    target.poisonDps = el.poison.damagePerSecond * atkDamageMult;
    target.poisonManaReduction = el.poison.manaRegenReduction;
    target.poisonManaDrain = el.poison.manaDrainPerSecond > 0 ? el.poison.manaDrainPerSecond : undefined;
  }
}

/** Exposed keystone: 1.15 when the target stands in one of the owner's rain
 *  zones, else 1. */
function exposedMultiplier(ownerId: string, ownerAM: RangerSpellModifiers | null, targetPos: Vec2, fireWalls: FireWallState[]): number {
  if (!ownerAM?.rain.exposed) return 1;
  const inZone = fireWalls.some(fw =>
    fw.shape === 'circle' && fw.kind === 'rain' && fw.ownerId === ownerId &&
    (targetPos.x - fw.center!.x) ** 2 + (targetPos.y - fw.center!.y) ** 2 <= (fw.radius! + PLAYER_HALF_SIZE) ** 2);
  return inZone ? EXPOSED_DAMAGE_MULT : 1;
}

function getSpellNodeMap(skills: Map<NodeId, number>): Partial<Record<SpellId, NodeId>> {
  const cls: CharacterClass = skills.has(CLASS_DEFAULT_NODE.ranger) ? 'ranger' : 'mage';
  const map: Partial<Record<SpellId, NodeId>> = {};
  for (const b of SPELL_BINDINGS) {
    if (b.charClass === cls) map[b.spell] = b.node;
  }
  return map;
}

export function makeInitialState(
  players: PlayerInit[],
  mode?: GameModeConfig,
  teams?: Record<string, string[]>,
): GameState {
  const playerMap: Record<string, PlayerState> = {};
  const teamLookup: Record<string, string> = {};
  if (teams) {
    for (const [teamId, memberIds] of Object.entries(teams)) {
      for (const pid of memberIds) {
        teamLookup[pid] = teamId;
      }
    }
  }
  for (const p of players) {
    const { statBlock } = computeLoadout(p.items ?? [], p.charClass);
    playerMap[p.id] = {
      id: p.id,
      displayName: p.displayName,
      charClass: p.charClass,
      position: resolvePlayerPillarCollisions(clampToArena({ ...p.spawnPos })),
      hp: statBlock.maxHp,
      mana: statBlock.maxMana,
      maxHp: statBlock.maxHp,
      maxMana: statBlock.maxMana,
      statMults: {
        damage: statBlock.damageMult,
        cooldown: statBlock.cooldownMult,
        moveSpeed: statBlock.moveSpeedMult,
        manaRegen: statBlock.manaRegenMult,
      },
      facing: 0,
      castingSpell: null,
      cooldowns: {},
      teamId: teamLookup[p.id],
      appearance: p.appearance ?? CLASS_DEFAULT_APPEARANCE[p.charClass],
      gear: gearVisualsFor(p.items ?? []),
    };
  }
  return { tick: 0, players: playerMap, projectiles: [], fireWalls: [], meteors: [], rainOfArrows: [], echoVolleys: [], frozenOrbs: [], phase: 'dueling', winner: null, gameMode: mode?.type ?? '1v1', teams };
}

export function advanceState(
  state: GameState,
  inputs: Record<string, InputFrame>,
  skillSets: Record<string, Map<NodeId, number>> = {},
  mode?: GameModeConfig,
): GameState {
  const resolvedMode = mode ?? DUEL_MODE;
  const players = deepCopyPlayers(state.players);
  const modifiers = Object.fromEntries(
    Object.keys(players).map(id => [id, buildSpellModifiers(skillSets[id] ?? new Map())])
  );
  const rangerMods = Object.fromEntries(
    Object.keys(players).map(id => {
      const skills = skillSets[id] ?? new Map();
      const isRanger = skills.has('archer.power_shot' as NodeId);
      return [id, isRanger ? buildRangerModifiers(skills) : null];
    })
  );

  const tick = state.tick;

  // 0. Advance evade dashes
  const dashing = new Set<string>();
  for (const [id, p] of Object.entries(players)) {
    if (p.evadeTarget && p.evadeOrigin && p.evadeEndTick != null) {
      const startTick = p.evadeEndTick - EVADE_DURATION_TICKS;
      const elapsed = tick - startTick + 1;
      const t = Math.min(elapsed / EVADE_DURATION_TICKS, 1);
      const nx = p.evadeOrigin.x + (p.evadeTarget.x - p.evadeOrigin.x) * t;
      const ny = p.evadeOrigin.y + (p.evadeTarget.y - p.evadeOrigin.y) * t;
      const done = tick + 1 >= p.evadeEndTick;
      players[id] = {
        ...p,
        position: resolvePlayerPillarCollisions(clampToArena({ x: nx, y: ny })),
        evadeOrigin: done ? undefined : p.evadeOrigin,
        evadeTarget: done ? undefined : p.evadeTarget,
        evadeEndTick: done ? undefined : p.evadeEndTick,
      };
      dashing.add(id);
    }
  }

  // 0.25 Rest: resolve finished wind-ups and tick regen. Runs before the
  // status-effect DoT pass so Task 2's damage snapshot (taken here) precedes
  // every damage source this tick. players[] entries are tick-local copies,
  // so in-place mutation is safe.
  const restHpSnapshot: Record<string, number> = {};
  for (const p of Object.values(players)) {
    if ((p.restCooldownUntil ?? 0) <= tick && p.restCooldownUntil !== undefined) p.restCooldownUntil = undefined;
    if (p.hp <= 0) {
      p.restCastEndTick = undefined;
      p.resting = undefined;
      continue;
    }
    if (p.restCastEndTick !== undefined && tick >= p.restCastEndTick) {
      p.restCastEndTick = undefined;
      p.resting = true;
    }
    if (p.resting) {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * REST_REGEN_FRACTION_PER_SEC / TICK_RATE);
      p.mana = Math.min(p.maxMana, p.mana + p.maxMana * REST_REGEN_FRACTION_PER_SEC / TICK_RATE);
      if (p.hp >= p.maxHp && p.mana >= p.maxMana) p.resting = undefined;
    }
    if (p.restCastEndTick !== undefined || p.resting) restHpSnapshot[p.id] = p.hp;
  }

  // 0.5 Status effects: burn/poison damage over time, expire stale effects.
  // players[] entries are tick-local copies, so in-place mutation is safe.
  for (const p of Object.values(players)) {
    if (p.hp > 0) {
      if ((p.burnUntil ?? 0) > tick && p.burnDps) p.hp = Math.max(0, p.hp - p.burnDps / TICK_RATE);
      if ((p.poisonUntil ?? 0) > tick && p.poisonDps) p.hp = Math.max(0, p.hp - p.poisonDps / TICK_RATE);
      if ((p.poisonUntil ?? 0) > tick && p.poisonManaDrain) p.mana = Math.max(0, p.mana - p.poisonManaDrain / TICK_RATE);
    }
    if ((p.burnUntil ?? 0) <= tick) { p.burnUntil = undefined; p.burnDps = undefined; }
    if ((p.slowUntil ?? 0) <= tick) { p.slowUntil = undefined; p.slowFactor = undefined; }
    if ((p.rootUntil ?? 0) <= tick) p.rootUntil = undefined;
    if ((p.poisonUntil ?? 0) <= tick) { p.poisonUntil = undefined; p.poisonDps = undefined; p.poisonManaReduction = undefined; p.poisonManaDrain = undefined; }
    if ((p.invisibleUntil ?? 0) <= tick) p.invisibleUntil = undefined;
  }

  // 1. Move players and apply mana regen
  for (const [id, input] of Object.entries(inputs)) {
    const p = players[id];
    if (!p || p.hp <= 0) continue;
    const poisonActive = (p.poisonUntil ?? 0) > tick;
    const regen = MANA_REGEN_PER_TICK * (poisonActive ? Math.max(0, 1 - (p.poisonManaReduction ?? 0)) : 1) * p.statMults.manaRegen;
    const newMana = Math.min(p.maxMana, p.mana + regen);

    // Ice Ray channel. Resolved here rather than in the cast dispatch because a
    // channel is sustained, not a one-shot — the dispatch clears itself each tick.
    let channelSpell = p.channelSpell;
    let channelTicks = p.channelTicks ?? 0;
    let channelEnd = p.channelEnd;
    let manaAfterChannel = newMana;

    const wantsChannel = input.channel === 12;
    // The channel path bypasses the cast dispatch, so it does not inherit that
    // gate's ownership check — mirror it here or an unowned Ice Ray is castable.
    const ownsIceRay = skillSets[id] === undefined || (skillSets[id]!.has('frost.ice_ray' as NodeId));

    if (wantsChannel && ownsIceRay && p.hp > 0) {
      const ramp = iceRayRamp(channelTicks);
      if (manaAfterChannel >= ramp.manaPerTick) {
        manaAfterChannel -= ramp.manaPerTick;
        channelSpell = 12;
        channelTicks = channelTicks + 1;
        channelEnd = iceRayEnd(p.position, input.aimTarget);
      } else {
        channelSpell = undefined; channelTicks = 0; channelEnd = undefined;
      }
    } else {
      channelSpell = undefined; channelTicks = 0; channelEnd = undefined;
    }

    const channelSlow = channelSpell !== undefined ? ICE_RAY_MOVE_MULT : 1;

    const rooted = (p.rootUntil ?? 0) > tick;
    const speedMult = rooted ? 0 : ((p.slowUntil ?? 0) > tick ? (p.slowFactor ?? 1) : 1) * p.statMults.moveSpeed * channelSlow;
    const newFacing = input.aimTarget
      ? Math.atan2(input.aimTarget.y - p.position.y, input.aimTarget.x - p.position.x)
      : p.facing;
    const secondWind = !!rangerMods[id]?.evade.secondWind;
    let evadeCharges = secondWind ? (p.evadeCharges ?? EVADE_MAX_CHARGES) : p.evadeCharges;
    const newCooldowns: Partial<Record<SpellId, number>> = {};
    for (const [k, v] of Object.entries(p.cooldowns)) {
      const spellKey = Number(k) as SpellId;
      const remaining = (v as number) - 1;
      if (remaining > 0) { newCooldowns[spellKey] = remaining; continue; }
      // Second Wind: an expiring evade cooldown refills one charge; restart the
      // timer while a charge is still missing.
      if (spellKey === 8 && secondWind) {
        // secondWind guarantees evadeCharges was seeded (non-undefined) above.
        evadeCharges = Math.min(EVADE_MAX_CHARGES, evadeCharges! + 1);
        if (evadeCharges < EVADE_MAX_CHARGES) {
          newCooldowns[8] = Math.round(SPELL_CONFIG[8].cooldownTicks * rangerMods[id]!.evade.cooldownMultiplier * p.statMults.cooldown);
        }
      }
    }
    const phantomActive = (p.phantomStepUntil ?? 0) > state.tick;
    const isMoving = input.move.x !== 0 || input.move.y !== 0;
    players[id] = {
      ...p,
      position: dashing.has(id) ? p.position : movePlayer(p.position, input.move, speedMult),
      mana: manaAfterChannel,
      facing: newFacing,
      cooldowns: newCooldowns,
      castingSpell: null,
      phantomStepUntil: phantomActive ? p.phantomStepUntil : undefined,
      evadeCharges,
      channelSpell,
      channelTicks,
      channelEnd,
      restCastEndTick: isMoving ? undefined : p.restCastEndTick,
      resting: isMoving ? undefined : p.resting,
    };
  }

  // 2. Process spell casts
  let projectiles = [...state.projectiles];
  let fireWalls = [...state.fireWalls];
  let meteors = [...state.meteors];
  let rainOfArrows: RainOfArrowsState[] = [...state.rainOfArrows];
  let echoVolleys: EchoVolleyState[] = [...(state.echoVolleys ?? [])];
  let frozenOrbs: FrozenOrbState[] = [...state.frozenOrbs];

  for (const [id, input] of Object.entries(inputs)) {
    const p = players[id];
    if (!p || p.hp <= 0 || !input.castSpell) continue;
    if (dashing.has(id)) continue;
    const spell = input.castSpell;
    const mods = modifiers[id];
    // Ranger spells need ranger modifiers — bail before burning mana/cooldown.
    if (classOfSpell(spell) === 'ranger' && !rangerMods[id]) continue;

    // Spell availability gate — only applies when player has a skill set registered
    const hasSkillSystem = skillSets[id] !== undefined;
    const spellNodeMap = getSpellNodeMap(skillSets[id] ?? new Map());
    const requiredNode = spellNodeMap[spell];
    // Block spells not in this class's spell map entirely
    if (hasSkillSystem && !(spell in spellNodeMap)) continue;
    if (hasSkillSystem && requiredNode && !(skillSets[id] ?? new Map()).has(requiredNode)) continue;

    const cfg = SPELL_CONFIG[spell];
    const phantomActive = (p.phantomStepUntil ?? 0) > tick;
    const effectiveManaCost = phantomActive ? 0 : cfg.manaCost;
    const secondWind = spell === 8 && !!rangerMods[id]?.evade.secondWind;
    const charges = secondWind ? (p.evadeCharges ?? EVADE_MAX_CHARGES) : 0;
    if (p.mana < effectiveManaCost) continue;
    if (secondWind ? charges <= 0 : (p.cooldowns[spell] ?? 0) > 0) continue;

    let cooldownMultiplier = 1;
    if (spell === 8 && rangerMods[id]) {
      cooldownMultiplier = rangerMods[id]!.evade.cooldownMultiplier;
    }
    const cooldownTicks = Math.round(cfg.cooldownTicks * cooldownMultiplier * p.statMults.cooldown);

    players[id] = {
      ...p,
      mana: p.mana - effectiveManaCost,
      cooldowns: phantomActive ? { ...p.cooldowns }
        : secondWind && (p.cooldowns[8] ?? 0) > 0 ? { ...p.cooldowns }   // refill already ticking
        : { ...p.cooldowns, [spell]: cooldownTicks },
      evadeCharges: secondWind ? charges - 1 : p.evadeCharges,
      castingSpell: spell,
      phantomStepUntil: phantomActive ? undefined : p.phantomStepUntil,
      restCastEndTick: undefined,
      resting: undefined,
    };

    if (spell === 1) {
      const fb = spawnFireball(id, p.position, input.aimTarget, {
        speed:      mods.fireball.speed,
        radius:     mods.fireball.radius,
        blastRadius: mods.fireball.blastRadius,
        damageMin:  mods.fireball.damageMin,
        damageMax:  mods.fireball.damageMax,
        homing:     mods.fireball.homingStrength,
        split:      mods.fireball.split,
      });
      projectiles = [...projectiles, fb];
    } else if (spell === 2) {
      const dx = input.aimTarget.x - p.position.x;
      const dy = input.aimTarget.y - p.position.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;
      const half = FIREWALL_MAX_LENGTH * mods.firewall.lengthMultiplier / 2;
      const from = { x: input.aimTarget.x - perpX * half, y: input.aimTarget.y - perpY * half };
      const to = { x: input.aimTarget.x + perpX * half, y: input.aimTarget.y + perpY * half };
      fireWalls = [...fireWalls, spawnFireWall(id, from, to, tick, mods.firewall.durationMultiplier, mods.firewall.lengthMultiplier)];
    } else if (spell === 3) {
      meteors = [...meteors, spawnMeteor(id, input.aimTarget, tick, {
        hidden: mods.meteor.hidden,
        moltenImpact: mods.meteor.moltenImpact,
        radiusMultiplier: mods.meteor.radiusMultiplier,
      })];
    } else if (spell === 4) {
      const tMods = mods.teleport;
      // Always clamp — a guest (no skill system) must not get unlimited range.
      const newPos = clampTeleport(p.position, input.aimTarget, tMods.maxRange);
      players[id] = {
        ...players[id],
        position: newPos,
        teleported: { ...p.position },
        invulnUntil: (hasSkillSystem && tMods.etherealForm) ? tick + Math.round(0.5 * TICK_RATE) : players[id].invulnUntil,
        phantomStepUntil: (hasSkillSystem && tMods.phantomStep) ? tick + 2 * TICK_RATE : players[id].phantomStepUntil,
      };
    } else if (spell === 9) {
      const m = mods.iceBolt;
      projectiles = [...projectiles, spawnIceBolt(id, p.position, input.aimTarget, {
        speed:      m.speed,
        damageMin:  m.damageMin,
        damageMax:  m.damageMax,
        pierce:     m.pierce,
        splinters:  m.splinters,
        impaler:    m.impaler,
        flechette:  m.flechette,
      })];
    } else if (spell === 10) {
      const m = mods.blizzard;
      fireWalls = [...fireWalls, spawnBlizzard(id, input.aimTarget, tick, {
        durationMultiplier: m.durationMultiplier,
        radiusMultiplier:   m.radiusMultiplier,
        blindingSquall:     m.blindingSquall,
      })];
    } else if (spell === 11) {
      const m = mods.frozenOrb;
      frozenOrbs = [...frozenOrbs, spawnFrozenOrb(id, p.position, input.aimTarget, tick, {
        speedMultiplier:    m.speedMultiplier,
        lifetimeMultiplier: m.lifetimeMultiplier,
        shardsPerVolley:    m.shardsPerVolley,
        damageMin:          m.damageMin,
        damageMax:          m.damageMax,
        detonateOnExpiry:   m.detonateOnExpiry,
      })];
    } else if (spell === 5) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      const arrow = spawnArrow(id, p.position, input.aimTarget, {
        speed: aMods.arrow.speed,
        damageMin: aMods.arrow.damageMin,
        damageMax: aMods.arrow.damageMax,
        homing: aMods.arrow.homing,
        homingTickReduction: aMods.arrow.homingTickReduction,
        guidedRedirects: aMods.arrow.guidedRedirects,
        relentless: aMods.arrow.relentless,
        predator: aMods.arrow.predator,
      });
      projectiles = [...projectiles, arrow];
    } else if (spell === 6) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      const count = aMods.multishot.arrowCount;
      const spreadPerArrow = Math.PI / (count + 1) * 0.4;
      const baseAngle = Math.atan2(input.aimTarget.y - p.position.y, input.aimTarget.x - p.position.x);
      const volley = [];
      const angles: number[] = [];
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (i - (count - 1) / 2) * spreadPerArrow;
        angles.push(angle);
        const target = { x: p.position.x + Math.cos(angle) * 500, y: p.position.y + Math.sin(angle) * 500 };
        volley.push(spawnArrow(id, p.position, target, {
          speed: aMods.arrow.speed,
          damageMin: aMods.multishot.damageMin,
          damageMax: aMods.multishot.damageMax,
          homing: 0,
        }));
      }
      projectiles = [...projectiles, ...volley];
      if (aMods.multishot.echoVolley) {
        echoVolleys = [...echoVolleys, {
          id: `echo_${id}_${tick}`,
          ownerId: id,
          fireAt: tick + ECHO_VOLLEY_DELAY_TICKS,
          angles,
          damageMin: Math.round(aMods.multishot.damageMin * ECHO_VOLLEY_DAMAGE_RATIO),
          damageMax: Math.round(aMods.multishot.damageMax * ECHO_VOLLEY_DAMAGE_RATIO),
        }];
      }
    } else if (spell === 7) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      rainOfArrows = [...rainOfArrows, spawnRainOfArrows(id, input.aimTarget, tick, {
        radiusMultiplier: aMods.rain.radiusMultiplier,
      })];
      if (aMods.rain.twinStorm) {
        let nearest: PlayerState | undefined;
        let nearestDist = Infinity;
        for (const other of Object.values(players)) {
          if (other.id === id || other.hp <= 0) continue;
          if ((other.invisibleUntil ?? 0) > tick) continue;
          if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === players[id].teamId) continue;
          const d = (other.position.x - p.position.x) ** 2 + (other.position.y - p.position.y) ** 2;
          if (d < nearestDist) { nearestDist = d; nearest = other; }
        }
        if (nearest) {
          rainOfArrows = [...rainOfArrows, spawnRainOfArrows(id, nearest.position, tick, {
            radiusMultiplier: aMods.rain.radiusMultiplier * TWIN_STORM_RADIUS_RATIO,
          })];
        }
      }
    } else if (spell === 8) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      const dx = input.aimTarget.x - p.position.x;
      const dy = input.aimTarget.y - p.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const range = aMods.evade.range;
      const clampedTarget = dist > range
        ? { x: p.position.x + (dx / dist) * range, y: p.position.y + (dy / dist) * range }
        : input.aimTarget;
      const origin = { ...p.position };
      const t0 = 1 / EVADE_DURATION_TICKS;
      const firstPos = resolvePlayerPillarCollisions(clampToArena({
        x: origin.x + (clampedTarget.x - origin.x) * t0,
        y: origin.y + (clampedTarget.y - origin.y) * t0,
      }));
      players[id] = {
        ...players[id],
        position: firstPos,
        evadeOrigin: origin,
        evadeTarget: clampedTarget,
        evadeEndTick: tick + EVADE_DURATION_TICKS,
        invulnUntil: tick + EVADE_INVULN_TICKS,
        // Shadowstep: invisible for 0.5s after the dash ends
        invisibleUntil: aMods.evade.shadowstep
          ? tick + EVADE_DURATION_TICKS + Math.round(0.5 * TICK_RATE)
          : players[id].invisibleUntil,
      };

      // Combat Roll: fire an arrow at the nearest enemy during evade
      if (aMods.evade.combatRoll) {
        let nearest: PlayerState | undefined;
        let nearestDist = Infinity;
        for (const other of Object.values(players)) {
          if (other.id === id || other.hp <= 0) continue;
          // Shadowstepped players can't be auto-targeted (would reveal them).
          if ((other.invisibleUntil ?? 0) > tick) continue;
          if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === players[id].teamId) continue;
          const d = (other.position.x - origin.x) ** 2 + (other.position.y - origin.y) ** 2;
          if (d < nearestDist) { nearestDist = d; nearest = other; }
        }
        if (nearest) {
          projectiles = [...projectiles, spawnArrow(id, origin, nearest.position, {
            speed: aMods.arrow.speed,
            damageMin: aMods.arrow.damageMin,
            damageMax: aMods.arrow.damageMax,
            homing: 0,
          })];
        }
      }
    }
  }

  // 2.5 Rest starts — after spell casts so a same-frame cast wins over rest.
  for (const [id, input] of Object.entries(inputs)) {
    const p = players[id];
    if (!p || p.hp <= 0 || !input.rest) continue;
    if (dashing.has(id)) continue;
    if (p.castingSpell !== null) continue;                  // cast something this tick instead
    if (input.move.x !== 0 || input.move.y !== 0) continue; // must be stationary
    if ((p.restCooldownUntil ?? 0) > tick) continue;
    if (p.restCastEndTick !== undefined || p.resting) continue;
    p.restCastEndTick = tick + REST_CAST_TICKS;
    p.restCooldownUntil = tick + REST_COOLDOWN_TICKS;
    // DoT that ticked in §0.5 this tick precedes this start pass, so a burning
    // player's fresh wind-up breaks on the NEXT tick's snapshot — 1/60s late,
    // behaviorally invisible.
    restHpSnapshot[id] = p.hp;
  }

  // 2b. Fire due echo volleys from the caster's current position
  const pendingEchoes: EchoVolleyState[] = [];
  for (const echo of echoVolleys) {
    if (tick < echo.fireAt) { pendingEchoes.push(echo); continue; }
    const owner = players[echo.ownerId];
    if (owner && owner.hp > 0) {
      const ownerMods = rangerMods[echo.ownerId];
      for (const angle of echo.angles) {
        const target = { x: owner.position.x + Math.cos(angle) * 500, y: owner.position.y + Math.sin(angle) * 500 };
        projectiles = [...projectiles, spawnArrow(echo.ownerId, owner.position, target, {
          speed: ownerMods?.arrow.speed ?? ARROW_SPEED,
          damageMin: echo.damageMin,
          damageMax: echo.damageMax,
          homing: 0,
        })];
      }
    }
  }
  echoVolleys = pendingEchoes;

  // Permafrost keystone: capture blizzards expiring this tick BEFORE the
  // filter below drops them, so their lingering replacement can be spawned.
  // `!fw.noDamage` excludes a lingering zone from spawning another one when
  // its own linger duration runs out — otherwise the chain never ends.
  const expiringPermafrostZones = fireWalls.filter(fw =>
    tick >= fw.expiresAt && fw.kind === 'blizzard' && !fw.noDamage &&
    modifiers[fw.ownerId]?.blizzard.permafrost);

  // Expire fire walls / rain zones and apply Stormcall drift before the
  // arrow-hit section below, so exposedMultiplier and in-zone checks this
  // tick see the zone's current (not stale, not-yet-expired) position.
  fireWalls = fireWalls.filter(fw => tick < fw.expiresAt);
  if (expiringPermafrostZones.length > 0) {
    fireWalls = [
      ...fireWalls,
      ...expiringPermafrostZones.map(fw => ({
        id: `permafrost_${fw.id}`,
        kind: 'blizzard' as const,
        ownerId: fw.ownerId,
        segments: [],
        shape: 'circle' as const,
        center: { ...fw.center! },
        radius: fw.radius,
        expiresAt: tick + PERMAFROST_LINGER_TICKS,
        noDamage: true,
      })),
    ];
  }
  // Stormcall keystone: rain zones drift toward the owner's nearest visible enemy.
  fireWalls = fireWalls.map(fw => {
    if (fw.shape !== 'circle' || fw.kind !== 'rain') return fw;
    if (!rangerMods[fw.ownerId]?.rain.stormcall) return fw;
    let nearest: PlayerState | undefined;
    let nearestDist = Infinity;
    for (const other of Object.values(players)) {
      if (other.id === fw.ownerId || other.hp <= 0) continue;
      if ((other.invisibleUntil ?? 0) > tick) continue;
      if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === players[fw.ownerId]?.teamId) continue;
      const d = (other.position.x - fw.center!.x) ** 2 + (other.position.y - fw.center!.y) ** 2;
      if (d < nearestDist) { nearestDist = d; nearest = other; }
    }
    if (!nearest) return fw;
    const dx = nearest.position.x - fw.center!.x;
    const dy = nearest.position.y - fw.center!.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = STORMCALL_DRIFT_SPEED * DELTA;
    if (len <= step) return { ...fw, center: { ...nearest.position } };
    return { ...fw, center: { x: fw.center!.x + (dx / len) * step, y: fw.center!.y + (dy / len) * step } };
  });

  // 3. Advance projectiles, check hits
  const survivingProjectiles = [];
  const newProjectiles: typeof projectiles = [];
  const igniteTicked = new Set<string>();   // `${ownerId}:${pid}` — one ignite burst per owner per target per tick
  for (const proj of projectiles) {
    const candidates = Object.entries(players).filter(([pid]) =>
      pid !== proj.ownerId &&
      players[pid].hp > 0 &&
      // Shadowstepped (invisible) players can't be tracked by homing.
      (players[pid].invisibleUntil ?? 0) <= tick &&
      // Homing must not steer toward teammates in team modes.
      !(resolvedMode.teamsEnabled &&
        players[proj.ownerId]?.teamId !== undefined &&
        players[pid].teamId === players[proj.ownerId].teamId));
    const enemyEntry = candidates.length > 0
      ? candidates.reduce((closest, curr) => {
          const closestDist = (closest[1].position.x - proj.position.x) ** 2 + (closest[1].position.y - proj.position.y) ** 2;
          const currDist = (curr[1].position.x - proj.position.x) ** 2 + (curr[1].position.y - proj.position.y) ** 2;
          return currDist < closestDist ? curr : closest;
        })
      : undefined;
    if (proj.type === 'arrow') {
      // Predator: a single-tick position delta, scaled to units/sec. Teleports
      // and evade dashes can move a player far more than a normal step in one
      // tick, so clamp to PLAYER_SPEED — otherwise the lead point overshoots
      // wildly and wastes the redirect.
      let enemyVel: Vec2 | undefined;
      if (enemyEntry && state.players[enemyEntry[0]]) {
        const vx = (enemyEntry[1].position.x - state.players[enemyEntry[0]].position.x) * TICK_RATE;
        const vy = (enemyEntry[1].position.y - state.players[enemyEntry[0]].position.y) * TICK_RATE;
        const speed = Math.sqrt(vx * vx + vy * vy);
        enemyVel = speed > PLAYER_SPEED
          ? { x: (vx / speed) * PLAYER_SPEED, y: (vy / speed) * PLAYER_SPEED }
          : { x: vx, y: vy };
      }
      const moved = advanceArrow(proj, enemyEntry?.[1].position, enemyVel);
      if (isArrowExpired(moved)) continue;
      let hit = false;
      for (const [pid, player] of Object.entries(players)) {
        if (player.hp <= 0) continue;
        if (arrowHitsPlayer(moved, player.position, pid)) {
          const invuln = (player.invulnUntil ?? 0) > tick;
          if (!invuln) {
            const momentum = 1 + GUIDED_MOMENTUM_PER_REDIRECT * (moved.redirectCount ?? 0);
            const next = { ...player, hp: Math.max(0, player.hp - arrowDamage(moved.damageMin, moved.damageMax) * momentum * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode) * exposedMultiplier(moved.ownerId, rangerMods[moved.ownerId], player.position, fireWalls)) };
            // Elemental arrows apply the shooter's status effect on hit —
            // but never full-strength slows/DoTs on teammates (friendly fire
            // is deliberately reduced; a full 2s slow would undercut that).
            const sameTeam = resolvedMode.teamsEnabled &&
              players[moved.ownerId]?.teamId !== undefined &&
              players[moved.ownerId].teamId === player.teamId;
            const ownerAM = rangerMods[moved.ownerId];
            // Ignite keystone: hitting an already-burning target detonates the burn.
            // Capped at one burst per owner per target per tick — otherwise a
            // multi-arrow volley (Multi-shot / Barrage / Echo Volley) would
            // detonate the freshly re-applied burn on every arrow in the same tick.
            const igniteKey = `${moved.ownerId}:${pid}`;
            if (ownerAM && ownerAM.element === 'burn' && ownerAM.elemental.burn.ignite &&
                (next.burnUntil ?? 0) > tick && next.hp > 0 && !sameTeam && !igniteTicked.has(igniteKey)) {
              next.hp = Math.max(0, next.hp - IGNITE_BURST_DAMAGE * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode));
              next.burnUntil = undefined;
              next.burnDps = undefined;
              igniteTicked.add(igniteKey);
            }
            if (ownerAM && ownerAM.element !== 'none' && next.hp > 0 && !sameTeam) {
              const atkDamageMult = players[moved.ownerId]?.statMults.damage ?? 1;
              applyElementStatus(next, ownerAM, atkDamageMult, tick);
            }
            players[pid] = next;
          }
          hit = true;
          break;
        }
      }
      if (!hit) survivingProjectiles.push(moved);
    } else if (proj.type === 'icebolt' || proj.type === 'iceshard') {
      const moved = advanceIceBolt(proj);
      // Shards (from a Frozen Orb volley or a Splintering Ice burst) carry a
      // tick-based expiry so they don't fly the entire arena — see
      // FROZEN_ORB_SHARD_LIFETIME_TICKS. Ordinary ice bolts have no
      // `expiresAt` and rely solely on the bounds/pillar check.
      if ((moved.expiresAt !== undefined && tick >= moved.expiresAt) || isIceBoltExpired(moved)) continue;
      let hit = false;
      for (const [pid, player] of Object.entries(players)) {
        if (player.hp <= 0) continue;
        if (iceBoltHitsPlayer(moved, player.position, pid)) {
          hit = true;
          const invuln = (player.invulnUntil ?? 0) > tick;
          const ownerIceBolt = modifiers[moved.ownerId]?.iceBolt;
          // Teammates take the (already reduced) damage but never the
          // chill/Frostbite bonus — the same rule the arrow branch applies to
          // elemental status, for the same reason: a full-strength slow (or
          // an amplified friendly-fire hit) would undercut deliberately-
          // reduced friendly fire. See :523-525.
          const sameTeam = resolvedMode.teamsEnabled &&
            players[moved.ownerId]?.teamId !== undefined &&
            players[moved.ownerId].teamId === player.teamId;
          if (!invuln) {
            const next = { ...player };
            // Frostbite: the deeper the target's chill, the harder the bolt lands.
            //
            // Read the slow BEFORE this bolt applies its own chill. Otherwise every
            // bolt pays itself the bonus on first contact and the talent silently
            // becomes a flat damage increase, which is not what it says it does.
            const slowBefore = (player.slowUntil ?? 0) > tick ? (player.slowFactor ?? 1) : 1;
            const frostbiteMult = !sameTeam ? 1 + (ownerIceBolt?.frostbite ?? 0) * (1 - slowBefore) : 1;
            // Impaler: unlimited pierce (handled below via `survivesHit`), and
            // each enemy already pierced (piercedIds, before this hit is
            // recorded) adds +8% damage to this and every later hit.
            const impalerMult = moved.impaler ? 1 + (moved.piercedIds?.length ?? 0) * IMPALER_PIERCE_DAMAGE_BONUS : 1;
            // Chill reuses the ranger's slow fields; the strongest slow wins
            // so a Blizzard tick cannot be downgraded by a passing bolt.
            if (!sameTeam) {
              const incoming = ownerIceBolt?.chillFactor ?? ICEBOLT_CHILL_FACTOR;
              const existing = (player.slowUntil ?? 0) > tick ? (player.slowFactor ?? 1) : 1;
              next.slowFactor = Math.min(existing, incoming);
              // Absolute Cold: +50% chill duration.
              const chillDurationMult = modifiers[moved.ownerId]?.frozenOrb.absoluteCold ? 1.5 : 1;
              next.slowUntil = tick + Math.round((ownerIceBolt?.chillTicks ?? ICEBOLT_CHILL_TICKS) * chillDurationMult);
              // Flash Freeze: an Ice Bolt hitting an UNCHILLED target roots
              // them, gated by the same 6s per-target ICD (freezeRootReadyAt)
              // the ranger's Deep Freeze shares — a target rooted by either
              // source is protected from both for 6s. `slowBefore === 1`
              // means no active chill going into this hit; without this, a
              // continuously-chilled target would never re-root under the
              // tooltip's rule but would every 6s under the code, so the
              // tooltip (the safer, rarer-CC version) wins.
              if (ownerIceBolt?.flashFreeze && slowBefore === 1 && (next.freezeRootReadyAt ?? 0) <= tick) {
                next.rootUntil = tick + DEEP_FREEZE_ROOT_TICKS;
                next.freezeRootReadyAt = tick + DEEP_FREEZE_COOLDOWN_TICKS;
              }
            }
            next.hp = Math.max(0, next.hp - iceBoltDamage(moved) * frostbiteMult * impalerMult * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode));
            players[pid] = next;
          }
          // Splintering Ice: shatter into `moved.split` ice shards on any
          // physical impact — this is shrapnel, not damage, so it fires
          // whether or not the hit landed (invuln blocks damage/chill, not
          // the shatter). Only original ice bolts carry `.split`; shards
          // never do, so this cannot recurse.
          if ((moved.split ?? 0) > 0) {
            let targetPos: Vec2 | undefined;
            if (moved.flechette) {
              // Flechette: home toward the nearest OTHER enemy instead of
              // scattering — not the target just struck (piercedIds below
              // already blocks re-hitting it, so aiming shards back at it
              // would just waste them).
              let nearestDist = Infinity;
              for (const [otherId, other] of Object.entries(players)) {
                if (otherId === pid || otherId === moved.ownerId || other.hp <= 0) continue;
                if ((other.invisibleUntil ?? 0) > tick) continue;
                if (resolvedMode.teamsEnabled &&
                    players[moved.ownerId]?.teamId !== undefined &&
                    other.teamId === players[moved.ownerId].teamId) continue;
                const d = (other.position.x - moved.position.x) ** 2 + (other.position.y - moved.position.y) ** 2;
                if (d < nearestDist) { nearestDist = d; targetPos = other.position; }
              }
            }
            const shardCount = moved.split!;
            const baseAngle = Math.atan2(moved.velocity.y, moved.velocity.x);
            for (let i = 0; i < shardCount; i++) {
              const angle = targetPos
                ? Math.atan2(targetPos.y - moved.position.y, targetPos.x - moved.position.x)
                : baseAngle + (i * 2 * Math.PI) / shardCount;
              newProjectiles.push({
                id: `ishard_${moved.id}_${i}_${tick}`,
                ownerId: moved.ownerId,
                type: 'iceshard',
                position: { x: moved.position.x, y: moved.position.y },
                velocity: { x: Math.cos(angle) * FROZEN_ORB_SHARD_SPEED, y: Math.sin(angle) * FROZEN_ORB_SHARD_SPEED },
                damageMin: FROZEN_ORB_SHARD_DAMAGE_MIN,
                damageMax: FROZEN_ORB_SHARD_DAMAGE_MAX,
                expiresAt: tick + FROZEN_ORB_SHARD_LIFETIME_TICKS,
                // Must not immediately re-hit the target just struck.
                piercedIds: [pid],
              });
            }
          }
          // Pierce budget is checked before decrementing: this hit consumes
          // one unit of the remaining budget, so the bolt survives only if
          // budget was still available going into it. Shards never carry
          // pierce/impaler, so this naturally resolves to a single hit.
          const survivesHit = moved.impaler || (moved.pierce ?? 0) > 0;
          moved.piercedIds = [...(moved.piercedIds ?? []), pid];
          moved.pierce = (moved.pierce ?? 0) - 1;
          if (survivesHit) survivingProjectiles.push(moved);
          break;
        }
      }
      if (!hit) survivingProjectiles.push(moved);
    } else {
      const moved = advanceFireball(proj, enemyEntry?.[1].position);
      const inGrace = (moved.noHitUntil ?? 0) > tick;
      const expired = isFireballExpired(moved, tick);
      let directHit = false;

      if (!expired && !inGrace) {
        for (const [pid, player] of Object.entries(players)) {
          if (player.hp <= 0) continue;
          if (fireballHitsPlayer(moved, player.position, pid)) {
            directHit = true;
            break;
          }
        }
      }

      if (directHit || expired) {
        const blastRadius = (moved.blastRadius ?? moved.radius ?? FIREBALL_RADIUS) * 7;
        for (const [pid, player] of Object.entries(players)) {
          if (pid === moved.ownerId) continue;
          if (player.hp <= 0) continue;
          const dx = player.position.x - moved.position.x;
          const dy = player.position.y - moved.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > blastRadius + PLAYER_HALF_SIZE) continue;
          // The blast is concussive, not magical — pillars block it.
          if (!hasLineOfSight(moved.position, player.position)) continue;
          const invuln = (player.invulnUntil ?? 0) > tick;
          if (!invuln) {
            const falloff = 1 - Math.min(dist / blastRadius, 1);
            players[pid] = { ...player, hp: Math.max(0, player.hp - fireballDamage(moved) * falloff * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode)) };
          }
        }
        if ((moved.split ?? 0) > 0) {
          const angles = [-0.4, 0, 0.4];
          for (const offset of angles) {
            const baseAngle = Math.atan2(moved.velocity.y, moved.velocity.x) + offset;
            const spd = Math.sqrt(moved.velocity.x ** 2 + moved.velocity.y ** 2);
            const child = spawnFireball(moved.ownerId, moved.position, {
              x: moved.position.x + Math.cos(baseAngle) * 100,
              y: moved.position.y + Math.sin(baseAngle) * 100,
            }, {
              speed: spd, radius: moved.radius, damageMin: moved.damageMin, damageMax: moved.damageMax,
              // Grace: fly clear of the obstacle/target the parent detonated
              // on instead of instantly re-detonating (stacked ~4x damage).
              noHitUntil: tick + 6,
            });
            // Children born out of bounds are dropped, not detonated.
            if (!isFireballExpired(child, tick)) newProjectiles.push(child);
          }
        }
      } else {
        survivingProjectiles.push(moved);
      }
    }
  }
  projectiles = [...survivingProjectiles, ...newProjectiles];

  // 3b. Advance frozen orbs — drift forward, spray a radial volley of ice
  // shards on the interval, then expire and vanish.
  //
  // Expiry is checked before the volley-due check, not after: the lifetime
  // (150 ticks) is an exact multiple of the volley interval (15 ticks), so
  // the 10th volley's reschedule lands nextVolleyAt on exactly the expiry
  // tick. Checking due first would fire an unintended 11th volley on the
  // same tick the orb is removed.
  const survivingOrbs: FrozenOrbState[] = [];
  for (const orb of frozenOrbs) {
    const advancedOrb = advanceFrozenOrb(orb);
    // The orb has no radius field of its own — isIceBoltExpired's bounds/
    // pillar predicate defaults to ICEBOLT_RADIUS, a reasonable point-check.
    // Without this, an orb that drifts past the arena wall or into a pillar
    // keeps "firing" volleys whose shards spawn out of bounds and are
    // dropped on their first step — a silent fizzle instead of an expiry.
    if (isFrozenOrbExpired(advancedOrb, tick) || isIceBoltExpired(advancedOrb)) {
      // Cataclysmic Orb keystone: detonate exactly once, on the tick the orb
      // expires (never before — this branch only runs once expiry is true —
      // and never again, since the orb is dropped this same tick).
      if (advancedOrb.detonateOnExpiry) {
        for (const [pid, player] of Object.entries(players)) {
          if (pid === advancedOrb.ownerId || player.hp <= 0) continue;
          const dx = player.position.x - advancedOrb.position.x;
          const dy = player.position.y - advancedOrb.position.y;
          if (dx * dx + dy * dy > (CATACLYSMIC_ORB_RADIUS + PLAYER_HALF_SIZE) ** 2) continue;
          const invuln = (player.invulnUntil ?? 0) > tick;
          if (!invuln) {
            players[pid] = {
              ...player,
              hp: Math.max(0, player.hp - CATACLYSMIC_ORB_DAMAGE * getDamageMultiplier(advancedOrb.ownerId, pid, players, resolvedMode)),
            };
          }
        }
      }
      continue;
    }
    if (orbVolleyDue(advancedOrb, tick)) {
      projectiles = [...projectiles, ...spawnOrbVolley(advancedOrb, tick)];
      survivingOrbs.push({ ...advancedOrb, nextVolleyAt: tick + FROZEN_ORB_VOLLEY_INTERVAL_TICKS });
    } else {
      survivingOrbs.push(advancedOrb);
    }
  }
  frozenOrbs = survivingOrbs;

  // 3c. Ice Ray beam damage. Re-resolved every tick from the caster's live
  // position and aim; the ramp is already reflected in channelTicks.
  for (const [id, p] of Object.entries(players)) {
    if (p.channelSpell !== 12 || !p.channelEnd || p.hp <= 0) continue;
    const ramp = iceRayRamp(p.channelTicks ?? 0);
    for (const [pid, target] of Object.entries(players)) {
      if (pid === id || target.hp <= 0) continue;
      if ((target.invulnUntil ?? 0) > tick) continue;
      if (!iceRayHitsPlayer(p.position, p.channelEnd, target.position, ramp.halfWidth)) continue;

      const sameTeam = resolvedMode.teamsEnabled &&
        players[id]?.teamId !== undefined &&
        players[id].teamId === target.teamId;

      const next = { ...target };
      if (!sameTeam) {
        const incoming = ICEBOLT_CHILL_FACTOR;
        const existing = (target.slowUntil ?? 0) > tick ? (target.slowFactor ?? 1) : 1;
        next.slowFactor = Math.min(existing, incoming);
        next.slowUntil = tick + ICEBOLT_CHILL_TICKS;
      }
      next.hp = Math.max(0, next.hp - ramp.damagePerTick * getDamageMultiplier(id, pid, players, resolvedMode));
      players[pid] = next;
    }
  }

  // 4. Fire wall / rain zone damage (fireWalls already expiry-filtered and
  // Stormcall-drifted above, before the arrow-hit section)
  const rainTicked = new Set<string>();   // `${ownerId}:${pid}` — one zone tick per owner per target per tick
  for (const fw of fireWalls) {
    const isRainZone = fw.kind === 'rain';
    const isBlizzard = fw.kind === 'blizzard';
    const widthMult = isRainZone || isBlizzard ? 1 : (modifiers[fw.ownerId]?.firewall.widthMultiplier ?? 1);
    for (const [pid] of Object.entries(players)) {
      if (fireWallDamagesPlayer(fw, players[pid].position, pid, widthMult)) {
        if (isRainZone) {
          const dupKey = `${fw.ownerId}:${pid}`;
          if (rainTicked.has(dupKey)) continue;
          rainTicked.add(dupKey);
        }
        const invuln = (players[pid].invulnUntil ?? 0) > tick;
        if (!invuln) {
          // Rimeheart: extends Frostbite's damage-scales-with-slow bonus from
          // Ice Bolt alone to Blizzard too. Read the slow BEFORE this zone's
          // own chill refresh below, for the same reason the Ice Bolt branch
          // reads it pre-chill: otherwise the zone would pay itself the bonus
          // every tick regardless of any pre-existing chill. Gated on
          // !sameTeam — a chilled teammate must not take amplified friendly
          // fire (mirrors the Ice Bolt branch's frostbiteMult gate).
          const ownerIceBolt = modifiers[fw.ownerId]?.iceBolt;
          const rimeheartSameTeam = resolvedMode.teamsEnabled &&
            players[fw.ownerId]?.teamId !== undefined &&
            players[fw.ownerId].teamId === players[pid].teamId;
          const blizzardSlowBefore = (players[pid].slowUntil ?? 0) > tick ? (players[pid].slowFactor ?? 1) : 1;
          const rimeheartMult = (isBlizzard && ownerIceBolt?.rimeheart && !rimeheartSameTeam)
            ? 1 + ownerIceBolt.frostbite * (1 - blizzardSlowBefore)
            : 1;
          const dmg = isRainZone
            ? RAIN_DAMAGE_PER_TICK * (rangerMods[fw.ownerId]?.rain.damageMultiplier ?? 1)
                * exposedMultiplier(fw.ownerId, rangerMods[fw.ownerId], players[pid].position, fireWalls)
            : isBlizzard
            ? (fw.noDamage ? 0 : BLIZZARD_DAMAGE_PER_TICK * (modifiers[fw.ownerId]?.blizzard.damageMultiplier ?? 1) * rimeheartMult)
            : FIREWALL_DAMAGE_PER_TICK * (modifiers[fw.ownerId]?.firewall.damageMultiplier ?? 1);
          players[pid] = { ...players[pid], hp: Math.max(0, players[pid].hp - dmg * getDamageMultiplier(fw.ownerId, pid, players, resolvedMode)) };
          if (isRainZone) {
            const ownerAM = rangerMods[fw.ownerId];
            const sameTeam = resolvedMode.teamsEnabled &&
              players[fw.ownerId]?.teamId !== undefined &&
              players[fw.ownerId].teamId === players[pid].teamId;
            if (ownerAM && ownerAM.element !== 'none' && players[pid].hp > 0 && !sameTeam) {
              applyElementStatus(players[pid], ownerAM, players[fw.ownerId]?.statMults.damage ?? 1, tick);
            }
          }
          if (isBlizzard && players[pid].hp > 0) {
            // Chill reuses the ranger's slow fields; the strongest slow wins
            // so repeated per-tick chill refreshes rather than compounds.
            // Teammates take the (already reduced) damage but never the
            // chill — mirrors the Ice Bolt rule at :568-576.
            const sameTeam = resolvedMode.teamsEnabled &&
              players[fw.ownerId]?.teamId !== undefined &&
              players[fw.ownerId].teamId === players[pid].teamId;
            if (!sameTeam) {
              const target = players[pid];
              const incoming = ICEBOLT_CHILL_FACTOR;
              const existing = (target.slowUntil ?? 0) > tick ? (target.slowFactor ?? 1) : 1;
              target.slowFactor = Math.min(existing, incoming);
              // Absolute Cold: +50% chill duration.
              const chillDurationMult = modifiers[fw.ownerId]?.frozenOrb.absoluteCold ? 1.5 : 1;
              target.slowUntil = tick + Math.round(ICEBOLT_CHILL_TICKS * chillDurationMult);
            }
          }
        }
      }
    }
  }

  // 4a. Absolute Zero keystone: per-target dwell tracking lives on the zone
  // (not the player), so two overlapping blizzards from different casters
  // never share a timer. The dwell map is rebuilt fresh every tick from who
  // is currently standing inside — a target who has left the zone is simply
  // absent from the new map, which is how the dwell resets. Excludes
  // Permafrost's lingering (`noDamage`) zone — that is leftover chilled
  // ground, not an active Blizzard to dwell in.
  fireWalls = fireWalls.map(fw => {
    if (fw.kind !== 'blizzard' || fw.noDamage || !modifiers[fw.ownerId]?.blizzard.absoluteZero) return fw;
    const dwell: Record<string, number> = {};
    for (const [pid, player] of Object.entries(players)) {
      if (player.hp <= 0) continue;
      if (!fireWallDamagesPlayer(fw, player.position, pid, 1)) continue;
      // Invulnerability (e.g. an evade mid-dwell) pauses dwell accrual — no
      // other status accrues through i-frames — and blocks the root itself,
      // matching every sibling root/damage check in this file (Flash Freeze
      // at :626, the blizzard damage/chill block at :843, etc).
      const invulnP = (player.invulnUntil ?? 0) > tick;
      const ticksInside = invulnP ? (fw.dwell?.[pid] ?? 0) : (fw.dwell?.[pid] ?? 0) + 1;
      dwell[pid] = ticksInside;
      if (invulnP) continue;
      const sameTeam = resolvedMode.teamsEnabled &&
        players[fw.ownerId]?.teamId !== undefined &&
        players[fw.ownerId].teamId === player.teamId;
      if (ticksInside >= ABSOLUTE_ZERO_DWELL_TICKS && !sameTeam && (player.freezeRootReadyAt ?? 0) <= tick) {
        players[pid] = {
          ...player,
          rootUntil: tick + DEEP_FREEZE_ROOT_TICKS,
          freezeRootReadyAt: tick + DEEP_FREEZE_COOLDOWN_TICKS,
        };
      }
    }
    return { ...fw, dwell };
  });

  // 5. Meteor detonations
  const survivingMeteors = [];
  for (const m of meteors) {
    if (meteorDetonates(m, tick)) {
      for (const [pid] of Object.entries(players)) {
        if (meteorHitsPlayer(m, players[pid].position, pid)) {
          const invuln = (players[pid].invulnUntil ?? 0) > tick;
          if (!invuln) {
            players[pid] = { ...players[pid], hp: Math.max(0, players[pid].hp - meteorDamage() * getDamageMultiplier(m.ownerId, pid, players, resolvedMode)) };
          }
        }
      }
      if (m.moltenImpact) {
        const crater = spawnFireCrater(m.ownerId, { ...m.target }, m.aoeRadius, tick, 3 * TICK_RATE);
        fireWalls = [...fireWalls, crater];
      }
    } else {
      survivingMeteors.push(m);
    }
  }

  // 5b. Rain of Arrows detonations — creates a damage zone (no burst)
  const survivingRain: RainOfArrowsState[] = [];
  for (const rain of rainOfArrows) {
    if (rainDetonates(rain, tick)) {
      const ownerAMods = rangerMods[rain.ownerId];
      const rainDurMult = ownerAMods?.rain.durationMultiplier ?? 1;
      fireWalls = [...fireWalls, {
        id: `rain_zone_${rain.id}`,
        kind: 'rain',
        ownerId: rain.ownerId,
        segments: [],
        expiresAt: tick + Math.round(RAIN_SUSTAINED_TICKS * rainDurMult),
        shape: 'circle' as const,
        center: { ...rain.target },
        radius: rain.radius,
      }];
    } else {
      survivingRain.push(rain);
    }
  }
  rainOfArrows = survivingRain;

  // 5c. Damage breaks rest: any hp loss since the post-regen snapshot —
  // projectile, zone, meteor, or DoT — cancels the wind-up and the regen.
  for (const [id, hpBefore] of Object.entries(restHpSnapshot)) {
    const p = players[id];
    if (p && p.hp < hpBefore) {
      p.restCastEndTick = undefined;
      p.resting = undefined;
    }
  }

  // 6. Win condition
  let phase = state.phase;
  let winner = state.winner;
  if (phase !== 'ended') {
    const result = resolvedMode.checkWinCondition(players, state.teams);
    phase = result.phase;
    winner = result.winner;
  }

  return { tick: tick + 1, players, projectiles, fireWalls, meteors: survivingMeteors, rainOfArrows, echoVolleys, frozenOrbs, phase, winner, gameMode: state.gameMode, teams: state.teams };
}

function deepCopyPlayers(players: Record<string, PlayerState>): Record<string, PlayerState> {
  const copy: Record<string, PlayerState> = {};
  for (const [id, p] of Object.entries(players)) {
    copy[id] = {
      ...p,
      position: { ...p.position },
      cooldowns: { ...p.cooldowns },
      teleported: undefined,
      evadeOrigin: p.evadeOrigin ? { ...p.evadeOrigin } : undefined,
      evadeTarget: p.evadeTarget ? { ...p.evadeTarget } : undefined,
    };
  }
  return copy;
}

/**
 * Combined damage scalar for a hit: the attacker's gear damageMult (folded
 * in here so every direct-hit call site — arrow, fireball, fire wall/rain
 * zone tick, meteor — gets it for free) times the friendly-fire multiplier
 * when applicable. Burn/poison DoTs don't call this — see the elemental
 * status-effect application below, which bakes the attacker's mult directly
 * into burnDps/poisonDps at apply time instead.
 */
function getDamageMultiplier(
  ownerId: string,
  targetId: string,
  players: Record<string, PlayerState>,
  mode: GameModeConfig,
): number {
  const atkMult = players[ownerId]?.statMults.damage ?? 1;
  if (!mode.teamsEnabled) return atkMult;
  const ownerTeam = players[ownerId]?.teamId;
  const targetTeam = players[targetId]?.teamId;
  if (ownerTeam && targetTeam && ownerTeam === targetTeam) {
    return atkMult * mode.friendlyFireMultiplier;
  }
  return atkMult;
}
