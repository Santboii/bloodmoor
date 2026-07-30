import { describe, it, expect } from 'vitest';
import { normalizeWeights } from '../src/admin/AdminScreen';

describe('normalizeWeights', () => {
  it('leaves already-100 seed weights effectively unchanged', () => {
    expect(normalizeWeights({ basic: 70, magic: 24, rare: 5.5, unique: 0.5 }))
      .toEqual({ basic: 70, magic: 24, rare: 5.5, unique: 0.5 });
  });

  it('normalizes equal weights to 25% each', () => {
    expect(normalizeWeights({ basic: 1, magic: 1, rare: 1, unique: 1 }))
      .toEqual({ basic: 25, magic: 25, rare: 25, unique: 25 });
  });

  it('normalizes arbitrary weights proportionally', () => {
    expect(normalizeWeights({ basic: 1, magic: 2, rare: 3, unique: 4 }))
      .toEqual({ basic: 10, magic: 20, rare: 30, unique: 40 });
  });

  it('rounds to one decimal place', () => {
    expect(normalizeWeights({ basic: 1, magic: 1, rare: 1, unique: 0 }))
      .toEqual({ basic: 33.3, magic: 33.3, rare: 33.3, unique: 0 });
  });

  it('matches the lootbox_basic seed values', () => {
    expect(normalizeWeights({ basic: 60, magic: 32, rare: 7.5, unique: 0.5 }))
      .toEqual({ basic: 60, magic: 32, rare: 7.5, unique: 0.5 });
  });

  it('matches the lootbox_premium seed values', () => {
    expect(normalizeWeights({ basic: 25, magic: 50, rare: 21, unique: 4 }))
      .toEqual({ basic: 25, magic: 50, rare: 21, unique: 4 });
  });

  it('returns all zeros when every weight is zero (no divide-by-zero)', () => {
    expect(normalizeWeights({ basic: 0, magic: 0, rare: 0, unique: 0 }))
      .toEqual({ basic: 0, magic: 0, rare: 0, unique: 0 });
  });

  it('returns all zeros for a negative-sum edge case', () => {
    expect(normalizeWeights({ basic: -1, magic: 0, rare: 0, unique: 0 }))
      .toEqual({ basic: 0, magic: 0, rare: 0, unique: 0 });
  });

  it('handles a single non-zero weight as 100%', () => {
    expect(normalizeWeights({ basic: 0, magic: 0, rare: 0, unique: 5 }))
      .toEqual({ basic: 0, magic: 0, rare: 0, unique: 100 });
  });
});
