import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ParticleSystem, AURA_SOFT_CAP } from '../src/renderer/ParticleSystem';

const WHITE: readonly [number, number, number] = [1, 1, 1];

function sys(): ParticleSystem {
  return new ParticleSystem(new THREE.Scene());
}

describe('emitAura', () => {
  it('spawns particles for every style', () => {
    for (const style of ['embers', 'frost', 'orbit', 'drip'] as const) {
      const p = sys();
      p.emitAura(style, WHITE, 0, 20, 0);
      expect(p.activeParticles(), style).toBeGreaterThan(0);
    }
  });
  it('emits a wisp only while the wearer is moving', () => {
    const still = sys();
    still.emitAura('wisp', WHITE, 0, 2, 0, { moving: false });
    expect(still.activeParticles()).toBe(0);

    const running = sys();
    running.emitAura('wisp', WHITE, 0, 2, 0, { moving: true });
    expect(running.activeParticles()).toBeGreaterThan(0);
  });
  it('spawns one particle per mote for orbit', () => {
    const p = sys();
    p.emitAura('orbit', WHITE, 0, 20, 0, { motes: 3 });
    expect(p.activeParticles()).toBe(3);
  });
  it('applies the aura color rather than the default fire color', () => {
    const p = sys();
    p.emitAura('drip', [0.2, 0.4, 0.6], 0, 20, 0);
    p.update(1 / 60);
    const colors = (p as unknown as { colorBuffer: Float32Array }).colorBuffer;
    expect(colors[0]).toBeCloseTo(0.2, 5);
    expect(colors[1]).toBeCloseTo(0.4, 5);
    expect(colors[2]).toBeCloseTo(0.6, 5);
  });
  it('yields to spells: emits nothing once the pool is past the aura cap', () => {
    const p = sys();
    while (p.activeParticles() < AURA_SOFT_CAP) p.emitExplosion(0, 0, 0, 30);
    const before = p.activeParticles();
    p.emitAura('embers', WHITE, 0, 20, 0);
    expect(p.activeParticles()).toBe(before);
  });
  it('lets embers rise while drip falls', () => {
    // Compare each particle against its OWN start height — embers spawn with
    // a vertical jitter, so a fixed 20 is not a valid reference point.
    const y = (p: ParticleSystem) => (p as unknown as { posY: Float32Array }).posY[0];

    const rising = sys();
    rising.emitAura('embers', WHITE, 0, 20, 0);
    const risingStart = y(rising);

    const falling = sys();
    falling.emitAura('drip', WHITE, 0, 20, 0);
    const fallingStart = y(falling);

    for (let i = 0; i < 6; i++) { rising.update(1 / 60); falling.update(1 / 60); }

    expect(y(rising)).toBeGreaterThan(risingStart);
    expect(y(falling)).toBeLessThan(fallingStart);
  });
});
