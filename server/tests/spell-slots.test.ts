import { describe, it, expect } from 'vitest';
import { resolveSlots, MAX_SPELL_SLOTS, MOBILITY_SPELLS } from '@arena/shared';
import type { SpellId } from '@arena/shared';

const owned = (...ids: number[]) => new Set(ids as SpellId[]);

describe('resolveSlots', () => {
  it('always returns exactly MAX_SPELL_SLOTS entries', () => {
    expect(resolveSlots(new Set(), []).length).toBe(MAX_SPELL_SLOTS);
    expect(resolveSlots(owned(1, 2, 3, 4), []).length).toBe(MAX_SPELL_SLOTS);
  });

  it('with no rows, fills slots in SPELL_BINDINGS declaration order', () => {
    expect(resolveSlots(owned(1, 2, 3, 4), [])).toEqual([1, 2, 3, 4, null, null]);
  });

  it('with no rows, closes gaps rather than preserving spell ids as slots', () => {
    // A mage with only Fireball and Teleport gets them on keys 1 and 2.
    expect(resolveSlots(owned(1, 4), [])).toEqual([1, 4, null, null, null, null]);
  });

  it('honors explicit rows and auto-fills the rest into the lowest empty slots', () => {
    expect(resolveSlots(owned(1, 2), [{ slot: 3, spell: 1 }]))
      .toEqual([2, null, 1, null, null, null]);
  });

  it('drops rows naming a spell the character does not own', () => {
    expect(resolveSlots(owned(1), [{ slot: 2, spell: 7 }]))
      .toEqual([1, null, null, null, null, null]);
  });

  it('drops rows with an out-of-range slot', () => {
    expect(resolveSlots(owned(1), [{ slot: 0, spell: 1 }, { slot: 9, spell: 1 }]))
      .toEqual([1, null, null, null, null, null]);
  });

  it('drops rows naming a spell id outside the SpellId range', () => {
    expect(resolveSlots(owned(1), [{ slot: 2, spell: 99 }]))
      .toEqual([1, null, null, null, null, null]);
  });

  it('keeps the first row when two rows name the same spell', () => {
    expect(resolveSlots(owned(1), [{ slot: 2, spell: 1 }, { slot: 4, spell: 1 }]))
      .toEqual([null, 1, null, null, null, null]);
  });

  it('leaves the overflow unslotted when more spells are owned than slots', () => {
    const result = resolveSlots(owned(1, 2, 3, 4, 5, 6, 7), []);
    expect(result.filter(s => s !== null).length).toBe(MAX_SPELL_SLOTS);
    expect(result).not.toContain(null);
  });

  it('names a mobility spell for every class', () => {
    expect(MOBILITY_SPELLS.mage).toBe(4);
    expect(MOBILITY_SPELLS.ranger).toBe(8);
  });
});
