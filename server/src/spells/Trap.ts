import {
  TRAP_LIFETIME_TICKS, DEADFALL_ARM_TICKS, COUNTERMEASURE_RADIUS_RATIO,
} from '@arena/shared';
import type { TrapState, TrapKind, Vec2 } from '@arena/shared';
import type { TrapModifiers, DeadfallModifiers } from '../skills/RangerModifiers.ts';

let _id = 0;
const nextId = () => `trap_${++_id}`;

const within = (a: Vec2, b: Vec2, r: number) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r;

/** A Spike Trap. Every payload value is copied off the modifiers here and
 *  never re-read — see the note on TrapState. */
export function spawnSpikeTrap(ownerId: string, position: Vec2, tick: number, m: TrapModifiers): TrapState {
  return {
    id: nextId(),
    ownerId,
    kind: 'spike',
    position: { x: position.x, y: position.y },
    armedAt: tick + m.armTicks,
    expiresAt: tick + TRAP_LIFETIME_TICKS,
    triggerRadius: m.triggerRadius,
    blastRadius: m.blastRadius,
    damageMin: m.damageMin,
    damageMax: m.damageMax,
    shardCount: m.shardCount,
    shardsHome: m.shardsHome,
    slowFactor: m.slowFactor,
    slowTicks: m.slowTicks,
    roots: false,
    countermeasure: m.countermeasure,
    chainRadius: 0,
    chainDamageMultiplier: 1,
  };
}

/** Deadfall. Takes both modifier sets: shard/slow riders come from the shared
 *  trap modifiers, damage and chain behaviour from its own. Quick Hands does
 *  not apply — Deadfall's 1s arm time is part of its cost. */
export function spawnDeadfall(
  ownerId: string, position: Vec2, tick: number, t: TrapModifiers, d: DeadfallModifiers,
): TrapState {
  return {
    id: nextId(),
    ownerId,
    kind: 'deadfall',
    position: { x: position.x, y: position.y },
    armedAt: tick + DEADFALL_ARM_TICKS,
    expiresAt: tick + TRAP_LIFETIME_TICKS,
    triggerRadius: d.triggerRadius,
    blastRadius: d.blastRadius,
    damageMin: d.damageMin,
    damageMax: d.damageMax,
    shardCount: t.shardCount,
    shardsHome: t.shardsHome,
    slowFactor: t.slowFactor,
    slowTicks: t.slowTicks,
    roots: d.roots,
    countermeasure: t.countermeasure,
    chainRadius: d.chainRadius,
    chainDamageMultiplier: d.chainDamageMultiplier,
  };
}

export const trapIsArmed = (trap: TrapState, tick: number) => tick >= trap.armedAt;
export const trapIsExpired = (trap: TrapState, tick: number) => tick >= trap.expiresAt;

/** Would this trap fire on `targetId` standing at `targetPos` this tick?
 *  `mobilityLanded` is true on the tick a dash, leap or teleport put the
 *  target where they now are — Countermeasure extends the radius for that
 *  case only. */
export function trapTriggersOn(
  trap: TrapState,
  targetPos: Vec2,
  targetId: string,
  opts: { tick: number; mobilityLanded?: boolean },
): boolean {
  if (targetId === trap.ownerId) return false;
  if (!trapIsArmed(trap, opts.tick)) return false;
  if (within(trap.position, targetPos, trap.triggerRadius)) return true;
  if (trap.countermeasure && opts.mobilityLanded) {
    return within(trap.position, targetPos, trap.triggerRadius * COUNTERMEASURE_RADIUS_RATIO);
  }
  return false;
}

/** Blast coverage once the trap has fired. Wider than the trigger radius, so
 *  a trap set off by someone else still catches a nearby third party. */
export function trapDamagesPlayer(trap: TrapState, targetPos: Vec2, targetId: string): boolean {
  if (targetId === trap.ownerId) return false;
  return within(trap.position, targetPos, trap.blastRadius);
}

/** The full set a Deadfall detonation fires: the detonator first, then every
 *  other trap it owns within `chainRadius`. Deliberately one level deep — a
 *  chained trap does not collect further traps, so nothing can fire twice and
 *  a spread of traps cannot cascade across the whole map. */
export function collectChain(detonator: TrapState, traps: TrapState[]): TrapState[] {
  const chained = traps.filter(t =>
    t.id !== detonator.id &&
    t.ownerId === detonator.ownerId &&
    (detonator.chainRadius === Infinity || within(detonator.position, t.position, detonator.chainRadius)),
  );
  return [detonator, ...chained];
}

/** Enforce a per-owner, per-kind armed cap at plant time by dropping oldest
 *  first. Call BEFORE pushing the new trap: pass the cap the new one must fit
 *  under. Other players' traps are never touched. Relies on `traps` being in
 *  plant order, which holds — the array is only ever appended to. */
export function evictOldest(traps: TrapState[], ownerId: string, kind: TrapKind, cap: number): TrapState[] {
  const mine = traps.filter(t => t.ownerId === ownerId && t.kind === kind);
  const excess = mine.length - (cap - 1);
  if (excess <= 0) return traps;
  const doomed = new Set(mine.slice(0, excess).map(t => t.id));
  return traps.filter(t => !doomed.has(t.id));
}
