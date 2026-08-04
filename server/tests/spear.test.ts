import { describe, it, expect } from 'vitest';
import { spawnSpear, advanceSpear, isSpearExpired, spearHitsPlayer } from '../src/spells/Spear.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { SPEAR_SPEED, SPEAR_STUN_TICKS, DELTA, TEAM_DUEL_MODE } from '@arena/shared';
import type { InputFrame, NodeId } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

describe('Spear projectile', () => {
  it('flies straight at SPEAR_SPEED', () => {
    const sp = spawnSpear('A', { x: 600, y: 600 }, { x: 1000, y: 600 });
    expect(sp.type).toBe('spear');
    const moved = advanceSpear(sp);
    expect(moved.position.x).toBeCloseTo(600 + SPEAR_SPEED * DELTA, 5);
    expect(moved.position.y).toBeCloseTo(600, 5);
  });

  it('never hits its owner and expires at arena bounds', () => {
    const sp = spawnSpear('A', { x: 600, y: 600 }, { x: 1000, y: 600 });
    expect(spearHitsPlayer(sp, { x: 600, y: 600 }, 'A')).toBe(false);
    expect(isSpearExpired({ ...sp, position: { x: -10, y: 600 } })).toBe(true);
  });
});

describe('Spear Throw cast (spell 13)', () => {
  it('damages AND stuns the target on hit', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 900, y: 600 } },
    ]);
    const skills = { A: GLAD, B: new Map([['fire.fireball', 1]] as [NodeId, number][]) };
    s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
    expect(s.projectiles.some(p => p.type === 'spear')).toBe(true);
    for (let i = 0; i < 60 && s.players.B.hp === s.players.B.maxHp; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThanOrEqual(s.tick + SPEAR_STUN_TICKS - 2);
    // stunned target cannot cast
    const manaBefore = s.players.B.mana;
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 1, aimTarget: { x: 600, y: 600 } }) }, skills);
    expect(s.players.B.castingSpell).toBeNull();
    expect(s.players.B.mana).toBeGreaterThanOrEqual(manaBefore); // regen only, nothing spent
  });

  it('does not stun teammates (friendly fire)', () => {
    // 2v2-style team state via makeInitialState teams arg (see stateadvancer-modes.test.ts).
    const inits = [
      { id: 'A', displayName: 'A', charClass: 'gladiator' as const, spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage'      as const, spawnPos: { x: 900, y: 600 } },
      { id: 'C', displayName: 'C', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 200 } },
      { id: 'D', displayName: 'D', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 1800 } },
    ];
    const teams = { team1: ['A', 'B'], team2: ['C', 'D'] };
    let s = makeInitialState(inits, TEAM_DUEL_MODE, teams);
    const skills = {
      A: GLAD,
      B: new Map([['fire.fireball', 1]] as [NodeId, number][]),
      C: new Map([['fire.fireball', 1]] as [NodeId, number][]),
      D: new Map([['fire.fireball', 1]] as [NodeId, number][]),
    };
    const idle = frame();
    s = advanceState(
      s,
      { A: frame({ castSpell: 14, aimTarget: { x: 900, y: 600 } }), B: idle, C: idle, D: idle },
      skills,
      TEAM_DUEL_MODE,
    );
    expect(s.projectiles.some(p => p.type === 'spear')).toBe(true);
    const hpBefore = s.players.B.hp;
    for (let i = 0; i < 60 && s.players.B.hp === hpBefore; i++) {
      s = advanceState(s, { A: idle, B: idle, C: idle, D: idle }, skills, TEAM_DUEL_MODE);
    }
    // Friendly fire multiplier for TEAM_DUEL_MODE is 0.5 (not 0), so the spear
    // still lands reduced damage on the teammate, but never applies the stun.
    expect(s.players.B.hp).toBeLessThan(hpBefore);
    expect(s.players.B.stunUntil).toBeUndefined();
  });
});
