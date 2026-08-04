import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../src/sanitizeInput.ts';
import { SPELL_BINDINGS } from '@arena/shared';

// A valid aim point is required for sanitizeInput to return anything but
// null — it is not what this file is testing, so keep it fixed and legal.
const aimTarget = { x: 10, y: 20 };

describe('sanitizeInput castSpell', () => {
  it('accepts every spell id currently bound in SPELL_BINDINGS (1-20)', () => {
    // Driven by SPELL_BINDINGS itself (the same source sanitizeInput's
    // VALID_SPELL_IDS is built from) rather than a hardcoded list, so a
    // future spell added to the manifest without widening sanitizeInput's
    // accepted range fails here instead of silently drifting out of test
    // coverage. The equality check pins the currently-expected bound set.
    const ids = SPELL_BINDINGS.map(b => b.spell).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const spell of ids) {
      expect(sanitizeInput({ aimTarget, castSpell: spell })?.castSpell).toBe(spell);
    }
  });

  it('rejects out-of-range and malformed values to null', () => {
    for (const spell of [0, 21, 'x', null]) {
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
