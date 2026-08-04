import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../src/sanitizeInput.ts';

// A valid aim point is required for sanitizeInput to return anything but
// null — it is not what this file is testing, so keep it fixed and legal.
const aimTarget = { x: 10, y: 20 };

describe('sanitizeInput castSpell', () => {
  it('accepts mage/ranger spells 1-8', () => {
    for (let spell = 1; spell <= 8; spell++) {
      expect(sanitizeInput({ aimTarget, castSpell: spell })?.castSpell).toBe(spell);
    }
  });

  it('accepts frost spells 9-12, gladiator spells 13-16 and hunter spells 17-19', () => {
    for (const spell of [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]) {
      expect(sanitizeInput({ aimTarget, castSpell: spell })?.castSpell).toBe(spell);
    }
  });

  it('rejects out-of-range and malformed values to null', () => {
    // 20 is the first id past the allocated space — bump this as new spells land.
    for (const spell of [0, 20, 'x', null]) {
      const result = sanitizeInput({ aimTarget, castSpell: spell });
      // castSpell: null is itself a legal "no cast" value and round-trips as
      // null rather than being rejected outright — assert on the frame.
      expect(result?.castSpell ?? null).toBeNull();
      expect(result).not.toBeNull();
    }
  });
});

describe('sanitizeInput blocking', () => {
  it('passes blocking through when true', () => {
    expect(sanitizeInput({ aimTarget, blocking: true })?.blocking).toBe(true);
  });

  it('leaves blocking undefined when absent', () => {
    expect(sanitizeInput({ aimTarget })?.blocking).toBeUndefined();
  });

  it('leaves blocking undefined when explicitly false', () => {
    expect(sanitizeInput({ aimTarget, blocking: false })?.blocking).toBeUndefined();
  });

  it('rejects non-boolean truthy garbage rather than coercing it', () => {
    expect(sanitizeInput({ aimTarget, blocking: 'yes' })?.blocking).toBeUndefined();
    expect(sanitizeInput({ aimTarget, blocking: 1 })?.blocking).toBeUndefined();
  });
});

describe('sanitizeInput move/aimTarget (existing behavior, unchanged by this fix)', () => {
  it('clamps move axes to [-1, 1] and defaults missing/invalid axes to 0', () => {
    const result = sanitizeInput({ aimTarget, move: { x: 5, y: 'bad' } });
    expect(result?.move).toEqual({ x: 1, y: 0 });
  });

  it('rejects the whole frame to null when aimTarget is missing or out of bounds', () => {
    expect(sanitizeInput({ move: { x: 0, y: 0 } })).toBeNull();
    expect(sanitizeInput({ aimTarget: { x: 1_000_000, y: 0 } })).toBeNull();
  });
});
