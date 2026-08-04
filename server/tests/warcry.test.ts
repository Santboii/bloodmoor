import { describe, it, expect, vi } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import {
  WAR_CRY_DAMAGE, WAR_CRY_SLOW_FACTOR, WAR_CRY_ALLY_SPEED_FACTOR, WAR_CRY_ALLY_SPEED_TICKS,
  RALLY_DAMAGE_MULT, PLAYER_SPEED, DELTA, TEAM_DUEL_MODE,
} from '@arena/shared';
import type { InputFrame, NodeId, Vec2 } from '@arena/shared';

const WARCRY_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.war_cry', 1]]);
const RALLY_GLAD = new Map<NodeId, number>([
  ['arms.jab', 1], ['bulwark.war_cry', 1], ['bulwark.intimidating_presence', 4],
]);
const RANGER = new Map<NodeId, number>([['archer.power_shot', 1]]);

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

// A at 600,600; B placed by the caller.
function duel(bPos: Vec2 = { x: 650, y: 600 }, bClass: 'ranger' | 'gladiator' = 'ranger') {
  return makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: bClass, spawnPos: bPos },
  ]);
}

describe('War Cry (spell 17)', () => {
  it('damages and slows an enemy inside the radius', () => {
    let s = duel({ x: 650, y: 600 }); // distance 50, well inside the 150 radius
    const skills = { A: WARCRY_GLAD, B: RANGER };
    const hp0 = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 21, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    expect(hp0 - s.players.B.hp).toBeCloseTo(WAR_CRY_DAMAGE, 5);
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.B.slowFactor).toBeCloseTo(WAR_CRY_SLOW_FACTOR, 5);
  });

  it('leaves an enemy outside the radius untouched', () => {
    let s = duel({ x: 900, y: 600 }); // distance 300, outside the 150 radius
    const skills = { A: WARCRY_GLAD, B: RANGER };
    const hp0 = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 21, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
    expect(s.players.B.hp).toBe(hp0);
    expect(s.players.B.slowUntil).toBeUndefined();
  });

  it('grants a same-team ally the speed surge instead of damage', () => {
    const s0 = makeInitialState(
      [
        { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
        { id: 'C', displayName: 'C', charClass: 'gladiator', spawnPos: { x: 650, y: 600 } },
        { id: 'B', displayName: 'B', charClass: 'ranger', spawnPos: { x: 1200, y: 600 } },
      ],
      TEAM_DUEL_MODE,
      { team1: ['A', 'C'], team2: ['B'] },
    );
    const skills = { A: WARCRY_GLAD, C: new Map<NodeId, number>(), B: RANGER };
    const hp0 = s0.players.C.hp;
    const s = advanceState(
      s0,
      { A: frame({ castSpell: 21, aimTarget: { x: 650, y: 600 } }), C: frame(), B: frame() },
      skills,
      TEAM_DUEL_MODE,
    );
    expect(s.players.C.hp).toBe(hp0);
    expect((s.players.C.speedBoostUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.C.speedBoostFactor).toBeCloseTo(WAR_CRY_ALLY_SPEED_FACTOR, 5);
  });

  it('moves a speed-boosted player faster for the duration', () => {
    let s = duel();
    s.players.A.speedBoostUntil = s.tick + WAR_CRY_ALLY_SPEED_TICKS;
    s.players.A.speedBoostFactor = WAR_CRY_ALLY_SPEED_FACTOR;
    const skills = { A: WARCRY_GLAD, B: RANGER };
    s = advanceState(s, { A: frame({ move: { x: 1, y: 0 } }), B: frame() }, skills);
    const step = s.players.A.position.x - 600;
    expect(step).toBeCloseTo(PLAYER_SPEED * DELTA * WAR_CRY_ALLY_SPEED_FACTOR, 5);
  });

  it('is not mitigated by Block — a blocking target facing the caster still takes full damage', () => {
    let s = duel({ x: 650, y: 600 }, 'gladiator');
    const skills = { A: WARCRY_GLAD, B: new Map<NodeId, number>() };
    const hp0 = s.players.B.hp;
    s = advanceState(
      s,
      {
        A: frame({ castSpell: 21, aimTarget: { x: 650, y: 600 } }),
        B: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }), // B faces A
      },
      skills,
    );
    expect(s.players.B.blocking).toBe(true);
    expect(hp0 - s.players.B.hp).toBeCloseTo(WAR_CRY_DAMAGE, 5);
  });

  it('Rallying Roar keystone boosts the caster\'s next jab damage by 10%', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      // Rally run: cast War Cry (arming the self-rally), then Jab the same tick's target.
      let s = duel({ x: 640, y: 600 }); // inside jab range (90) after the war cry cast
      const raSkills = { A: RALLY_GLAD, B: RANGER };
      s = advanceState(s, { A: frame({ castSpell: 21, aimTarget: { x: 640, y: 600 } }), B: frame() }, raSkills);
      expect((s.players.A.rallyUntil ?? 0)).toBeGreaterThan(s.tick);
      const hp0 = s.players.B.hp;
      s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: { x: 640, y: 600 } }), B: frame() }, raSkills);
      const rallyDamage = hp0 - s.players.B.hp;

      // Control run: identical jab, no War Cry / no rally, same mocked roll.
      let control = duel({ x: 640, y: 600 });
      const controlSkills = { A: WARCRY_GLAD, B: RANGER };
      const hp0c = control.players.B.hp;
      control = advanceState(control, { A: frame({ castSpell: 13, aimTarget: { x: 640, y: 600 } }), B: frame() }, controlSkills);
      const controlDamage = hp0c - control.players.B.hp;

      expect(rallyDamage).toBeCloseTo(controlDamage * RALLY_DAMAGE_MULT, 5);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('does not double-apply the rally multiplier when War Cry is recast while already rallied', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      // Caster already has an active rally window BEFORE recasting War Cry —
      // this exercises the rallyUntil-active path of the war cry branch's own
      // getDamageMultiplier call, not just the freshly-armed path.
      let s = duel({ x: 640, y: 600 });
      const raSkills = { A: RALLY_GLAD, B: RANGER };
      s.players.A.rallyUntil = s.tick + 50;
      s = advanceState(s, { A: frame({ castSpell: 21, aimTarget: { x: 640, y: 600 } }), B: frame() }, raSkills);
      expect((s.players.A.rallyUntil ?? 0)).toBeGreaterThan(s.tick);
      const hp0 = s.players.B.hp;
      s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: { x: 640, y: 600 } }), B: frame() }, raSkills);
      const rallyDamage = hp0 - s.players.B.hp;

      // Control run: identical jab, no rally ever active, same mocked roll.
      let control = duel({ x: 640, y: 600 });
      const controlSkills = { A: WARCRY_GLAD, B: RANGER };
      const hp0c = control.players.B.hp;
      control = advanceState(control, { A: frame({ castSpell: 13, aimTarget: { x: 640, y: 600 } }), B: frame() }, controlSkills);
      const controlDamage = hp0c - control.players.B.hp;

      // Exactly one application of the multiplier — recasting while already
      // rallied must not stack (rallyUntil is a single timestamp, not a
      // counter), so this must equal controlDamage * MULT, never MULT^2.
      expect(rallyDamage).toBeCloseTo(controlDamage * RALLY_DAMAGE_MULT, 5);
      expect(rallyDamage).not.toBeCloseTo(controlDamage * RALLY_DAMAGE_MULT * RALLY_DAMAGE_MULT, 5);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
