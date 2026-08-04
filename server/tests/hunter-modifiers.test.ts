import { describe, it, expect } from 'vitest';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import {
  TRAP_DAMAGE_MIN, TRAP_TRIGGER_RADIUS, TRAP_BASE_CAP, TRAP_ARM_TICKS,
  CALTROPS_RADIUS, CALTROPS_SLOW_FACTOR, DEADFALL_DAMAGE_MIN, DEADFALL_CHAIN_RADIUS,
} from '@arena/shared';
import type { NodeId } from '@arena/shared';

const mods = (ranks: Partial<Record<NodeId, number>>) =>
  buildRangerModifiers(new Map(Object.entries(ranks) as [NodeId, number][]));

const NONE = mods({});

describe('trap modifiers', () => {
  it('returns base values with nothing skilled', () => {
    expect(NONE.trap.damageMin).toBe(TRAP_DAMAGE_MIN);
    expect(NONE.trap.triggerRadius).toBe(TRAP_TRIGGER_RADIUS);
    expect(NONE.trap.maxArmed).toBe(TRAP_BASE_CAP);
    expect(NONE.trap.armTicks).toBe(TRAP_ARM_TICKS);
    expect(NONE.trap.shardCount).toBe(0);
    expect(NONE.trap.slowFactor).toBe(1);
  });

  it('scales damage with Serrated Spikes', () => {
    expect(mods({ 'hunter.serrated_spikes': 1 }).trap.damageMin).toBeCloseTo(TRAP_DAMAGE_MIN * 1.08);
    expect(mods({ 'hunter.serrated_spikes': 5 }).trap.damageMin)
      .toBeGreaterThan(mods({ 'hunter.serrated_spikes': 1 }).trap.damageMin);
  });

  it('raises the armed cap by one per Trap Cache rank', () => {
    expect(mods({ 'hunter.trap_cache': 1 }).trap.maxArmed).toBe(3);
    expect(mods({ 'hunter.trap_cache': 2 }).trap.maxArmed).toBe(4);
    expect(mods({ 'hunter.trap_cache': 3 }).trap.maxArmed).toBe(5);
  });

  it('scales trigger radius with Tripwire', () => {
    expect(mods({ 'hunter.tripwire': 1 }).trap.triggerRadius).toBeCloseTo(TRAP_TRIGGER_RADIUS * 1.15);
  });

  it('adds one shard per Shrapnel rank', () => {
    expect(mods({ 'hunter.shrapnel': 1 }).trap.shardCount).toBe(3);
    expect(mods({ 'hunter.shrapnel': 2 }).trap.shardCount).toBe(4);
    expect(mods({ 'hunter.shrapnel': 3 }).trap.shardCount).toBe(5);
  });

  it('unlocks keystones only past the soft cap', () => {
    expect(mods({ 'hunter.serrated_spikes': 5 }).trap.hamstring).toBe(false);
    expect(mods({ 'hunter.serrated_spikes': 6 }).trap.hamstring).toBe(true);
    expect(mods({ 'hunter.serrated_spikes': 6 }).trap.slowFactor).toBeLessThan(1);
    expect(mods({ 'hunter.trap_cache': 4 }).trap.armTicks).toBe(0);          // Quick Hands
    expect(mods({ 'hunter.tripwire': 6 }).trap.countermeasure).toBe(true);
    expect(mods({ 'hunter.shrapnel': 4 }).trap.shardsHome).toBe(true);       // Scattershot
  });
});

describe('caltrops modifiers', () => {
  it('returns base values with nothing skilled', () => {
    expect(NONE.caltrops.radius).toBe(CALTROPS_RADIUS);
    expect(NONE.caltrops.slowFactor).toBe(CALTROPS_SLOW_FACTOR);
    expect(NONE.caltrops.damageMultiplier).toBe(1);
    expect(NONE.caltrops.mire).toBe(false);
  });

  it('deepens the slow with Rusted Barbs without inverting it', () => {
    const m = mods({ 'hunter.rusted_barbs': 5 }).caltrops;
    expect(m.slowFactor).toBeLessThan(CALTROPS_SLOW_FACTOR);
    expect(m.slowFactor).toBeGreaterThanOrEqual(0.15);
  });

  it('never lets stacked ranks drive the slow to a stop', () => {
    expect(mods({ 'hunter.rusted_barbs': 50 }).caltrops.slowFactor).toBeGreaterThanOrEqual(0.15);
  });

  it('scales radius and damage', () => {
    expect(mods({ 'hunter.wide_scatter': 1 }).caltrops.radius).toBeCloseTo(CALTROPS_RADIUS * 1.20);
    expect(mods({ 'hunter.barbed_wire': 1 }).caltrops.damageMultiplier).toBeCloseTo(1.08);
  });

  it('unlocks caltrops keystones past the soft cap', () => {
    expect(mods({ 'hunter.rusted_barbs': 6 }).caltrops.mire).toBe(true);
    expect(mods({ 'hunter.wide_scatter': 6 }).caltrops.secondHandful).toBe(true);
    expect(mods({ 'hunter.barbed_wire': 6 }).caltrops.bleedingGround).toBe(true);
  });
});

describe('deadfall modifiers', () => {
  it('returns base values with nothing skilled', () => {
    expect(NONE.deadfall.damageMin).toBe(DEADFALL_DAMAGE_MIN);
    expect(NONE.deadfall.chainRadius).toBe(DEADFALL_CHAIN_RADIUS);
    expect(NONE.deadfall.chainDamageMultiplier).toBe(1);
    expect(NONE.deadfall.roots).toBe(false);
  });

  it('scales damage with Heavy Jaws and chain damage with Cascade', () => {
    expect(mods({ 'hunter.heavy_jaws': 1 }).deadfall.damageMin).toBeCloseTo(DEADFALL_DAMAGE_MIN * 1.10);
    expect(mods({ 'hunter.cascade': 1 }).deadfall.chainDamageMultiplier).toBeCloseTo(1.15);
  });

  it('makes the chain unbounded with Daisy Chain', () => {
    expect(mods({ 'hunter.cascade': 4 }).deadfall.chainRadius).toBe(Infinity);
  });

  it('roots only with Maimed', () => {
    expect(mods({ 'hunter.heavy_jaws': 3 }).deadfall.roots).toBe(false);
    expect(mods({ 'hunter.heavy_jaws': 4 }).deadfall.roots).toBe(true);
  });

  it('reduces hunter cooldowns with Field Kit and refunds only with Rearm', () => {
    expect(mods({ 'hunter.field_kit': 1 }).trap.cooldownMultiplier).toBeCloseTo(1 - 0.08);
    expect(mods({ 'hunter.field_kit': 5 }).trap.rearm).toBe(false);
    expect(mods({ 'hunter.field_kit': 6 }).trap.rearm).toBe(true);
  });
});
