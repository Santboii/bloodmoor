import { describe, it, expect } from 'vitest';
import { firstJabTarget, jabDamage } from '../src/spells/Jab.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { JAB_RANGE, PILLARS } from '@arena/shared';
import type { InputFrame, NodeId, PlayerState, Vec2 } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1]]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

function mkPlayers(positions: Record<string, Vec2>): Record<string, PlayerState> {
  const s = makeInitialState(Object.entries(positions).map(([id, pos]) => (
    { id, displayName: id, charClass: 'mage' as const, spawnPos: pos })));
  return s.players;
}

describe('firstJabTarget', () => {
  it('hits a target inside the line, misses one beyond range', () => {
    const players = mkPlayers({ A: { x: 600, y: 600 }, B: { x: 660, y: 600 }, C: { x: 600 + JAB_RANGE + 60, y: 600 } });
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBe('B');
    delete (players as Record<string, PlayerState>).B;
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBeNull();
  });

  it('hits only the FIRST player along the line', () => {
    const players = mkPlayers({ A: { x: 600, y: 600 }, near: { x: 650, y: 600 }, far: { x: 685, y: 600 } });
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBe('near');
  });

  it('misses targets clearly off the line axis', () => {
    const players = mkPlayers({ A: { x: 600, y: 600 }, B: { x: 660, y: 700 } });
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBeNull();
  });

  it('is blocked by pillars (no stabbing through walls)', () => {
    const pillar = PILLARS[0]; // {x:350, y:300}
    const players = mkPlayers({
      A: { x: pillar.x - 60, y: pillar.y },
      B: { x: pillar.x + 60, y: pillar.y },
    });
    expect(firstJabTarget('A', players.A.position, { x: pillar.x + 200, y: pillar.y }, players, 0)).toBeNull();
  });

  it('rolls damage within [min, max]', () => {
    for (let i = 0; i < 50; i++) {
      const d = jabDamage(75, 100);
      expect(d).toBeGreaterThanOrEqual(75);
      expect(d).toBeLessThanOrEqual(100);
    }
  });
});

describe('Jab cast (spell 12)', () => {
  it('damages the first enemy in the thrust line', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 660, y: 600 } },
    ]);
    s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: { x: 1000, y: 600 } }), B: frame() },
      { A: GLAD, B: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);
    expect(s.players.B.maxHp - s.players.B.hp).toBeGreaterThanOrEqual(75);
  });
});
