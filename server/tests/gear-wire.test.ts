import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import type { ItemRow } from '@arena/shared';

const helm: ItemRow = {
  id: 'i1', base_id: 'iron_helm', rarity: 'basic', affixes: [],
  level_req: 7, equipped_by: 'char1', equipped_slot: 'helmet', slot: 'helmet',
};
const ring: ItemRow = {
  id: 'i2', base_id: 'bone_ring', rarity: 'basic', affixes: [],
  level_req: 1, equipped_by: 'char1', equipped_slot: 'ring1', slot: 'ring',
};

describe('gear stamping', () => {
  it('stamps visible equipped gear into PlayerState', () => {
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [helm, ring] }],
      undefined, undefined,
    );
    expect(state.players.a.gear).toEqual({ helmet: 'iron_helm' });
  });
  it('stamps an empty gear object for guests (no items)', () => {
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } }],
      undefined, undefined,
    );
    expect(state.players.a.gear).toEqual({});
  });
});
