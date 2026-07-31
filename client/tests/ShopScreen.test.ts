import { describe, it, expect } from 'vitest';
import { canAfford, slotDisplayState, currentUtcDay, vendorViewIsStale } from '../src/items/ShopScreen';

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

describe('currentUtcDay', () => {
  it('formats a Date as YYYY-MM-DD in UTC', () => {
    expect(currentUtcDay(new Date('2026-07-30T23:59:59.999Z'))).toBe('2026-07-30');
  });

  it('rolls over at the exact midnight-UTC boundary', () => {
    expect(currentUtcDay(new Date('2026-07-31T00:00:00.000Z'))).toBe('2026-07-31');
  });
});

// The UTC-day-rollover guard (server, Task 3 scope, re-derives vendor stock
// statelessly per (user, day) — a buy fired the instant midnight UTC ticks
// over could otherwise silently target a different item/price than what's
// on screen). This is the pure predicate the Shop screen's buy-click
// handler consults before ever calling buyVendorSlot.
describe('vendorViewIsStale', () => {
  it('is not stale when the vendor view day matches "now"', () => {
    expect(vendorViewIsStale('2026-07-30', '2026-07-30')).toBe(false);
  });

  it('is stale once "now" has rolled over to the next UTC day', () => {
    expect(vendorViewIsStale('2026-07-30', '2026-07-31')).toBe(true);
  });

  it('is stale for any mismatch, not just a +1 day rollover (e.g. a long-open tab)', () => {
    expect(vendorViewIsStale('2026-07-28', '2026-07-30')).toBe(true);
  });
});
