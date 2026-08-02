import { describe, it, expect } from 'vitest';
import { auraPhaseFor } from '../src/renderer/RestAuraRenderer';
import type { PlayerState } from '@arena/shared';

function mkPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    displayName: 'Tester',
    charClass: 'mage',
    position: { x: 500, y: 500 },
    hp: 400,
    mana: 300,
    maxHp: 800,
    maxMana: 500,
    statMults: { damage: 1, cooldown: 1, moveSpeed: 1, manaRegen: 1 },
    facing: 0,
    castingSpell: null,
    cooldowns: {},
    ...overrides,
  };
}

describe('auraPhaseFor', () => {
  it('returns resting for a resting player', () => {
    expect(auraPhaseFor(mkPlayer({ resting: true }), 1000)).toBe('resting');
  });

  it('returns windup while the cast end is in the future', () => {
    expect(auraPhaseFor(mkPlayer({ restCastEndTick: 1100 }), 1000)).toBe('windup');
  });

  it('returns null once the cast end has passed and resting is not set', () => {
    expect(auraPhaseFor(mkPlayer({ restCastEndTick: 1000 }), 1000)).toBeNull();
  });

  it('prefers windup when both fields are present', () => {
    expect(auraPhaseFor(mkPlayer({ restCastEndTick: 1100, resting: true }), 1000)).toBe('windup');
  });

  it('returns null for dead players even if resting', () => {
    expect(auraPhaseFor(mkPlayer({ hp: 0, resting: true }), 1000)).toBeNull();
  });

  it('returns null for invisible players so the aura cannot reveal them', () => {
    expect(auraPhaseFor(mkPlayer({ resting: true, invisibleUntil: 1200 }), 1000)).toBeNull();
    expect(auraPhaseFor(mkPlayer({ restCastEndTick: 1100, invisibleUntil: 1200 }), 1000)).toBeNull();
  });

  it('returns null for an idle player', () => {
    expect(auraPhaseFor(mkPlayer(), 1000)).toBeNull();
  });
});
