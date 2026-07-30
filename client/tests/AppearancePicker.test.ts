import { describe, it, expect } from 'vitest';
import { cycleIndex, formatOptionLabel } from '../src/character/AppearancePicker';

describe('cycleIndex', () => {
  it('advances forward and wraps past the end', () => {
    expect(cycleIndex(4, 0, 1)).toBe(1);
    expect(cycleIndex(4, 3, 1)).toBe(0);
  });

  it('advances backward and wraps past the start', () => {
    expect(cycleIndex(4, 1, -1)).toBe(0);
    expect(cycleIndex(4, 0, -1)).toBe(3);
  });

  it('handles a single-option list by staying put', () => {
    expect(cycleIndex(1, 0, 1)).toBe(0);
    expect(cycleIndex(1, 0, -1)).toBe(0);
  });
});

describe('formatOptionLabel', () => {
  it('renders null as None', () => {
    expect(formatOptionLabel(null)).toBe('None');
  });

  it('title-cases a plain value', () => {
    expect(formatOptionLabel('ponytail')).toBe('Ponytail');
  });

  it('splits and title-cases snake_case values', () => {
    expect(formatOptionLabel('curly_short')).toBe('Curly Short');
    expect(formatOptionLabel('base_black')).toBe('Base Black');
  });
});
