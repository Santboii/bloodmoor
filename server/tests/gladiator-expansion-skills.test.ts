import { describe, it, expect } from 'vitest';
import { SPELL_CONFIG, SPELL_BINDINGS, SKILL_NODES, GATES, canUnlock, countAtRank,
         classOfSpell } from '@arena/shared';
import type { NodeId } from '@arena/shared';

describe('Gladiator expansion manifests', () => {
  it('binds 17-20 to gladiator with NO default slots', () => {
    const rows = SPELL_BINDINGS.filter(b => [20, 21, 22, 23].includes(b.spell));
    expect(rows.map(b => [b.spell, b.node, b.charClass, b.defaultSlot])).toEqual([
      [20, 'arms.spear_flurry', 'gladiator', undefined],
      [21, 'bulwark.war_cry', 'gladiator', undefined],
      [22, 'arms.harpoon', 'gladiator', undefined],
      [23, 'bulwark.kick_up_dust', 'gladiator', undefined],
    ]);
    expect(classOfSpell(22)).toBe('gladiator');
  });

  it('has SPELL_CONFIG for 17-20', () => {
    expect(SPELL_CONFIG[21]).toEqual({ manaCost: 50, cooldownTicks: 720 });
    expect(SPELL_CONFIG[22]).toEqual({ manaCost: 60, cooldownTicks: 600 });
    expect(SPELL_CONFIG[23]).toEqual({ manaCost: 40, cooldownTicks: 840 });
    expect(SPELL_CONFIG[20]).toEqual({ manaCost: 55, cooldownTicks: 480 });
  });

  it('grows arms to 11 and bulwark to 9 nodes', () => {
    expect(SKILL_NODES.filter(n => n.tree === 'arms')).toHaveLength(11);
    expect(SKILL_NODES.filter(n => n.tree === 'bulwark')).toHaveLength(9);
  });

  it('every gladiator stackable now carries a keystone', () => {
    const glads = SKILL_NODES.filter(n => (n.tree === 'arms' || n.tree === 'bulwark') && n.stackable);
    for (const n of glads) expect(n.keystone, n.id).toBeDefined();
  });

  it('gates: flurry needs leap; harpoon needs flurry or serrated edge; dust needs war cry or reflect', () => {
    const base = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 1], ['arms.leap', 1]]);
    expect(canUnlock('arms.spear_flurry' as NodeId, base)).toBe(true);
    expect(canUnlock('arms.harpoon' as NodeId, base)).toBe(false);
    expect(canUnlock('arms.harpoon' as NodeId, new Map([...base, ['arms.spear_flurry' as NodeId, 1]]))).toBe(true);
    const bw = new Map<NodeId, number>([['bulwark.bracing', 1], ['bulwark.reflect', 1]]);
    expect(canUnlock('bulwark.kick_up_dust' as NodeId, bw)).toBe(true);
    expect(canUnlock('bulwark.kick_up_dust' as NodeId, new Map([['bulwark.bracing' as NodeId, 1]]))).toBe(false);
  });

  it('countAtRank serves the gladiator table', () => {
    expect(countAtRank('arms.extended_flurry' as NodeId, 0)).toBe(0);
    expect(countAtRank('arms.extended_flurry' as NodeId, 2)).toBe(2);
    expect(countAtRank('arms.extended_flurry' as NodeId, 5)).toBe(3); // clamps at table end
  });
});
