import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { BLEED_TICKS, TICK_RATE, TEAM_DUEL_MODE, HARPOON_DRAG_TICKS } from '@arena/shared';
import type { InputFrame, NodeId } from '@arena/shared';

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

// softCap for arms.serrated_edge is 3 — rank 3 grants the bleed but not the
// Hemorrhage keystone (rank > softCap), rank 4 grants both.
const NO_SERRATED = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
const SERRATED_3 = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1], ['arms.serrated_edge', 3]]);
const SERRATED_4 = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1], ['arms.serrated_edge', 4]]);
const MAGE = new Map<NodeId, number>([['fire.fireball', 1]] as [NodeId, number][]);

function landSpear(skills: Record<string, Map<NodeId, number>>) {
  let s = makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 900, y: 600 } },
  ]);
  s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
  expect(s.projectiles.some(p => p.type === 'spear')).toBe(true);
  for (let i = 0; i < 60 && s.players.B.bleedUntil === undefined && s.players.B.hp === s.players.B.maxHp; i++) {
    s = advanceState(s, { A: frame(), B: frame() }, skills);
  }
  return s;
}

describe('Serrated Edge bleed', () => {
  it('applies bleed fields on hit, with Hemorrhage only past the softCap keystone rank', () => {
    const rank3 = landSpear({ A: SERRATED_3, B: MAGE });
    expect(rank3.players.B.bleedUntil).toBeGreaterThan(rank3.tick);
    expect(rank3.players.B.bleedDps).toBeGreaterThan(0);
    expect(rank3.players.B.bleedHemorrhage).toBeFalsy();

    const rank4 = landSpear({ A: SERRATED_4, B: MAGE });
    expect(rank4.players.B.bleedUntil).toBeGreaterThan(rank4.tick);
    expect(rank4.players.B.bleedDps).toBeGreaterThan(0);
    expect(rank4.players.B.bleedHemorrhage).toBe(true);
  });

  it('ticks hp down at ~bleedDps over the ~3s duration (bounds)', () => {
    const skills = { A: SERRATED_3, B: MAGE };
    let s = landSpear(skills);
    const bleedDps = s.players.B.bleedDps!;
    expect(s.players.B.bleedHemorrhage).toBeFalsy(); // isolates the base rate from the surcharge
    const hpAtBleedStart = s.players.B.hp;

    let ticks = 0;
    while (s.players.B.bleedUntil !== undefined && ticks < BLEED_TICKS + 5) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
      ticks++;
    }
    expect(s.players.B.bleedUntil).toBeUndefined();

    const totalLoss = hpAtBleedStart - s.players.B.hp;
    const expected = bleedDps * BLEED_TICKS / TICK_RATE; // ~3s worth at the stamped rate
    expect(totalLoss).toBeGreaterThan(expected * 0.8);
    expect(totalLoss).toBeLessThan(expected * 1.15);
  });

  it('does not apply without the Serrated Edge node', () => {
    const skills = { A: NO_SERRATED, B: MAGE };
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 900, y: 600 } },
    ]);
    s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
    const hpBefore = s.players.B.hp;
    for (let i = 0; i < 60 && s.players.B.hp === hpBefore; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.hp).toBeLessThan(hpBefore); // the spear itself still lands
    expect(s.players.B.bleedUntil).toBeUndefined();
    expect(s.players.B.bleedDps).toBeUndefined();
    expect(s.players.B.bleedHemorrhage).toBeUndefined();
  });

  it('Hemorrhage: a victim sprinting away loses ~1.5x more than a stationary control over the same window', () => {
    const window = 60; // ticks — well inside BLEED_TICKS, so the DoT stays active throughout
    const skills = { A: SERRATED_4, B: MAGE };

    function runScenario(moving: boolean): number {
      let s = landSpear(skills);
      expect(s.players.B.bleedHemorrhage).toBe(true);
      // The spear's own stun (SPEAR_STUN_TICKS) holds B's speedMult at 0 —
      // wait it out so the "moving" branch can actually move before measuring.
      while ((s.players.B.stunUntil ?? 0) > s.tick) {
        s = advanceState(s, { A: frame(), B: frame() }, skills);
      }
      const hpStart = s.players.B.hp;
      const victimInput = moving ? frame({ move: { x: 1, y: 0 } }) : frame();
      for (let i = 0; i < window; i++) {
        s = advanceState(s, { A: frame(), B: victimInput }, skills);
      }
      return hpStart - s.players.B.hp;
    }

    const stationaryLoss = runScenario(false);
    const movingLoss = runScenario(true);
    expect(movingLoss).toBeGreaterThan(stationaryLoss * 1.3);
    expect(movingLoss).toBeLessThan(stationaryLoss * 1.7);
  });

  it('expires cleanly, clearing bleedUntil/bleedDps/bleedHemorrhage together', () => {
    const skills = { A: SERRATED_4, B: MAGE };
    let s = landSpear(skills);
    expect(s.players.B.bleedUntil).toBeDefined();

    let ticks = 0;
    while (s.players.B.bleedUntil !== undefined && ticks < BLEED_TICKS + 5) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
      ticks++;
    }
    expect(s.players.B.bleedUntil).toBeUndefined();
    expect(s.players.B.bleedDps).toBeUndefined();
    expect(s.players.B.bleedHemorrhage).toBeUndefined();
  });

  it('never bleeds teammates (friendly fire)', () => {
    const inits = [
      { id: 'A', displayName: 'A', charClass: 'gladiator' as const, spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage'      as const, spawnPos: { x: 900, y: 600 } },
      { id: 'C', displayName: 'C', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 200 } },
      { id: 'D', displayName: 'D', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 1800 } },
    ];
    const teams = { team1: ['A', 'B'], team2: ['C', 'D'] };
    let s = makeInitialState(inits, TEAM_DUEL_MODE, teams);
    const skills = { A: SERRATED_4, B: MAGE, C: MAGE, D: MAGE };
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
    // Reduced friendly-fire damage still lands, but no bleed is ever applied.
    expect(s.players.B.hp).toBeLessThan(hpBefore);
    expect(s.players.B.bleedUntil).toBeUndefined();
    expect(s.players.B.bleedDps).toBeUndefined();
    expect(s.players.B.bleedHemorrhage).toBeUndefined();
  });

  it('Hemorrhage still fires during a harpoon drag — a dashing-set player must not read as stationary', () => {
    // Bleed fields are stamped directly (deterministic, same convention as
    // harpoon.test.ts's "directly stage the drag" case) — this isolates the
    // movement-delta bug from spear-hit/keystone-rank plumbing already
    // covered above. Drag movement (§0b, ~HARPOON_DRAG_MAX_STEP=30/tick) is
    // resolved before §1's movePlayer, which the dragged victim skips
    // entirely (the `dashing` set) — the surcharge must still see that
    // movement rather than comparing against its own already-moved position.
    function runScenario(dragged: boolean): number {
      let s = makeInitialState([
        { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
        { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1400, y: 600 } },
      ]);
      s.players.B.bleedUntil = s.tick + 200;
      s.players.B.bleedDps = 20;
      s.players.B.bleedHemorrhage = true;
      if (dragged) {
        s.players.B.draggedBy = 'A';
        s.players.B.dragEndTick = s.tick + HARPOON_DRAG_TICKS;
      }
      const skills = { A: NO_SERRATED, B: MAGE };
      const hpStart = s.players.B.hp;
      for (let i = 0; i < HARPOON_DRAG_TICKS; i++) {
        s = advanceState(s, { A: frame(), B: frame() }, skills);
      }
      return hpStart - s.players.B.hp;
    }

    const stationaryLoss = runScenario(false);
    const draggedLoss = runScenario(true);
    expect(draggedLoss).toBeGreaterThan(stationaryLoss * 1.4);
    expect(draggedLoss).toBeLessThan(stationaryLoss * 1.6);
  });
});
