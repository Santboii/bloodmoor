import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { TRAP_ARM_TICKS, SPELL_CONFIG, DEEP_FREEZE_ROOT_TICKS, CALTROPS_DAMAGE_PER_TICK } from '@arena/shared';
import type { GameState, InputFrame, NodeId } from '@arena/shared';

const HUNTER: [NodeId, number][] = [
  ['archer.power_shot', 1], ['hunter.spike_trap', 1],
  ['hunter.tripwire', 1], ['hunter.caltrops', 1], ['hunter.deadfall', 1],
];

function setup(ranks: [NodeId, number][] = HUNTER) {
  const state = makeInitialState([
    { id: 'p1', displayName: 'Trapper', charClass: 'ranger', spawnPos: { x: 400, y: 500 } },
    { id: 'p2', displayName: 'Victim',  charClass: 'ranger', spawnPos: { x: 900, y: 500 } },
  ]);
  const skills = { p1: new Map(ranks), p2: new Map<NodeId, number>([['archer.power_shot', 1]]) };
  return { state, skills };
}

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
const cast = (spell: number, at: { x: number; y: number }): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: spell as InputFrame['castSpell'], aimTarget: at });

/** Run `n` idle ticks. */
function idleFor(s: GameState, skills: Record<string, Map<NodeId, number>>, n: number): GameState {
  let cur = s;
  for (let i = 0; i < n; i++) cur = advanceState(cur, { p1: idle(), p2: idle() }, skills);
  return cur;
}

describe('planting', () => {
  it('plants a dormant trap that is not yet armed', () => {
    const { state, skills } = setup();
    const next = advanceState(state, { p1: cast(17, { x: 700, y: 500 }), p2: idle() }, skills);
    expect(next.traps).toHaveLength(1);
    expect(next.traps[0].ownerId).toBe('p1');
    expect(next.traps[0].armedAt).toBeGreaterThan(next.tick);
  });

  it('refuses hunter spells for a player with no ranger modifiers (guest)', () => {
    const { state } = setup();
    const next = advanceState(state, { p1: cast(17, { x: 700, y: 500 }), p2: idle() }, {});
    expect(next.traps).toHaveLength(0);
  });

  it('evicts the oldest trap past the armed cap of two', () => {
    const { state, skills } = setup();
    let cur = advanceState(state, { p1: cast(17, { x: 600, y: 500 }), p2: idle() }, skills);
    const first = cur.traps[0].id;
    cur = idleFor(cur, skills, SPELL_CONFIG[17].cooldownTicks);
    cur = advanceState(cur, { p1: cast(17, { x: 650, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, SPELL_CONFIG[17].cooldownTicks);
    cur = advanceState(cur, { p1: cast(17, { x: 700, y: 500 }), p2: idle() }, skills);
    expect(cur.traps).toHaveLength(2);
    expect(cur.traps.some(t => t.id === first)).toBe(false);
  });
});

describe('triggering', () => {
  it('does not fire on a dormant trap standing under an enemy', () => {
    const { state, skills } = setup();
    // Plant directly on p2.
    const next = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    expect(next.traps).toHaveLength(1);
    expect(next.players.p2.hp).toBe(state.players.p2.hp);
  });

  it('fires once armed, damages the enemy, and despawns', () => {
    const { state, skills } = setup();
    const hpBefore = state.players.p2.hp;
    let cur = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 1);
    expect(cur.players.p2.hp).toBeLessThan(hpBefore);
    expect(cur.traps).toHaveLength(0);
  });

  it('never fires on its owner', () => {
    const { state, skills } = setup();
    const hpBefore = state.players.p1.hp;
    let cur = advanceState(state, { p1: cast(17, { x: 400, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 5);
    expect(cur.players.p1.hp).toBe(hpBefore);
    expect(cur.traps).toHaveLength(1);
  });

  it('expires without firing if nobody comes near', () => {
    const { state, skills } = setup();
    let cur = advanceState(state, { p1: cast(17, { x: 500, y: 500 }), p2: idle() }, skills);
    const trap = cur.traps[0];
    cur = idleFor(cur, skills, trap.expiresAt - cur.tick + 1);
    expect(cur.traps).toHaveLength(0);
    expect(cur.players.p2.hp).toBe(state.players.p2.hp);
  });
});

describe('keystone riders', () => {
  it('slows the victim with Hamstring', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.serrated_spikes', 6]]);
    let cur = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 1);
    expect(cur.players.p2.slowUntil).toBeGreaterThan(cur.tick);
    expect(cur.players.p2.slowFactor).toBeLessThan(1);
  });

  it('throws shards with Shrapnel', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.shrapnel', 1]]);
    let cur = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    expect(cur.projectiles).toHaveLength(0);
    // The shards spawn on the trap's own position, which is on top of p2, so
    // they connect and despawn within a tick or two — sample every tick rather
    // than only at the end, or the whole volley is missed.
    let peak = 0;
    for (let i = 0; i < TRAP_ARM_TICKS + 5; i++) {
      cur = idleFor(cur, skills, 1);
      peak = Math.max(peak, cur.projectiles.length);
    }
    expect(peak).toBe(3);   // rank 1 Shrapnel = 2 + 1 shards
  });

  it('roots for exactly the deep-freeze window with Maimed', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.heavy_jaws', 4]]);
    let cur = advanceState(state, { p1: cast(19, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, 62);
    expect(cur.players.p2.rootUntil).toBeGreaterThan(cur.tick);
    expect(cur.players.p2.rootUntil! - cur.tick).toBeLessThanOrEqual(DEEP_FREEZE_ROOT_TICKS);
  });

  it('shortens the cooldown with Field Kit', () => {
    const plain = setup(HUNTER);
    const kitted = setup([...HUNTER, ['hunter.field_kit', 3]]);
    const a = advanceState(plain.state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, plain.skills);
    const b = advanceState(kitted.state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, kitted.skills);
    expect(b.players.p1.cooldowns[17]!).toBeLessThan(a.players.p1.cooldowns[17]!);
  });

  it('halves the remaining cooldown when a trap fires with Rearm', () => {
    const withRearm = setup([...HUNTER, ['hunter.field_kit', 6]]);
    let cur = advanceState(withRearm.state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, withRearm.skills);
    const cdAtCast = cur.players.p1.cooldowns[17]!;
    // Step until the trap fires so the refund is observed at the moment it
    // lands, not after further ticking has confounded it.
    let firedAt = -1;
    for (let i = 0; i < TRAP_ARM_TICKS + 5 && firedAt < 0; i++) {
      cur = idleFor(cur, withRearm.skills, 1);
      if (cur.traps.length === 0) firedAt = i;
    }
    expect(firedAt).toBeGreaterThanOrEqual(0);
    // A refund REDUCES what is left. Without it the remaining cooldown would
    // be cdAtCast minus the elapsed ticks; the refund halves that.
    const wouldRemain = cdAtCast - (firedAt + 1);
    expect(cur.players.p1.cooldowns[17]!).toBeCloseTo(wouldRemain / 2, 0);
  });
});

describe('deadfall chain', () => {
  it('sets off nearby owned traps when it fires', () => {
    const { state, skills } = setup();
    let cur = advanceState(state, { p1: cast(17, { x: 880, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, 1);
    cur = advanceState(cur, { p1: cast(19, { x: 900, y: 500 }), p2: idle() }, skills);
    const hpBefore = cur.players.p2.hp;
    cur = idleFor(cur, skills, 62);
    expect(cur.players.p2.hp).toBeLessThan(hpBefore);
    expect(cur.traps).toHaveLength(0);   // both the deadfall and the chained spike are consumed
  });
});

describe('caltrops', () => {
  it('creates a caltrops zone that slows and chips but does not burst', () => {
    const { state, skills } = setup();
    const hpBefore = state.players.p2.hp;
    let cur = advanceState(state, { p1: cast(18, { x: 900, y: 500 }), p2: idle() }, skills);
    expect(cur.fireWalls.some(z => z.kind === 'caltrops')).toBe(true);
    // No burst: the cast tick costs at most one tick of the zone's chip rate,
    // which is what separates Caltrops from Rain of Arrows.
    expect(hpBefore - cur.players.p2.hp).toBeLessThanOrEqual(CALTROPS_DAMAGE_PER_TICK);
    cur = idleFor(cur, skills, 30);
    expect(cur.players.p2.hp).toBeLessThan(hpBefore);
    expect(cur.players.p2.slowFactor).toBeLessThan(1);
  });

  it('keeps the stronger of two overlapping slows', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.rusted_barbs', 5], ['archer.freeze', 1]]);
    let cur = advanceState(state, { p1: cast(18, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, 20);
    const caltropsOnly = cur.players.p2.slowFactor!;
    cur = idleFor(cur, skills, 5);
    expect(cur.players.p2.slowFactor!).toBeLessThanOrEqual(caltropsOnly);
  });
});
