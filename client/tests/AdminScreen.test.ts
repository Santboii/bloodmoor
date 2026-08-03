import { describe, it, expect } from 'vitest';
import { normalizeWeights, validateDropWeights, adminUniqueName } from '../src/admin/AdminScreen';

describe('adminUniqueName', () => {
  it('returns null for a non-unique row', () => {
    expect(adminUniqueName({ unique_id: null })).toBeNull();
  });

  it('resolves the manifest name for a unique_id', () => {
    expect(adminUniqueName({ unique_id: 'cinderfall' })).toBe('Cinderfall');
  });

  it('distinguishes the two moon_amulet uniques, which share a base_id', () => {
    expect(adminUniqueName({ unique_id: 'emberheart' })).toBe('Emberheart');
    expect(adminUniqueName({ unique_id: 'the_quiet_hour' })).toBe('The Quiet Hour');
  });

  it('falls back to the raw id for an unrecognized unique_id', () => {
    expect(adminUniqueName({ unique_id: 'not_a_real_unique' })).toBe('not_a_real_unique');
  });
});

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

describe('validateDropWeights', () => {
  it('accepts the seed weights for every context', () => {
    expect(validateDropWeights({ basic: 70, magic: 24, rare: 5.5, unique: 0.5 })).toBeNull();
    expect(validateDropWeights({ basic: 60, magic: 32, rare: 7.5, unique: 0.5 })).toBeNull();
    expect(validateDropWeights({ basic: 25, magic: 50, rare: 21, unique: 4 })).toBeNull();
  });

  it('accepts any set of weights with at least one positive and none negative', () => {
    expect(validateDropWeights({ basic: 1, magic: 0, rare: 0, unique: 0 })).toBeNull();
  });

  it('rejects a single negative weight, naming the non-negative rule', () => {
    expect(validateDropWeights({ basic: -1, magic: 24, rare: 5.5, unique: 0.5 }))
      .toBe('Weights must be non-negative.');
  });

  it('rejects when every weight is negative', () => {
    expect(validateDropWeights({ basic: -1, magic: -1, rare: -1, unique: -1 }))
      .toBe('Weights must be non-negative.');
  });

  it('rejects all-zero weights, naming the at-least-one-positive rule', () => {
    expect(validateDropWeights({ basic: 0, magic: 0, rare: 0, unique: 0 }))
      .toBe('At least one weight must be positive.');
  });

  it('checks the non-negative rule before the positive-sum rule', () => {
    // A negative paired with an offsetting positive can still sum > 0 —
    // the non-negative check must fire first, not the sum check.
    expect(validateDropWeights({ basic: -5, magic: 10, rare: 0, unique: 0 }))
      .toBe('Weights must be non-negative.');
  });
});
