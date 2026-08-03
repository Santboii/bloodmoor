import { describe, it, expect } from 'vitest';
import { CHARACTER_CLASSES, normalizeCharacterClass, CLASS_DEFAULT_APPEARANCE } from '@arena/shared';

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
