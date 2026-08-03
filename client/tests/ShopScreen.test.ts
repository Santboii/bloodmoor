import { describe, it, expect } from 'vitest';
import { canAfford, slotDisplayState, slotExpired, formatCountdown, rotationRefreshDelay } from '../src/items/ShopScreen';

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
  const PLENTY = 6;

  it('is "available" when unpurchased, affordable, and within the daily allowance', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 200, PLENTY)).toBe('available');
  });

  it('is "unaffordable" when unpurchased and gold is short', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 50, PLENTY)).toBe('unaffordable');
  });

  it('is "sold" once purchased, regardless of current gold', () => {
    expect(slotDisplayState({ purchased: true, price: 100 }, 500, PLENTY)).toBe('sold');
  });

  it('prefers "sold" over "unaffordable" when both would otherwise apply', () => {
    expect(slotDisplayState({ purchased: true, price: 100 }, 0, PLENTY)).toBe('sold');
  });

  it('is "unaffordable" when gold is null and the slot is unpurchased', () => {
    expect(slotDisplayState({ purchased: false, price: 0 }, null, PLENTY)).toBe('unaffordable');
  });

  it('is "limit-reached" once the daily allowance is spent', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 5000, 0)).toBe('limit-reached');
  });

  it('prefers "limit-reached" over "unaffordable" — the limit is the real blocker', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 0, 0)).toBe('limit-reached');
  });

  it('still prefers "sold" over "limit-reached" for an already-bought slot', () => {
    expect(slotDisplayState({ purchased: true, price: 100 }, 5000, 0)).toBe('sold');
  });

  // Deferred-review fix: purchasesRemaining is `number | null` because the
  // server's daily-count read can itself fail independently of the vendor
  // stock read. null means "unknown", not "zero" and not "unlimited" — an
  // unknown allowance must never block the button; the server remains the
  // authority and rejects with 429 if the player really is capped.
  it('is "available" for a null allowance when unpurchased and affordable', () => {
    expect(slotDisplayState({ purchased: false, price: 100 }, 200, null)).toBe('available');
  });

  it('still prefers "sold" over a null allowance for an already-bought slot', () => {
    expect(slotDisplayState({ purchased: true, price: 100 }, 500, null)).toBe('sold');
  });
});

// Slots rotate on staggered 6-hour lives, so a shop left open outlives its
// stock. This is the pure predicate the buy-click handler consults before
// ever calling buyVendorSlot; the server's 409 is the real backstop.
describe('slotExpired', () => {
  it('is not expired a millisecond before the rotation deadline', () => {
    expect(slotExpired(1_000_000, 999_999)).toBe(false);
  });

  it('is expired exactly at the deadline', () => {
    expect(slotExpired(1_000_000, 1_000_000)).toBe(true);
  });

  it('is expired for a long-open tab', () => {
    expect(slotExpired(1_000_000, 9_999_999)).toBe(true);
  });
});

describe('formatCountdown', () => {
  it('shows hours and zero-padded minutes above an hour', () => {
    expect(formatCountdown((5 * 60 + 2) * 60_000)).toBe('5h 02m');
  });

  it('shows bare minutes below an hour', () => {
    expect(formatCountdown(42 * 60_000)).toBe('42m');
  });

  it('collapses the final minute rather than showing 0m', () => {
    expect(formatCountdown(30_000)).toBe('<1m');
  });

  it('reads as rotating at or past the deadline', () => {
    expect(formatCountdown(0)).toBe('rotating…');
    expect(formatCountdown(-5000)).toBe('rotating…');
  });
});

// The soonest slot is always 1-6h out per slotExpiryHour, so the honest case
// never approaches the floor; the floor exists solely to bound the refetch
// rate when the client clock runs ahead of the server's.
describe('rotationRefreshDelay', () => {
  it('is the time to the soonest expiry plus 1s of slack in the honest case', () => {
    const now = 1_000_000;
    expect(rotationRefreshDelay(now + 2 * 60 * 60_000, now)).toBe(2 * 60 * 60_000 + 1000);
  });

  it('floors at 60s rather than the bare +1s slack when expiry is imminent', () => {
    const now = 1_000_000;
    expect(rotationRefreshDelay(now + 500, now)).toBe(60_000);
  });

  it('floors at 60s instead of racing to a sub-second poll when the client clock runs ahead', () => {
    const now = 1_000_000;
    // Soonest expiry is an hour in the "past" from the client's skewed view.
    expect(rotationRefreshDelay(now - 60 * 60_000, now)).toBe(60_000);
  });
});
