import { describe, it, expect } from 'vitest';
import { canAfford, slotDisplayState } from '../src/items/ShopScreen';

describe('canAfford', () => {
  it('allows a purchase when gold exceeds the price', () => {
    expect(canAfford(200, 150)).toBe(true);
  });

  it('allows a purchase when gold exactly equals the price', () => {
    expect(canAfford(150, 150)).toBe(true);
  });

  it('rejects a purchase when gold is short', () => {
    expect(canAfford(100, 150)).toBe(false);
  });

  it('rejects any purchase when gold is null (no session / load failure)', () => {
    expect(canAfford(null, 0)).toBe(false);
  });

  it('allows a free (zero-price) purchase at zero gold', () => {
    expect(canAfford(0, 0)).toBe(true);
  });
});

describe('slotDisplayState', () => {
  it('is "available" when unpurchased and affordable', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 200)).toBe('available');
  });

  it('is "unaffordable" when unpurchased and gold is short', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 50)).toBe('unaffordable');
  });

  it('is "sold" once purchased, regardless of current gold', () => {
    expect(slotDisplayState({ purchased: true, price: 100 }, 500)).toBe('sold');
  });

  it('prefers "sold" over "unaffordable" when both would otherwise apply', () => {
    expect(slotDisplayState({ purchased: true, price: 100 }, 0)).toBe('sold');
  });

  it('is "unaffordable" when gold is null and the slot is unpurchased', () => {
    expect(slotDisplayState({ purchased: false, price: 0 }, null)).toBe('unaffordable');
  });
});
