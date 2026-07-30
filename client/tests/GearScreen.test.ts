import { describe, it, expect } from 'vitest';
import { ringTargetSlot, canEquip, itemBase, itemDisplayName, RARITY_COLORS } from '../src/items/GearScreen';
import type { ItemRow } from '@arena/shared';

function makeItem(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 'item-1',
    base_id: 'apprentice_staff',
    rarity: 'basic',
    affixes: [],
    level_req: 1,
    equipped_by: null,
    equipped_slot: null,
    slot: 'weapon',
    ...overrides,
  };
}

describe('ringTargetSlot', () => {
  it('fills ring1 first when both rings are empty', () => {
    expect(ringTargetSlot([])).toBe('ring1');
  });

  it('fills the empty ring2 when ring1 is occupied', () => {
    expect(ringTargetSlot(['ring1'])).toBe('ring2');
  });

  it('fills the empty ring1 when only ring2 is occupied', () => {
    expect(ringTargetSlot(['ring2'])).toBe('ring1');
  });

  it('swaps ring2 when both rings are occupied', () => {
    expect(ringTargetSlot(['ring1', 'ring2'])).toBe('ring2');
  });

  it('ignores non-ring slots in the occupied list', () => {
    expect(ringTargetSlot(['weapon', 'helmet'])).toBe('ring1');
  });
});

describe('canEquip', () => {
  it('allows a base item with no restrictions at any level', () => {
    const item = makeItem({ base_id: 'leather_cap', slot: 'helmet', level_req: 1 });
    expect(canEquip(item, 1, 'mage')).toEqual({ ok: true });
  });

  it('rejects when the character level is below level_req', () => {
    const item = makeItem({ base_id: 'iron_helm', slot: 'helmet', level_req: 7 });
    const result = canEquip(item, 4, 'mage');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Requires level 7');
  });

  it('allows when the character level meets level_req exactly', () => {
    const item = makeItem({ base_id: 'iron_helm', slot: 'helmet', level_req: 7 });
    expect(canEquip(item, 7, 'mage')).toEqual({ ok: true });
  });

  it('rejects a class-restricted weapon for the wrong class', () => {
    const item = makeItem({ base_id: 'apprentice_staff', slot: 'weapon', level_req: 1 });
    const result = canEquip(item, 1, 'ranger');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Restricted to mage');
  });

  it('allows a class-restricted weapon for the matching class', () => {
    const item = makeItem({ base_id: 'short_bow', slot: 'weapon', level_req: 1 });
    expect(canEquip(item, 1, 'ranger')).toEqual({ ok: true });
  });

  it('reports the level gate before the class gate when both fail', () => {
    const item = makeItem({ base_id: 'great_bow', slot: 'weapon', level_req: 10 });
    const result = canEquip(item, 1, 'mage');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Requires level 10');
  });
});

// Exported for reuse by LobbyUI's "War Spoils" result-screen card (Task 4)
// instead of duplicating rarity-color/name-resolution logic there.
describe('itemBase', () => {
  it('resolves the ItemBase manifest entry for a known base_id', () => {
    const item = makeItem({ base_id: 'apprentice_staff' });
    expect(itemBase(item)?.id).toBe('apprentice_staff');
  });

  it('returns undefined for an unknown base_id', () => {
    const item = makeItem({ base_id: 'not_a_real_base' });
    expect(itemBase(item)).toBeUndefined();
  });
});

describe('itemDisplayName', () => {
  it('uses the unique manifest name for a unique-rarity item', () => {
    const item = makeItem({ base_id: 'moon_amulet', rarity: 'unique', slot: 'amulet' });
    const base = itemBase(item)!;
    expect(itemDisplayName(item, base)).toBe('Emberheart');
  });

  it('falls back to the base name for non-unique rarities', () => {
    const item = makeItem({ base_id: 'apprentice_staff', rarity: 'magic' });
    const base = itemBase(item)!;
    expect(itemDisplayName(item, base)).toBe(base.name);
  });
});

describe('RARITY_COLORS', () => {
  it('has an entry for every item rarity', () => {
    expect(Object.keys(RARITY_COLORS).sort()).toEqual(['basic', 'magic', 'rare', 'unique']);
  });
});
