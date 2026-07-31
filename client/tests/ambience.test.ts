import { describe, it, expect } from 'vitest';
import { layerTargets } from '../src/audio/ambience';

describe('layerTargets', () => {
  it('hall: wind, crackle, and drone; never the tension pulse', () => {
    const t = layerTargets('hall', false);
    expect(t.wind).toBeGreaterThan(0);
    expect(t.crackle).toBeGreaterThan(0);
    expect(t.drone).toBeGreaterThan(0);
    expect(t.pulse).toBe(0);
    expect(layerTargets('hall', true).pulse).toBe(0);
  });

  it('arena: wind and thinner drone, no torch crackle', () => {
    const t = layerTargets('arena', false);
    expect(t.wind).toBeGreaterThan(0);
    expect(t.crackle).toBe(0);
    expect(t.drone).toBeGreaterThan(0);
    expect(t.drone).toBeLessThan(layerTargets('hall', false).drone);
  });

  it('arena pulse only while dueling', () => {
    expect(layerTargets('arena', true).pulse).toBeGreaterThan(0);
    expect(layerTargets('arena', false).pulse).toBe(0);
  });

  it('off silences every layer', () => {
    expect(Object.values(layerTargets('off', true)).every(v => v === 0)).toBe(true);
  });
});
