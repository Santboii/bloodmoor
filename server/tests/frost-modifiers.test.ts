import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildSpellModifiers } from '../src/skills/SpellModifiers.ts';
import {
  SKILL_NODES, effectAtRank, ICEBOLT_CHILL_FACTOR, BLIZZARD_RADIUS,
  FROZEN_ORB_SHARDS_PER_VOLLEY,
} from '@arena/shared';
import type { NodeId } from '@arena/shared';

const ranks = (entries: [string, number][]) => new Map<string, number>(entries);

describe('frost modifiers at rank 0', () => {
  const m = buildSpellModifiers(ranks([]));

  it('leaves Ice Bolt at its base chill', () => {
    expect(m.iceBolt.chillFactor).toBeCloseTo(ICEBOLT_CHILL_FACTOR);
    expect(m.iceBolt.pierce).toBe(0);
    expect(m.iceBolt.splinters).toBe(0);
  });

  it('leaves Blizzard and the orb unscaled', () => {
    expect(m.blizzard.durationMultiplier).toBeCloseTo(1);
    expect(m.blizzard.radiusMultiplier).toBeCloseTo(1);
    expect(m.frozenOrb.shardsPerVolley).toBe(FROZEN_ORB_SHARDS_PER_VOLLEY);
  });

  it('has every keystone off', () => {
    expect(m.iceBolt.impaler).toBe(false);
    expect(m.iceBolt.flashFreeze).toBe(false);
    expect(m.blizzard.permafrost).toBe(false);
    expect(m.blizzard.absoluteZero).toBe(false);
    expect(m.frozenOrb.detonateOnExpiry).toBe(false);
  });
});

describe('frost modifiers scale with rank', () => {
  it('Bitter Chill deepens the slow', () => {
    const m = buildSpellModifiers(ranks([['frost.bitter_chill', 3]]));
    expect(m.iceBolt.chillFactor).toBeLessThan(ICEBOLT_CHILL_FACTOR);
  });

  it('Ice Lance adds pierce', () => {
    const m = buildSpellModifiers(ranks([['frost.ice_lance', 2]]));
    expect(m.iceBolt.pierce).toBeGreaterThan(0);
  });

  it('Whiteout widens the blizzard', () => {
    const m = buildSpellModifiers(ranks([['frost.whiteout', 3]]));
    expect(m.blizzard.radiusMultiplier).toBeCloseTo(1 + effectAtRank(0.20, 3));
  });

  it('Shard Storm adds shards', () => {
    const m = buildSpellModifiers(ranks([['frost.shard_storm', 2]]));
    expect(m.frozenOrb.shardsPerVolley).toBeGreaterThan(FROZEN_ORB_SHARDS_PER_VOLLEY);
  });

  it('Cold Mastery raises damage across all three spells', () => {
    const base = buildSpellModifiers(ranks([]));
    const m = buildSpellModifiers(ranks([['frost.cold_mastery', 3]]));
    expect(m.iceBolt.damageMax).toBeGreaterThan(base.iceBolt.damageMax);
    expect(m.blizzard.damageMultiplier).toBeGreaterThan(base.blizzard.damageMultiplier);
    expect(m.frozenOrb.damageMax).toBeGreaterThan(base.frozenOrb.damageMax);
  });
});

describe('frost keystones activate past soft cap', () => {
  const cases: [NodeId, number, (m: ReturnType<typeof buildSpellModifiers>) => boolean][] = [
    ['frost.bitter_chill',     5, m => m.iceBolt.flashFreeze],
    ['frost.ice_lance',        3, m => m.iceBolt.impaler],
    ['frost.frostbite',        3, m => m.iceBolt.rimeheart],
    ['frost.splintering_ice',  3, m => m.iceBolt.flechette],
    ['frost.lingering_winter', 5, m => m.blizzard.permafrost],
    ['frost.deepening_cold',   5, m => m.blizzard.absoluteZero],
    ['frost.whiteout',         5, m => m.blizzard.blindingSquall],
    ['frost.shard_storm',      3, m => m.frozenOrb.detonateOnExpiry],
    ['frost.cold_mastery',     5, m => m.frozenOrb.absoluteCold],
  ];

  for (const [node, softCap, read] of cases) {
    it(`${node} activates only above rank ${softCap}`, () => {
      expect(read(buildSpellModifiers(ranks([[node, softCap]])))).toBe(false);
      expect(read(buildSpellModifiers(ranks([[node, softCap + 1]])))).toBe(true);
    });
  }
});

describe('modifier node ids are real', () => {
  it('every frost node the builder reads exists in SKILL_NODES', () => {
    // buildSpellModifiers takes Map<string, number>, so a typo'd id compiles
    // and silently reads 0 forever. This is the only guard against that.
    const ids = new Set(SKILL_NODES.map(n => n.id as string));
    const source = readFileSync(
      new URL('../src/skills/SpellModifiers.ts', import.meta.url), 'utf8',
    );
    for (const [, id] of source.matchAll(/rank\('(frost\.[a-z_]+)'\)/g)) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
