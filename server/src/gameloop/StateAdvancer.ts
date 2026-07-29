import {
  GameState, PlayerState, InputFrame, Vec2, SpellId, NodeId,
  SPELL_CONFIG, MAX_HP, MAX_MANA, MANA_REGEN_PER_TICK, TICK_RATE,
  FIREWALL_DAMAGE_PER_TICK, FIREWALL_MAX_LENGTH, TELEPORT_MAX_RANGE, METEOR_AOE_RADIUS, FIREBALL_RADIUS, PLAYER_HALF_SIZE,
  DUEL_MODE,
  ARROW_SPEED, EVADE_RANGE, EVADE_INVULN_TICKS, EVADE_DURATION_TICKS,
  RAIN_SUSTAINED_TICKS, RAIN_DAMAGE_PER_TICK,
} from '@arena/shared';
import type { CharacterClass } from '@arena/shared';
import type { GameModeConfig, RainOfArrowsState } from '@arena/shared';
import { SPELL_BINDINGS, CLASS_DEFAULT_NODE, classOfSpell } from '@arena/shared';
import { movePlayer, clampToArena, resolvePlayerPillarCollisions, clampTeleport } from '../physics/Movement.ts';
import { hasLineOfSight } from '../physics/LineOfSight.ts';
import { spawnFireball, advanceFireball, isFireballExpired, fireballHitsPlayer, fireballDamage } from '../spells/Fireball.ts';
import { spawnFireWall, spawnFireCrater, fireWallDamagesPlayer } from '../spells/FireWall.ts';
import { spawnMeteor, meteorDetonates, meteorHitsPlayer, meteorDamage } from '../spells/Meteor.ts';
import { buildSpellModifiers } from '../skills/SpellModifiers.ts';
import { spawnArrow, advanceArrow, isArrowExpired, arrowHitsPlayer, arrowDamage } from '../spells/Arrow.ts';
import { spawnRainOfArrows, rainDetonates } from '../spells/RainOfArrows.ts';
import { buildAmazonModifiers } from '../skills/AmazonModifiers.ts';

export type PlayerInit = { id: string; displayName: string; charClass: CharacterClass; spawnPos: Vec2 };

function getSpellNodeMap(skills: Map<NodeId, number>): Partial<Record<SpellId, NodeId>> {
  const cls: CharacterClass = skills.has(CLASS_DEFAULT_NODE.amazon) ? 'amazon' : 'mage';
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
    playerMap[p.id] = {
      id: p.id,
      displayName: p.displayName,
      charClass: p.charClass,
      position: resolvePlayerPillarCollisions(clampToArena({ ...p.spawnPos })),
      hp: MAX_HP,
      mana: MAX_MANA,
      facing: 0,
      castingSpell: null,
      cooldowns: {},
      teamId: teamLookup[p.id],
    };
  }
  return { tick: 0, players: playerMap, projectiles: [], fireWalls: [], meteors: [], rainOfArrows: [], phase: 'dueling', winner: null, gameMode: mode?.type ?? '1v1', teams };
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
  const amazonMods = Object.fromEntries(
    Object.keys(players).map(id => {
      const skills = skillSets[id] ?? new Map();
      const isAmazon = skills.has('archer.power_shot' as NodeId);
      return [id, isAmazon ? buildAmazonModifiers(skills) : null];
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
    }
    if ((p.burnUntil ?? 0) <= tick) { p.burnUntil = undefined; p.burnDps = undefined; }
    if ((p.slowUntil ?? 0) <= tick) { p.slowUntil = undefined; p.slowFactor = undefined; }
    if ((p.poisonUntil ?? 0) <= tick) { p.poisonUntil = undefined; p.poisonDps = undefined; p.poisonManaReduction = undefined; }
    if ((p.invisibleUntil ?? 0) <= tick) p.invisibleUntil = undefined;
  }

  // 1. Move players and apply mana regen
  for (const [id, input] of Object.entries(inputs)) {
    const p = players[id];
    if (!p || p.hp <= 0) continue;
    const poisonActive = (p.poisonUntil ?? 0) > tick;
    const regen = MANA_REGEN_PER_TICK * (poisonActive ? Math.max(0, 1 - (p.poisonManaReduction ?? 0)) : 1);
    const newMana = Math.min(MAX_MANA, p.mana + regen);
    const speedMult = (p.slowUntil ?? 0) > tick ? (p.slowFactor ?? 1) : 1;
    const newFacing = input.aimTarget
      ? Math.atan2(input.aimTarget.y - p.position.y, input.aimTarget.x - p.position.x)
      : p.facing;
    const newCooldowns: Partial<Record<SpellId, number>> = {};
    for (const [k, v] of Object.entries(p.cooldowns)) {
      const remaining = (v as number) - 1;
      if (remaining > 0) newCooldowns[Number(k) as SpellId] = remaining;
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
    };
  }

  // 2. Process spell casts
  let projectiles = [...state.projectiles];
  let fireWalls = [...state.fireWalls];
  let meteors = [...state.meteors];
  let rainOfArrows: RainOfArrowsState[] = [...state.rainOfArrows];

  for (const [id, input] of Object.entries(inputs)) {
    const p = players[id];
    if (!p || p.hp <= 0 || !input.castSpell) continue;
    if (dashing.has(id)) continue;
    const spell = input.castSpell;
    const mods = modifiers[id];
    // Amazon spells need amazon modifiers — bail before burning mana/cooldown.
    if (classOfSpell(spell) === 'amazon' && !amazonMods[id]) continue;

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
    if (p.mana < effectiveManaCost) continue;
    if ((p.cooldowns[spell] ?? 0) > 0) continue;

    let cooldownTicks = cfg.cooldownTicks;
    if (spell === 8 && amazonMods[id]) {
      cooldownTicks = Math.round(cfg.cooldownTicks * amazonMods[id]!.evade.cooldownMultiplier);
    }

    players[id] = {
      ...p,
      mana: p.mana - effectiveManaCost,
      cooldowns: phantomActive ? { ...p.cooldowns } : { ...p.cooldowns, [spell]: cooldownTicks },
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
    } else if (spell === 5) {
      const aMods = amazonMods[id];
      if (!aMods) continue;
      const arrow = spawnArrow(id, p.position, input.aimTarget, {
        speed: aMods.arrow.speed,
        damageMin: aMods.arrow.damageMin,
        damageMax: aMods.arrow.damageMax,
        homing: aMods.arrow.homing,
        homingTickReduction: aMods.arrow.homingTickReduction,
        guidedRedirects: aMods.arrow.guidedRedirects,
      });
      projectiles = [...projectiles, arrow];
    } else if (spell === 6) {
      const aMods = amazonMods[id];
      if (!aMods) continue;
      const count = aMods.multishot.arrowCount;
      const spreadPerArrow = Math.PI / (count + 1) * 0.4;
      const baseAngle = Math.atan2(input.aimTarget.y - p.position.y, input.aimTarget.x - p.position.x);
      const volley = [];
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (i - (count - 1) / 2) * spreadPerArrow;
        const target = { x: p.position.x + Math.cos(angle) * 500, y: p.position.y + Math.sin(angle) * 500 };
        volley.push(spawnArrow(id, p.position, target, {
          speed: aMods.arrow.speed,
          damageMin: aMods.multishot.damageMin,
          damageMax: aMods.multishot.damageMax,
          homing: 0,
        }));
      }
      projectiles = [...projectiles, ...volley];
    } else if (spell === 7) {
      const aMods = amazonMods[id];
      if (!aMods) continue;
      rainOfArrows = [...rainOfArrows, spawnRainOfArrows(id, input.aimTarget, tick, {
        sustained: aMods.rain.sustained,
        piercing: aMods.rain.piercing,
        radiusMultiplier: aMods.rain.radiusMultiplier,
      })];
    } else if (spell === 8) {
      const aMods = amazonMods[id];
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

  // 3. Advance projectiles, check hits
  const survivingProjectiles = [];
  const newProjectiles: typeof projectiles = [];
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
      const moved = advanceArrow(proj, enemyEntry?.[1].position);
      if (isArrowExpired(moved)) continue;
      let hit = false;
      for (const [pid, player] of Object.entries(players)) {
        if (player.hp <= 0) continue;
        if (arrowHitsPlayer(moved, player.position, pid)) {
          const invuln = (player.invulnUntil ?? 0) > tick;
          if (!invuln) {
            const next = { ...player, hp: Math.max(0, player.hp - arrowDamage(moved.damageMin, moved.damageMax) * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode)) };
            // Elemental arrows apply the shooter's status effect on hit —
            // but never full-strength slows/DoTs on teammates (friendly fire
            // is deliberately reduced; a full 2s slow would undercut that).
            const sameTeam = resolvedMode.teamsEnabled &&
              players[moved.ownerId]?.teamId !== undefined &&
              players[moved.ownerId].teamId === player.teamId;
            const ownerAM = amazonMods[moved.ownerId];
            if (ownerAM && ownerAM.element !== 'none' && next.hp > 0 && !sameTeam) {
              const el = ownerAM.elemental;
              if (ownerAM.element === 'burn') {
                next.burnUntil = tick + Math.round(el.burn.duration * TICK_RATE);
                next.burnDps = el.burn.damagePerSecond;
              } else if (ownerAM.element === 'freeze') {
                next.slowUntil = tick + Math.round(el.freeze.duration * TICK_RATE);
                next.slowFactor = Math.max(0, 1 - el.freeze.slowPercent);
              } else if (ownerAM.element === 'poison') {
                next.poisonUntil = tick + Math.round(el.poison.duration * TICK_RATE);
                next.poisonDps = el.poison.damagePerSecond;
                next.poisonManaReduction = el.poison.manaRegenReduction;
              }
            }
            players[pid] = next;
          }
          hit = true;
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

  // 4. Fire wall / rain zone damage
  fireWalls = fireWalls.filter(fw => tick < fw.expiresAt);
  for (const fw of fireWalls) {
    const isRainZone = fw.id.startsWith('rain_zone_');
    const widthMult = isRainZone ? 1 : (modifiers[fw.ownerId]?.firewall.widthMultiplier ?? 1);
    for (const [pid] of Object.entries(players)) {
      if (fireWallDamagesPlayer(fw, players[pid].position, pid, widthMult)) {
        const invuln = (players[pid].invulnUntil ?? 0) > tick;
        if (!invuln) {
          const dmg = isRainZone
            ? RAIN_DAMAGE_PER_TICK * (amazonMods[fw.ownerId]?.rain.damageMultiplier ?? 1)
            : FIREWALL_DAMAGE_PER_TICK * (modifiers[fw.ownerId]?.firewall.damageMultiplier ?? 1);
          players[pid] = { ...players[pid], hp: Math.max(0, players[pid].hp - dmg * getDamageMultiplier(fw.ownerId, pid, players, resolvedMode)) };
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
      const ownerAMods = amazonMods[rain.ownerId];
      const rainDurMult = ownerAMods?.rain.durationMultiplier ?? 1;
      fireWalls = [...fireWalls, {
        id: `rain_zone_${rain.id}`,
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

  return { tick: tick + 1, players, projectiles, fireWalls, meteors: survivingMeteors, rainOfArrows, phase, winner, gameMode: state.gameMode, teams: state.teams };
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

function getDamageMultiplier(
  ownerId: string,
  targetId: string,
  players: Record<string, PlayerState>,
  mode: GameModeConfig,
): number {
  if (!mode.teamsEnabled) return 1;
  const ownerTeam = players[ownerId]?.teamId;
  const targetTeam = players[targetId]?.teamId;
  if (ownerTeam && targetTeam && ownerTeam === targetTeam) {
    return mode.friendlyFireMultiplier;
  }
  return 1;
}
