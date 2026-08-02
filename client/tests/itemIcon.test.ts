import { describe, it, expect } from 'vitest';
import { ITEM_BASES, UNIQUE_ITEMS } from '@arena/shared';
import { iconFor, iconCellAttrs } from '../src/items/itemIcon';

const helm = ITEM_BASES.find(b => b.id === 'iron_helm')!;
const ring = ITEM_BASES.find(b => b.id === 'bone_ring')!;

describe('iconCellAttrs', () => {
  it('emits the sprite hook for bases with sprite layers', () => {
    expect(iconCellAttrs(helm)).toBe(' data-icon-base="iron_helm"');
  });
  it('emits nothing for stat-only bases, so they keep their glyph', () => {
    expect(iconCellAttrs(ring)).toBe('');
  });
  it('tags a unique icon cell with its unique id so the tint applies', () => {
    const staff = ITEM_BASES.find(b => b.id === 'gnarled_staff')!;
    const cinderfall = UNIQUE_ITEMS.find(u => u.id === 'cinderfall')!;
    const attrs = iconCellAttrs(staff, cinderfall);
    expect(attrs).toContain('data-icon-base="gnarled_staff"');
    expect(attrs).toContain('data-icon-unique="cinderfall"');
  });
  it('omits the unique attribute for a plain base', () => {
    const staff = ITEM_BASES.find(b => b.id === 'gnarled_staff')!;
    expect(iconCellAttrs(staff)).not.toContain('data-icon-unique');
  });
  it('still emits nothing for a base with no sprite layers', () => {
    const ring = ITEM_BASES.find(b => b.id === 'bone_ring')!;
    expect(iconCellAttrs(ring)).toBe('');
  });
});

describe('iconFor', () => {
  it('resolves null for bases without sprite layers', async () => {
    expect(await iconFor(ring)).toBeNull();
  });
  it('caches one promise per base id', () => {
    expect(iconFor(helm)).toBe(iconFor(helm));
  });
});
