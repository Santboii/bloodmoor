import { describe, it, expect } from 'vitest';
import { dropStingSemitones } from '../src/audio/sfx';

describe('dropStingSemitones', () => {
  it('rises with rarity tier', () => {
    expect(dropStingSemitones('basic')).toBe(0);
    expect(dropStingSemitones('magic')).toBe(3);
    expect(dropStingSemitones('rare')).toBe(7);
    expect(dropStingSemitones('unique')).toBe(12);
  });

  it('treats unknown rarities as basic', () => {
    expect(dropStingSemitones('mythic-nonsense')).toBe(0);
  });
});
