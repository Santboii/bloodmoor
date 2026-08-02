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
    const rooted = (p.rootUntil ?? 0) > tick;
    const speedMult = rooted ? 0 : ((p.slowUntil ?? 0) > tick ? (p.slowFactor ?? 1) : 1) * p.statMults.moveSpeed;
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
    players[id] = {
      ...p,
      position: dashing.has(id) ? p.position : movePlayer(p.position, input.move, speedMult),
      mana: newMana,
      facing: newFacing,
      cooldowns: newCooldowns,
      castingSpell: null,
      phantomStepUntil: phantomActive ? p.phantomStepUntil : undefined,
      evadeCharges,
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
      })];
    } else if (spell === 10) {
      const m = mods.blizzard;
      fireWalls = [...fireWalls, spawnBlizzard(id, input.aimTarget, tick, {
        durationMultiplier: m.durationMultiplier,
        radiusMultiplier:   m.radiusMultiplier,
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

  // Expire fire walls / rain zones and apply Stormcall drift before the
  // arrow-hit section below, so exposedMultiplier and in-zone checks this
  // tick see the zone's current (not stale, not-yet-expired) position.
  fireWalls = fireWalls.filter(fw => tick < fw.expiresAt);
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
      if (isIceBoltExpired(moved)) continue;
      let hit = false;
      for (const [pid, player] of Object.entries(players)) {
        if (player.hp <= 0) continue;
        if (iceBoltHitsPlayer(moved, player.position, pid)) {
          hit = true;
          const invuln = (player.invulnUntil ?? 0) > tick;
          if (!invuln) {
            const next = { ...player };
            const ownerIceBolt = modifiers[moved.ownerId]?.iceBolt;
            // Frostbite: the deeper the target's chill, the harder the bolt lands.
            //
            // Read the slow BEFORE this bolt applies its own chill. Otherwise every
            // bolt pays itself the bonus on first contact and the talent silently
            // becomes a flat damage increase, which is not what it says it does.
            const slowBefore = (player.slowUntil ?? 0) > tick ? (player.slowFactor ?? 1) : 1;
            const frostbiteMult = 1 + (ownerIceBolt?.frostbite ?? 0) * (1 - slowBefore);
            // Chill reuses the ranger's slow fields; the strongest slow wins
            // so a Blizzard tick cannot be downgraded by a passing bolt.
            //
            // Teammates take the (already reduced) damage but never the
            // chill — the same rule the arrow branch applies to elemental
            // status, for the same reason: a full-strength slow would
            // undercut deliberately-reduced friendly fire. See :523-525.
            const sameTeam = resolvedMode.teamsEnabled &&
              players[moved.ownerId]?.teamId !== undefined &&
              players[moved.ownerId].teamId === player.teamId;
            if (!sameTeam) {
              const incoming = ownerIceBolt?.chillFactor ?? ICEBOLT_CHILL_FACTOR;
              const existing = (player.slowUntil ?? 0) > tick ? (player.slowFactor ?? 1) : 1;
              next.slowFactor = Math.min(existing, incoming);
              next.slowUntil = tick + (ownerIceBolt?.chillTicks ?? ICEBOLT_CHILL_TICKS);
            }
            next.hp = Math.max(0, next.hp - iceBoltDamage(moved) * frostbiteMult * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode));
            players[pid] = next;
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
    if (isFrozenOrbExpired(advancedOrb, tick)) continue;
    if (orbVolleyDue(advancedOrb, tick)) {
      projectiles = [...projectiles, ...spawnOrbVolley(advancedOrb, tick)];
      survivingOrbs.push({ ...advancedOrb, nextVolleyAt: tick + FROZEN_ORB_VOLLEY_INTERVAL_TICKS });
    } else {
      survivingOrbs.push(advancedOrb);
    }
  }
  frozenOrbs = survivingOrbs;

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
          const dmg = isRainZone
            ? RAIN_DAMAGE_PER_TICK * (rangerMods[fw.ownerId]?.rain.damageMultiplier ?? 1)
                * exposedMultiplier(fw.ownerId, rangerMods[fw.ownerId], players[pid].position, fireWalls)
            : isBlizzard
            ? BLIZZARD_DAMAGE_PER_TICK * (modifiers[fw.ownerId]?.blizzard.damageMultiplier ?? 1)
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
              target.slowUntil = tick + ICEBOLT_CHILL_TICKS;
            }
          }
        }
      }
    }
  }

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
