import { describe, it, expect } from 'vitest';
import { CHARACTER_CLASSES, normalizeCharacterClass, CLASS_DEFAULT_APPEARANCE } from '@arena/shared';
import { SPELL_CONFIG, SPELL_BINDINGS, CLASS_DEFAULT_NODE, MOBILITY_SPELLS,
         SKILL_NODES, GATES, canUnlock, classOfSpell, ITEM_BASES } from '@arena/shared';
import type { NodeId } from '@arena/shared';

describe('Gladiator character class', () => {
  it('includes gladiator in CHARACTER_CLASSES', () => {
    const glad = CHARACTER_CLASSES.find(c => c.id === 'gladiator');
    expect(glad).toBeDefined();
    expect(glad!.label).toBe('Gladiator');
    expect(glad!.enabled).toBe(true);
  });

  it('normalizes gladiator instead of clamping to mage', () => {
    expect(normalizeCharacterClass('gladiator')).toBe('gladiator');
    expect(normalizeCharacterClass('nonsense')).toBe('mage');
  });

  it('has a default appearance', () => {
    expect(CLASS_DEFAULT_APPEARANCE.gladiator).toBeDefined();
    expect(CLASS_DEFAULT_APPEARANCE.gladiator.torso).toBe('longsleeve');
  });
});

describe('Gladiator spells and skill tree', () => {
  it('binds spells 13-16 to gladiator with default slots 1-4', () => {
    const glad = SPELL_BINDINGS.filter(b => b.charClass === 'gladiator');
    expect(glad.map(b => [b.spell, b.node, b.defaultSlot])).toEqual([
      [13, 'arms.jab', 1],
      [14, 'arms.spear_throw', 2],
      [15, 'bulwark.reflect', 3],
      [16, 'arms.leap', 4],
    ]);
    expect(CLASS_DEFAULT_NODE.gladiator).toBe('arms.jab');
    expect(MOBILITY_SPELLS.gladiator).toBe(16);
    expect(classOfSpell(14)).toBe('gladiator');
  });

  it('leaves 9-12 to the frost tree — gladiator ids never collide', () => {
    for (const b of SPELL_BINDINGS.filter(b => b.charClass === 'gladiator')) {
      expect(b.spell).toBeGreaterThanOrEqual(13);
    }
    for (const b of SPELL_BINDINGS.filter(b => [9, 10, 11, 12].includes(b.spell))) {
      expect(b.charClass).toBe('mage');
    }
  });

  it('has SPELL_CONFIG entries for 13-16', () => {
    expect(SPELL_CONFIG[13]).toEqual({ manaCost: 10, cooldownTicks: 30 });
    expect(SPELL_CONFIG[14]).toEqual({ manaCost: 40, cooldownTicks: 360 });
    expect(SPELL_CONFIG[15]).toEqual({ manaCost: 40, cooldownTicks: 480 });
    expect(SPELL_CONFIG[16]).toEqual({ manaCost: 30, cooldownTicks: 180 });
  });

  it('has 6 arms nodes and 4 bulwark nodes', () => {
    expect(SKILL_NODES.filter(n => n.tree === 'arms')).toHaveLength(6);
    expect(SKILL_NODES.filter(n => n.tree === 'bulwark')).toHaveLength(4);
  });

  it('gates leap behind spear_throw plus one tier-3 node', () => {
    const base = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
    expect(canUnlock('arms.leap' as NodeId, base)).toBe(false);
    const withStun = new Map([...base, ['arms.stunning_blow' as NodeId, 1]]);
    expect(canUnlock('arms.leap' as NodeId, withStun)).toBe(true);
  });

  it('gates reflect behind bracing', () => {
    expect(canUnlock('bulwark.reflect' as NodeId, new Map())).toBe(false);
    expect(canUnlock('bulwark.reflect' as NodeId, new Map([['bulwark.bracing' as NodeId, 1]]))).toBe(true);
  });
});

describe('Gladiator weapons', () => {
  it('ships gladiator-restricted spears at bands 1/7/10', () => {
    const spears = ITEM_BASES.filter(b => b.slot === 'weapon' && b.classRestriction === 'gladiator');
    expect(spears.map(s => s.itemLevel).sort((a, b) => a - b)).toEqual([1, 7, 10]);
  });
});
