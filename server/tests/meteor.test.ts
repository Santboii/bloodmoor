import { describe, it, expect } from 'vitest';
import { spawnMeteor, meteorDetonates, meteorHitsPlayer, meteorDamage } from '../src/spells/Meteor.ts';
import { METEOR_DELAY_TICKS } from '@arena/shared';
import { steerMeteor } from '../src/spells/Meteor.ts';
import { FALLING_STAR_TICKS } from '@arena/shared';

describe('spawnMeteor', () => {
  it('sets strikeAt to currentTick + METEOR_DELAY_TICKS', () => {
    const m = spawnMeteor('p1', { x: 400, y: 400 }, 60);
    expect(m.strikeAt).toBe(60 + METEOR_DELAY_TICKS);
    expect(m.target).toEqual({ x: 400, y: 400 });
  });
});

describe('meteorDetonates', () => {
  it('returns true when current tick >= strikeAt', () => {
    const m = spawnMeteor('p1', { x: 400, y: 400 }, 0);
    expect(meteorDetonates(m, METEOR_DELAY_TICKS)).toBe(true);
    expect(meteorDetonates(m, METEOR_DELAY_TICKS - 1)).toBe(false);
  });
});

describe('meteorHitsPlayer', () => {
  it('returns true when player is within AOE radius', () => {
    const m = spawnMeteor('p1', { x: 400, y: 400 }, 0);
    expect(meteorHitsPlayer(m, { x: 420, y: 400 }, 'p2')).toBe(true);
  });

  it('returns false when player is outside AOE radius', () => {
    const m = spawnMeteor('p1', { x: 400, y: 400 }, 0);
    expect(meteorHitsPlayer(m, { x: 600, y: 600 }, 'p2')).toBe(false);
  });

  it('does not hit the owner', () => {
    const m = spawnMeteor('p1', { x: 400, y: 400 }, 0);
    expect(meteorHitsPlayer(m, { x: 400, y: 400 }, 'p1')).toBe(false);
  });
});

describe('meteorDamage', () => {
  it('returns a value between 200 and 280', () => {
    for (let i = 0; i < 100; i++) {
      const d = meteorDamage();
      expect(d).toBeGreaterThanOrEqual(200);
      expect(d).toBeLessThanOrEqual(280);
    }
  });
});

// ── Fire rework: Guided Descent ─────────────────────────────────────────────

describe('steerMeteor', () => {
  it('does nothing without a steer radius', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0);
    expect(steerMeteor(m, { x: 1400, y: 1000 }, 10).target).toEqual({ x: 1000, y: 1000 });
  });

  it('follows the cursor within the steer radius', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 100 });
    expect(steerMeteor(m, { x: 1050, y: 1000 }, 10).target).toEqual({ x: 1050, y: 1000 });
  });

  it('clamps to the steer radius around the original cast point', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 100 });
    const steered = steerMeteor(m, { x: 5000, y: 1000 }, 10);
    expect(steered.target.x).toBeCloseTo(1100, 4);
    expect(steered.target.y).toBeCloseTo(1000, 4);
  });

  it('freezes the target when the caster has no live aim', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 100 });
    const moved = steerMeteor(m, { x: 1050, y: 1000 }, 10);
    expect(steerMeteor(moved, undefined, 11).target).toEqual(moved.target);
  });

  it('Falling Star overrides the cursor in the final window', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 200, fallingStar: true });
    const late = m.strikeAt - FALLING_STAR_TICKS + 1;
    const steered = steerMeteor(m, { x: 900, y: 1000 }, late, { x: 1150, y: 1000 });
    expect(steered.target.x).toBeGreaterThan(1000);
  });

  it('Falling Star still follows the cursor before the final window', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 200, fallingStar: true });
    const steered = steerMeteor(m, { x: 900, y: 1000 }, 1, { x: 1150, y: 1000 });
    expect(steered.target.x).toBe(900);
  });
});

describe('meteorDamage scaling', () => {
  it('scales by damageRatio', () => {
    const full = spawnMeteor('a', { x: 0, y: 0 }, 0);
    const half = spawnMeteor('a', { x: 0, y: 0 }, 0, { damageRatio: 0.5 });
    for (let i = 0; i < 50; i++) {
      expect(meteorDamage(full)).toBeGreaterThanOrEqual(200);
      const d = meteorDamage(half);
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(141);
    }
  });
});
