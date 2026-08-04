import { describe, it, expect } from 'vitest';
import { SKILL_NODES, GATES, canUnlock, totalSpentForRanks, SPELL_BINDINGS } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const byId = new Map(SKILL_NODES.map(n => [n.id, n]));
const owned = (...ids: NodeId[]) => new Set<NodeId>(ids);

const HUNTER_IDS: NodeId[] = [
  'hunter.spike_trap', 'hunter.serrated_spikes', 'hunter.trap_cache',
  'hunter.tripwire', 'hunter.shrapnel', 'hunter.caltrops',
  'hunter.rusted_barbs', 'hunter.wide_scatter', 'hunter.barbed_wire',
  'hunter.deadfall', 'hunter.heavy_jaws', 'hunter.cascade', 'hunter.field_kit',
];

describe('hunter tree data', () => {
  it('defines all thirteen nodes on the hunter tree', () => {
    for (const id of HUNTER_IDS) {
      expect(byId.get(id), `missing node ${id}`).toBeDefined();
      expect(byId.get(id)!.tree).toBe('hunter');
    }
    expect(SKILL_NODES.filter(n => n.tree === 'hunter')).toHaveLength(13);
  });

  it('binds three spells to the ranger with no default slot', () => {
    for (const [spell, node] of [[17, 'hunter.spike_trap'], [18, 'hunter.caltrops'], [19, 'hunter.deadfall']] as const) {
      const b = SPELL_BINDINGS.find(x => x.spell === spell);
      expect(b, `missing binding for spell ${spell}`).toBeDefined();
      expect(b!.node).toBe(node);
      expect(b!.charClass).toBe('ranger');
      expect(b!.defaultSlot).toBeUndefined();
    }
  });
});

describe('hunter gates', () => {
  it('locks everything behind Spike Trap', () => {
    for (const id of HUNTER_IDS.filter(i => i !== 'hunter.spike_trap')) {
      expect(canUnlock(id, owned()), `${id} unlocked with nothing owned`).toBe(false);
    }
  });

  it('opens all four tier-2/3 nodes once Spike Trap is owned', () => {
    const o = owned('hunter.spike_trap');
    for (const id of ['hunter.serrated_spikes', 'hunter.trap_cache', 'hunter.tripwire', 'hunter.shrapnel'] as NodeId[]) {
      expect(canUnlock(id, o)).toBe(true);
    }
    expect(canUnlock('hunter.caltrops', o)).toBe(false);
  });

  it('opens Caltrops with Spike Trap plus any one tier-2/3 node', () => {
    for (const gate of ['hunter.serrated_spikes', 'hunter.trap_cache', 'hunter.tripwire', 'hunter.shrapnel'] as NodeId[]) {
      expect(canUnlock('hunter.caltrops', owned('hunter.spike_trap', gate)), `via ${gate}`).toBe(true);
    }
  });

  it('opens Deadfall with Caltrops plus any one tier-5 node', () => {
    for (const gate of ['hunter.rusted_barbs', 'hunter.wide_scatter', 'hunter.barbed_wire'] as NodeId[]) {
      expect(canUnlock('hunter.deadfall', owned('hunter.caltrops', gate)), `via ${gate}`).toBe(true);
    }
    expect(canUnlock('hunter.deadfall', owned('hunter.caltrops'))).toBe(false);
  });

  it('opens tier 7 only with Deadfall', () => {
    for (const id of ['hunter.heavy_jaws', 'hunter.cascade', 'hunter.field_kit'] as NodeId[]) {
      expect(canUnlock(id, owned('hunter.caltrops'))).toBe(false);
      expect(canUnlock(id, owned('hunter.deadfall'))).toBe(true);
    }
  });

  it('has no mutually-exclusive gates', () => {
    for (const id of HUNTER_IDS) {
      expect(GATES[id]?.mutuallyExclusive).toBeUndefined();
    }
  });
});

describe('hunter point costs', () => {
  const cost = (id: NodeId, rank: number) => totalSpentForRanks(byId.get(id)!, rank);

  it('charges the table price to soft-cap each stackable node', () => {
    expect(cost('hunter.serrated_spikes', 5)).toBe(5);
    expect(cost('hunter.trap_cache', 3)).toBe(3);
    expect(cost('hunter.tripwire', 5)).toBe(10);
    expect(cost('hunter.shrapnel', 3)).toBe(6);
    expect(cost('hunter.rusted_barbs', 5)).toBe(10);
    expect(cost('hunter.wide_scatter', 5)).toBe(5);
    expect(cost('hunter.barbed_wire', 5)).toBe(10);
    expect(cost('hunter.heavy_jaws', 3)).toBe(6);
    expect(cost('hunter.cascade', 3)).toBe(6);
    expect(cost('hunter.field_kit', 5)).toBe(5);
  });

  it('charges an over-cap premium past the soft cap', () => {
    // rank 6 of a softCap-5 cost-1 node costs 1 + 1
    expect(cost('hunter.serrated_spikes', 6)).toBe(5 + 2);
  });

  it('soft-capping the whole tree costs 72 points', () => {
    const total = SKILL_NODES.filter(n => n.tree === 'hunter')
      .reduce((sum, n) => sum + totalSpentForRanks(n, n.stackable ? n.stackable.softCap : 1), 0);
    expect(total).toBe(72);
  });
});
