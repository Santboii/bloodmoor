import { describe, it, expect } from 'vitest';
import { layerTargets } from '../src/audio/ambience';

describe('layerTargets', () => {
  it('hall: base and torch loops, no wind, never the tension pulse', () => {
    const t = layerTargets('hall', false);
    expect(t.base).toBeGreaterThan(0);
    expect(t.torch).toBeGreaterThan(0);
    expect(t.wind).toBe(0);
    expect(t.pulse).toBe(0);
    expect(layerTargets('hall', true).pulse).toBe(0);
  });

  it('arena: wind only, no hall base or torch crackle', () => {
    const t = layerTargets('arena', false);
    expect(t.wind).toBeGreaterThan(0);
    expect(t.base).toBe(0);
    expect(t.torch).toBe(0);
  });

  it('arena pulse only while dueling', () => {
    expect(layerTargets('arena', true).pulse).toBeGreaterThan(0);
    expect(layerTargets('arena', false).pulse).toBe(0);
  });

  it('off silences every layer', () => {
    expect(Object.values(layerTargets('off', true)).every(v => v === 0)).toBe(true);
  });
});
