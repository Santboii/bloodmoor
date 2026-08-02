import { describe, it, expect } from 'vitest';
import {
  spawnFrozenOrb, advanceFrozenOrb, isFrozenOrbExpired, orbVolleyDue, spawnOrbVolley,
} from '../src/spells/FrozenOrb.ts';
import {
  FROZEN_ORB_SPEED, FROZEN_ORB_LIFETIME_TICKS, FROZEN_ORB_SHARDS_PER_VOLLEY,
  FROZEN_ORB_VOLLEY_INTERVAL_TICKS,
} from '@arena/shared';

const from = { x: 500, y: 500 };
const target = { x: 900, y: 500 };

describe('spawnFrozenOrb', () => {
  it('drifts toward the target at orb speed', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(orb.velocity.x).toBeCloseTo(FROZEN_ORB_SPEED);
    expect(orb.velocity.y).toBeCloseTo(0);
  });

  it('is much slower than an ice bolt so it lingers in the lane', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(Math.hypot(orb.velocity.x, orb.velocity.y)).toBeLessThan(200);
  });

  it('expires after its lifetime', () => {
    expect(spawnFrozenOrb('p1', from, target, 50).expiresAt).toBe(50 + FROZEN_ORB_LIFETIME_TICKS);
  });
});

describe('orb volleys', () => {
  it('fires a volley on the interval, not every tick', () => {
    // The predicate is >= and the stepping loop pushes nextVolleyAt forward
    // after each volley. Testing the predicate without that push would make
    // it look like it fires every tick, which is why the loop's update is
    // modelled here rather than asserted against a frozen orb.
    let orb = spawnFrozenOrb('p1', from, target, 0);
    expect(orbVolleyDue(orb, 0)).toBe(true);
    orb = { ...orb, nextVolleyAt: FROZEN_ORB_VOLLEY_INTERVAL_TICKS };
    expect(orbVolleyDue(orb, 1)).toBe(false);
    expect(orbVolleyDue(orb, FROZEN_ORB_VOLLEY_INTERVAL_TICKS)).toBe(true);
  });

  it('still fires if the exact tick was missed', () => {
    // >= not ===. With equality, one skipped tick would stop the orb firing
    // for the rest of its life, silently and unrecoverably.
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(orbVolleyDue({ ...orb, nextVolleyAt: 5 }, 9)).toBe(true);
  });

  it('emits exactly ten volleys over its lifetime', () => {
    let orb = spawnFrozenOrb('p1', from, target, 0);
    let volleys = 0;
    for (let tick = 0; tick < FROZEN_ORB_LIFETIME_TICKS; tick++) {
      if (orbVolleyDue(orb, tick)) {
        volleys++;
        orb = { ...orb, nextVolleyAt: tick + FROZEN_ORB_VOLLEY_INTERVAL_TICKS };
      }
    }
    expect(volleys).toBe(10);
  });

  it('sprays shards radially, evenly spaced', () => {
    const shards = spawnOrbVolley(spawnFrozenOrb('p1', from, target, 0), 0);
    expect(shards.length).toBe(FROZEN_ORB_SHARDS_PER_VOLLEY);
    expect(shards.every(s => s.type === 'iceshard')).toBe(true);
    const angles = shards.map(s => Math.atan2(s.velocity.y, s.velocity.x)).sort((a, b) => a - b);
    const gaps = angles.slice(1).map((a, i) => a - angles[i]);
    for (const g of gaps) expect(g).toBeCloseTo((2 * Math.PI) / FROZEN_ORB_SHARDS_PER_VOLLEY, 4);
  });

  it('inherits the orb owner so shards cannot hit the caster', () => {
    const shards = spawnOrbVolley(spawnFrozenOrb('p1', from, target, 0), 0);
    expect(shards.every(s => s.ownerId === 'p1')).toBe(true);
  });

  it('honors a raised shard count from Shard Storm', () => {
    const orb = { ...spawnFrozenOrb('p1', from, target, 0), shardsPerVolley: 8 };
    expect(spawnOrbVolley(orb, 0).length).toBe(8);
  });
});

describe('isFrozenOrbExpired', () => {
  it('expires at its expiry tick', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(isFrozenOrbExpired(orb, FROZEN_ORB_LIFETIME_TICKS - 1)).toBe(false);
    expect(isFrozenOrbExpired(orb, FROZEN_ORB_LIFETIME_TICKS)).toBe(true);
  });
});

describe('advanceFrozenOrb', () => {
  it('drifts along its velocity', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(advanceFrozenOrb(orb).position.x).toBeGreaterThan(orb.position.x);
  });
});
