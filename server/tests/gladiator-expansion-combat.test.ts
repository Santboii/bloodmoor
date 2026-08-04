import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId } from '@arena/shared';

describe('Iron Skin (max-HP hook at match start)', () => {
  it('iron skin raises starting and max HP', () => {
    const skills = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.mobile_guard', 1], ['bulwark.iron_skin', 3]]);
    const s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 }, skills }]);
    expect(s.players.A.maxHp).toBe(750 + 75);
    expect(s.players.A.hp).toBe(750 + 75);
  });
  it('non-gladiators and guests are unaffected', () => {
    const s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'mage', spawnPos: { x: 600, y: 600 } }]);
    expect(s.players.A.maxHp).toBe(750);
  });
});
