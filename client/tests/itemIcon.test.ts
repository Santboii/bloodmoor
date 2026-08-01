import { describe, it, expect } from 'vitest';
import { ITEM_BASES } from '@arena/shared';
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
});

describe('iconFor', () => {
  it('resolves null for bases without sprite layers', async () => {
    expect(await iconFor(ring)).toBeNull();
  });
  it('caches one promise per base id', () => {
    expect(iconFor(helm)).toBe(iconFor(helm));
  });
});
