import { describe, it, expect } from 'vitest';
import {
  spawnSpikeTrap, spawnDeadfall, trapIsArmed, trapIsExpired,
  trapTriggersOn, trapDamagesPlayer, collectChain, evictOldest,
} from '../src/spells/Trap.ts';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import { TRAP_ARM_TICKS, TRAP_LIFETIME_TICKS, TRAP_TRIGGER_RADIUS, TRAP_BLAST_RADIUS } from '@arena/shared';
import type { NodeId, TrapState } from '@arena/shared';

const M = buildRangerModifiers(new Map<NodeId, number>());
const at = { x: 500, y: 500 };
const spike = (tick = 0, pos = at, owner = 'p1') => spawnSpikeTrap(owner, pos, tick, M.trap);

describe('spawnSpikeTrap', () => {
  it('snapshots the modifier payload onto the trap', () => {
    const t = spike();
    expect(t.kind).toBe('spike');
    expect(t.damageMin).toBe(M.trap.damageMin);
    expect(t.triggerRadius).toBe(M.trap.triggerRadius);
    expect(t.blastRadius).toBe(TRAP_BLAST_RADIUS);
  });

  it('arms after the arm delay and expires after its lifetime', () => {
    const t = spike(100);
    expect(t.armedAt).toBe(100 + TRAP_ARM_TICKS);
    expect(t.expiresAt).toBe(100 + TRAP_LIFETIME_TICKS);
  });

  it('arms instantly with Quick Hands', () => {
    const quick = buildRangerModifiers(new Map<NodeId, number>([['hunter.trap_cache', 4]]));
    expect(spawnSpikeTrap('p1', at, 100, quick.trap).armedAt).toBe(100);
  });
});

describe('trapIsArmed / trapIsExpired', () => {
  it('is dormant during the arming window', () => {
    const t = spike(0);
    expect(trapIsArmed(t, TRAP_ARM_TICKS - 1)).toBe(false);
    expect(trapIsArmed(t, TRAP_ARM_TICKS)).toBe(true);
  });

  it('expires at the end of its lifetime', () => {
    const t = spike(0);
    expect(trapIsExpired(t, TRAP_LIFETIME_TICKS - 1)).toBe(false);
    expect(trapIsExpired(t, TRAP_LIFETIME_TICKS)).toBe(true);
  });
});

describe('trapTriggersOn', () => {
  const armed = TRAP_ARM_TICKS;

  it('never triggers on its own owner', () => {
    expect(trapTriggersOn(spike(), at, 'p1', { tick: armed })).toBe(false);
  });

  it('triggers on an enemy inside the trigger radius', () => {
    expect(trapTriggersOn(spike(), at, 'p2', { tick: armed })).toBe(true);
  });

  it('does not trigger before it is armed', () => {
    expect(trapTriggersOn(spike(), at, 'p2', { tick: armed - 1 })).toBe(false);
  });

  it('does not trigger beyond the trigger radius', () => {
    const far = { x: at.x + TRAP_TRIGGER_RADIUS + 1, y: at.y };
    expect(trapTriggersOn(spike(), far, 'p2', { tick: armed })).toBe(false);
  });

  it('triggers exactly at the radius boundary', () => {
    const edge = { x: at.x + TRAP_TRIGGER_RADIUS, y: at.y };
    expect(trapTriggersOn(spike(), edge, 'p2', { tick: armed })).toBe(true);
  });

  it('ignores a mobility landing outside the extended radius unless Countermeasure is up', () => {
    const t = spike();
    const justOutside = { x: at.x + TRAP_TRIGGER_RADIUS + 20, y: at.y };
    expect(trapTriggersOn(t, justOutside, 'p2', { tick: armed, mobilityLanded: true })).toBe(false);

    const cm = buildRangerModifiers(new Map<NodeId, number>([['hunter.tripwire', 6]]));
    const t2 = spawnSpikeTrap('p1', at, 0, cm.trap);
    const withinExtended = { x: at.x + t2.triggerRadius * 1.4, y: at.y };
    expect(trapTriggersOn(t2, withinExtended, 'p2', { tick: armed, mobilityLanded: true })).toBe(true);
    expect(trapTriggersOn(t2, withinExtended, 'p2', { tick: armed, mobilityLanded: false })).toBe(false);
  });
});

describe('trapDamagesPlayer', () => {
  it('covers the blast radius, which is wider than the trigger radius', () => {
    const t = spike();
    const between = { x: at.x + TRAP_TRIGGER_RADIUS + 10, y: at.y };
    expect(trapDamagesPlayer(t, between, 'p2')).toBe(true);
    expect(trapDamagesPlayer(t, { x: at.x + TRAP_BLAST_RADIUS + 1, y: at.y }, 'p2')).toBe(false);
  });

  it('never damages its own owner', () => {
    expect(trapDamagesPlayer(spike(), at, 'p1')).toBe(false);
  });
});

describe('collectChain', () => {
  const df = () => spawnDeadfall('p1', at, 0, M.trap, M.deadfall);

  it('collects the detonator plus owned traps in range, each exactly once', () => {
    const near = spawnSpikeTrap('p1', { x: at.x + 100, y: at.y }, 0, M.trap);
    const chain = collectChain(df(), [near]);
    expect(chain).toHaveLength(2);
    expect(new Set(chain.map(t => t.id)).size).toBe(2);
  });

  it('excludes traps beyond the chain radius', () => {
    const far = spawnSpikeTrap('p1', { x: at.x + 5000, y: at.y }, 0, M.trap);
    expect(collectChain(df(), [far])).toHaveLength(1);
  });

  it('excludes traps owned by someone else', () => {
    const enemy = spawnSpikeTrap('p2', { x: at.x + 50, y: at.y }, 0, M.trap);
    expect(collectChain(df(), [enemy])).toHaveLength(1);
  });

  it('reaches any distance with Daisy Chain', () => {
    const daisy = buildRangerModifiers(new Map<NodeId, number>([['hunter.cascade', 4]]));
    const detonator = spawnDeadfall('p1', at, 0, daisy.trap, daisy.deadfall);
    const far = spawnSpikeTrap('p1', { x: at.x + 100000, y: at.y }, 0, daisy.trap);
    expect(collectChain(detonator, [far])).toHaveLength(2);
  });

  it('does not re-enter the chain — a chained trap collects nothing further', () => {
    // Two spikes each in range of the other but only one in range of the
    // detonator: the far one must NOT be pulled in transitively.
    const nearSpike = spawnSpikeTrap('p1', { x: at.x + 200, y: at.y }, 0, M.trap);
    const farSpike = spawnSpikeTrap('p1', { x: at.x + 400, y: at.y }, 0, M.trap);
    const chain = collectChain(df(), [nearSpike, farSpike]);
    expect(chain).toHaveLength(2);
    expect(chain[1].id).toBe(nearSpike.id);
  });
});

describe('evictOldest', () => {
  const list = (n: number): TrapState[] =>
    Array.from({ length: n }, (_, i) => spawnSpikeTrap('p1', at, i, M.trap));

  it('leaves the list alone when under the cap', () => {
    const traps = list(1);
    expect(evictOldest(traps, 'p1', 'spike', 2)).toHaveLength(1);
  });

  it('drops the oldest owned trap of that kind when at the cap', () => {
    const traps = list(2);
    const kept = evictOldest(traps, 'p1', 'spike', 2);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe(traps[1].id);
  });

  it('never evicts another player traps', () => {
    const mine = list(2);
    const theirs = spawnSpikeTrap('p2', at, 0, M.trap);
    const kept = evictOldest([...mine, theirs], 'p1', 'spike', 2);
    expect(kept.some(t => t.ownerId === 'p2')).toBe(true);
    expect(kept.filter(t => t.ownerId === 'p1')).toHaveLength(1);
  });

  it('counts spike and deadfall caps separately', () => {
    const mine = list(2);
    const deadfall = spawnDeadfall('p1', at, 0, M.trap, M.deadfall);
    const kept = evictOldest([...mine, deadfall], 'p1', 'deadfall', 1);
    expect(kept.filter(t => t.kind === 'spike')).toHaveLength(2);
    expect(kept.filter(t => t.kind === 'deadfall')).toHaveLength(0);
  });
});
