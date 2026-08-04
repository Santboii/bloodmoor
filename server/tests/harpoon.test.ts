import { describe, it, expect } from 'vitest';
import { spawnHarpoon, advanceHarpoon, isHarpoonExpired, harpoonHitsPlayer } from '../src/spells/Harpoon.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import {
  HARPOON_SPEED, HARPOON_DRAG_TICKS, HARPOON_DRAG_STOP_DISTANCE, DELTA,
  TEAM_DUEL_MODE, PILLARS, PLAYER_HALF_SIZE,
} from '@arena/shared';
import type { InputFrame, NodeId } from '@arena/shared';

const HARPOON_GLAD = new Map<NodeId, number>([
  ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.harpoon', 1],
]);
const SKEWER_GLAD = new Map<NodeId, number>([
  ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.harpoon', 1], ['arms.quick_reel', 4],
]);
const REEL2_GLAD = new Map<NodeId, number>([
  ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.harpoon', 1], ['arms.quick_reel', 2],
]);
const MAGE = new Map<NodeId, number>([['fire.fireball', 1]] as [NodeId, number][]);

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

function pillarOverlap(pos: { x: number; y: number }): boolean {
  return PILLARS.some(pillar => {
    const minX = pillar.x - pillar.halfSize - PLAYER_HALF_SIZE;
    const maxX = pillar.x + pillar.halfSize + PLAYER_HALF_SIZE;
    const minY = pillar.y - pillar.halfSize - PLAYER_HALF_SIZE;
    const maxY = pillar.y + pillar.halfSize + PLAYER_HALF_SIZE;
    return pos.x > minX && pos.x < maxX && pos.y > minY && pos.y < maxY;
  });
}

describe('Harpoon projectile', () => {
  it('flies straight at HARPOON_SPEED', () => {
    const hp = spawnHarpoon('A', { x: 600, y: 600 }, { x: 1000, y: 600 });
    expect(hp.type).toBe('harpoon');
    const moved = advanceHarpoon(hp);
    expect(moved.position.x).toBeCloseTo(600 + HARPOON_SPEED * DELTA, 5);
    expect(moved.position.y).toBeCloseTo(600, 5);
  });

  it('never hits its owner and expires at arena bounds', () => {
    const hp = spawnHarpoon('A', { x: 600, y: 600 }, { x: 1000, y: 600 });
    expect(harpoonHitsPlayer(hp, { x: 600, y: 600 }, 'A')).toBe(false);
    expect(isHarpoonExpired({ ...hp, position: { x: -10, y: 600 } })).toBe(true);
  });
});

describe('Harpoon cast (spell 18) — drag', () => {
  it('drags the victim to ~HARPOON_DRAG_STOP_DISTANCE of the caster over ~HARPOON_DRAG_TICKS', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
    const skills = { A: HARPOON_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.projectiles.some(p => p.type === 'harpoon')).toBe(true);
    for (let i = 0; i < 80 && s.players.B.draggedBy === undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.draggedBy).toBe('A');
    let ticksDragging = 0;
    for (let i = 0; i < HARPOON_DRAG_TICKS + 5 && s.players.B.draggedBy !== undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
      ticksDragging++;
    }
    expect(s.players.B.draggedBy).toBeUndefined();
    expect(ticksDragging).toBeGreaterThanOrEqual(HARPOON_DRAG_TICKS - 2);
    expect(ticksDragging).toBeLessThanOrEqual(HARPOON_DRAG_TICKS + 2);
    const dist = Math.hypot(
      s.players.B.position.x - s.players.A.position.x,
      s.players.B.position.y - s.players.A.position.y,
    );
    expect(dist).toBeGreaterThanOrEqual(30);
    expect(dist).toBeLessThanOrEqual(60);
  });

  it('lets the dragged victim cast mid-drag', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
    const skills = { A: HARPOON_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    for (let i = 0; i < 80 && s.players.B.draggedBy === undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.draggedBy).toBe('A');
    s = advanceState(
      s,
      { A: frame(), B: frame({ castSpell: 1, aimTarget: { x: 600, y: 600 } }) },
      skills,
    );
    expect(s.projectiles.some(p => p.type === 'fireball' && p.ownerId === 'B')).toBe(true);
  });

  it('does not let the reeled position overlap a pillar', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 800, y: 1000 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1200, y: 1000 } },
    ]);
    // Directly stage the drag (pillar sits at 1000,1000 — dead center between them).
    s.players.B.draggedBy = 'A';
    s.players.B.dragEndTick = s.tick + HARPOON_DRAG_TICKS;
    const skills = { A: HARPOON_GLAD, B: MAGE };
    for (let i = 0; i < HARPOON_DRAG_TICKS + 5; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
      expect(pillarOverlap(s.players.B.position)).toBe(false);
    }
  });

  it('reduces damage on teammates and never drags them', () => {
    const inits = [
      { id: 'A', displayName: 'A', charClass: 'gladiator' as const, spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 600 } },
      { id: 'C', displayName: 'C', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 200 } },
      { id: 'D', displayName: 'D', charClass: 'mage'      as const, spawnPos: { x: 1000, y: 1800 } },
    ];
    const teams = { team1: ['A', 'B'], team2: ['C', 'D'] };
    let s = makeInitialState(inits, TEAM_DUEL_MODE, teams);
    const skills = { A: HARPOON_GLAD, B: MAGE, C: MAGE, D: MAGE };
    const idle = frame();
    s = advanceState(
      s,
      { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: idle, C: idle, D: idle },
      skills,
      TEAM_DUEL_MODE,
    );
    expect(s.projectiles.some(p => p.type === 'harpoon')).toBe(true);
    const hpBefore = s.players.B.hp;
    for (let i = 0; i < 80 && s.players.B.hp === hpBefore; i++) {
      s = advanceState(s, { A: idle, B: idle, C: idle, D: idle }, skills, TEAM_DUEL_MODE);
    }
    expect(s.players.B.hp).toBeLessThan(hpBefore);
    expect(s.players.B.draggedBy).toBeUndefined();
    for (let i = 0; i < HARPOON_DRAG_TICKS + 5; i++) {
      s = advanceState(s, { A: idle, B: idle, C: idle, D: idle }, skills, TEAM_DUEL_MODE);
      expect(s.players.B.draggedBy).toBeUndefined();
    }
  });

  it('reflected harpoon flips and drags the caster toward the reflector', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
    s.players.B.reflectUntil = s.tick + 1000;
    const skills = { A: HARPOON_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.projectiles.some(p => p.type === 'harpoon')).toBe(true);
    for (let i = 0; i < 160 && s.players.A.draggedBy === undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.A.draggedBy).toBe('B');
    for (let i = 0; i < HARPOON_DRAG_TICKS + 5 && s.players.A.draggedBy !== undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.A.draggedBy).toBeUndefined();
    const dist = Math.hypot(
      s.players.A.position.x - s.players.B.position.x,
      s.players.A.position.y - s.players.B.position.y,
    );
    expect(dist).toBeGreaterThanOrEqual(30);
    expect(dist).toBeLessThanOrEqual(60);
  });

  it('blocked harpoon halves damage but still drags', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'gladiator', spawnPos: { x: 1000, y: 600 } },
    ]);
    const skills = { A: HARPOON_GLAD, B: HARPOON_GLAD };
    // B faces A (aiming back toward the caster) so the front-arc block applies.
    s = advanceState(
      s,
      { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }) },
      skills,
    );
    expect(s.projectiles.some(p => p.type === 'harpoon')).toBe(true);
    const hpBefore = s.players.B.hp;
    for (let i = 0; i < 80 && s.players.B.hp === hpBefore; i++) {
      s = advanceState(
        s,
        { A: frame(), B: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }) },
        skills,
      );
    }
    const dealt = hpBefore - s.players.B.hp;
    expect(dealt).toBeGreaterThan(0);
    expect(dealt).toBeLessThan(70); // below HARPOON_DAMAGE_MIN thanks to the 60% Block reduction
    expect(s.players.B.draggedBy).toBe('A');
  });

  it('Skewer: a landed drag arms double damage on the next Jab, then clears', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
    const skills = { A: SKEWER_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    for (let i = 0; i < 80 && s.players.B.draggedBy === undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    for (let i = 0; i < HARPOON_DRAG_TICKS + 5 && s.players.B.draggedBy !== undefined; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.draggedBy).toBeUndefined();
    expect((s.players.A.skewerJabUntil ?? 0)).toBeGreaterThan(s.tick);

    const bPos = { ...s.players.B.position };
    const hpBefore = s.players.B.hp;
    s = advanceState(
      s,
      { A: frame({ castSpell: 13, aimTarget: bPos }), B: frame() },
      skills,
    );
    const dealt = hpBefore - s.players.B.hp;
    expect(dealt).toBeGreaterThanOrEqual(150); // >= 2x Jab's 75 damageMin
    expect(s.players.A.skewerJabUntil).toBeUndefined();
  });

  it('Quick Reel shortens the stamped cooldown', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
    const skills = { A: REEL2_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 18, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.cooldowns[18]).toBeLessThan(600);
  });
});
