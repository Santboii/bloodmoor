import { describe, it, expect } from 'vitest';
import { buildSpellModifiers } from '../src/skills/SpellModifiers.ts';
import { SKILL_NODES, GUIDED_DESCENT_STEER_RADII } from '@arena/shared';

const mods = (entries: [string, number][]) => buildSpellModifiers(new Map(entries));

describe('fire modifiers', () => {
  it('is inert with no ranks', () => {
    const m = mods([]);
    expect(m.fireball.bounces).toBe(0);
    expect(m.fireball.embers).toBe(0);
    expect(m.meteor.chunks).toBe(0);
    expect(m.meteor.showerCount).toBe(0);
    expect(m.firewall.ramp).toBe(false);
  });

  it('reads count nodes off the explicit tables, not effectAtRank', () => {
    expect(mods([['fire.pyroclasm', 1]]).fireball.bounces).toBe(2);
    expect(mods([['fire.pyroclasm', 2]]).fireball.bounces).toBe(3);
    expect(mods([['fire.volatile_ember', 5]]).fireball.embers).toBe(6);
    expect(mods([['fire.molten_impact', 1]]).meteor.chunks).toBe(3);
    expect(mods([['fire.cataclysm', 3]]).meteor.showerCount).toBe(3);
  });

  it('turns on rank-1 riders', () => {
    expect(mods([['fire.enduring_flames', 1]]).firewall.ramp).toBe(true);
    expect(mods([['fire.inferno_expanse', 1]]).firewall.growth).toBe(true);
    expect(mods([['fire.searing_heat', 1]]).firewall.empowerFireball).toBe(true);
    expect(mods([['fire.blind_strike', 1]]).meteor.steerRadius).toBe(GUIDED_DESCENT_STEER_RADII[0]);
  });

  it('unlocks keystones only past soft cap', () => {
    expect(mods([['fire.pyroclasm', 3]]).fireball.perpetual).toBe(false);
    expect(mods([['fire.pyroclasm', 4]]).fireball.perpetual).toBe(true);
    expect(mods([['fire.volatile_ember', 5]]).fireball.chainReaction).toBe(false);
    expect(mods([['fire.volatile_ember', 6]]).fireball.chainReaction).toBe(true);
    expect(mods([['fire.seeking_flame', 6]]).fireball.huntersEmber).toBe(true);
    expect(mods([['fire.hellfire', 4]]).fireball.rollingDoom).toBe(true);
    expect(mods([['fire.enduring_flames', 6]]).firewall.eternalPyre).toBe(true);
    expect(mods([['fire.inferno_expanse', 6]]).firewall.firestorm).toBe(true);
    expect(mods([['fire.searing_heat', 6]]).firewall.blastfurnace).toBe(true);
    expect(mods([['fire.molten_impact', 4]]).meteor.ejecta).toBe(true);
    expect(mods([['fire.blind_strike', 4]]).meteor.fallingStar).toBe(true);
    expect(mods([['fire.cataclysm', 4]]).meteor.extinction).toBe(true);
  });

  // The builder takes Map<string, number>, so a typo'd id compiles and
  // silently returns 0. This is the only guard against that.
  it('only reads node ids that exist in SKILL_NODES', () => {
    const known = new Set<string>(SKILL_NODES.map(n => n.id));
    const read: string[] = [];
    buildSpellModifiers({
      get: (k: string) => { read.push(k); return 0; },
      has: () => false,
    } as unknown as Map<string, number>);
    expect(read.length).toBeGreaterThan(0);
    for (const id of read) expect(known, id).toContain(id);
  });
});
