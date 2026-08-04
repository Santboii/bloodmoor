import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { vendorStockFor, LOOTBOX_WIN_CHANCE, VENDOR_DAILY_PURCHASE_LIMIT, vendorInstanceKey } from '@arena/shared';

// routes.ts pulls in server/src/supabase.ts (the service-role singleton) at
// module scope, which throws if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
// aren't set — true in this test environment. Mock it out (and
// loadUserFromToken, so the middleware test controls auth outcomes directly
// instead of hitting a real Supabase project) before importing routes.ts.
const supabaseStub = vi.hoisted(() => ({ current: {} as any }));
vi.mock('../src/supabase.ts', () => ({ get supabase() { return supabaseStub.current; } }));
vi.mock('../src/skills/loadSkills.ts', () => ({ loadUserFromToken: vi.fn() }));

import { requireUser, asyncHandler, buyVendorHandler, openLootboxHandler } from '../src/economy/routes.ts';
import { loadUserFromToken } from '../src/skills/loadSkills.ts';
import {
  getVendorView, buyVendorSlot, openLootbox, maybeRollMatchDrop, vendorClockNow,
  nextDailySeq, DAILY_SEQ_UNIQUE_CONSTRAINT,
} from '../src/economy/service.ts';

// --- Minimal fluent + thenable Supabase query-builder stub -----------------
// Real supabase-js builders (`.from().select().eq()...`) are awaitable at
// any point in the chain, not just after a terminal call — mirror that so
// service.ts's exact call shape doesn't matter to the mock.
type ChainResult = { data: unknown; error: { message: string; code?: string } | null };

/** One method call recorded against a single `.from(table)` chain, e.g.
 * `{ method: 'eq', args: ['user_id', 'u1'] }` — lets a test pin the exact
 * filters/payload a query used, not just which table it hit. */
type ChainCall = { method: string; args: unknown[] };

function makeChain(result: ChainResult, log: ChainCall[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'insert', 'update', 'delete', 'maybeSingle', 'single']) {
    chain[m] = vi.fn((...args: unknown[]) => {
      log.push({ method: m, args });
      return chain;
    });
  }
  chain.then = (resolve: (r: ChainResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Builds a fake SupabaseClient whose `.from(table)` hands out the next
 * queued ChainResult for that table (in call order) — lets a test configure
 * exactly what each successive `.from('items')` / `.from('vendor_purchases')`
 * / etc. call in a service function resolves to. `callLog` parallels
 * `fromCalls` one-to-one and records every chained method call (with args)
 * made against that particular `.from()` invocation — e.g. to assert an
 * insert's payload or a delete's exact `.eq()` filters. */
function mockServiceClient(
  results: Record<string, ChainResult[]>,
): { client: SupabaseClient; fromCalls: string[]; callLog: { table: string; calls: ChainCall[] }[] } {
  const counts: Record<string, number> = {};
  const fromCalls: string[] = [];
  const callLog: { table: string; calls: ChainCall[] }[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const idx = counts[table] ?? 0;
    counts[table] = idx + 1;
    const list = results[table] ?? [];
    const calls: ChainCall[] = [];
    callLog.push({ table, calls });
    return makeChain(list[idx] ?? { data: null, error: null }, calls);
  });
  return { client: { from } as unknown as SupabaseClient, fromCalls, callLog };
}

function mockBuyerClient(rpcResult: ChainResult): { client: SupabaseClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

const ok = (data: unknown = null): ChainResult => ({ data, error: null });
const fail = (message: string, code?: string): ChainResult => ({ data: null, error: { message, code } });

/** Today's vendor_purchases rows as buyVendorSlot's allowance/daily_seq read
 * returns them — one row per already-claimed seq. */
const seqRows = (...seqs: number[]): ChainResult => ok(seqs.map(daily_seq => ({ daily_seq })));

/** What Postgres hands back when a concurrent buy for the same account
 * claimed this daily_seq first. */
const seqRaceLost = (): ChainResult => fail(
  `duplicate key value violates unique constraint "${DAILY_SEQ_UNIQUE_CONSTRAINT}"`,
  '23505',
);

/** The reserve insert's payload from a `.from('vendor_purchases')` entry. */
const insertedRow = (entry: { calls: ChainCall[] }): unknown =>
  entry.calls.find(c => c.method === 'insert')?.args[0];

// A fixed vendor clock. 2026-08-02T12:00Z is an arbitrary but stable
// instant; tests derive expected instance keys from it via vendorStockFor
// rather than hardcoding generation numbers.
const CLOCK = vendorClockNow(Date.UTC(2026, 7, 2, 12, 0, 0));
const keyFor = (userId: string, level: number, slotIndex: number) =>
  vendorStockFor(userId, CLOCK.hour, level)[slotIndex].instanceKey;

beforeEach(() => vi.clearAllMocks());

describe('requireUser middleware', () => {
  function mockRes() {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    return { res: { status } as any, status, json };
  }

  it('401s when no Authorization header is present', async () => {
    const req = { headers: {} } as any;
    const { res, status } = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(loadUserFromToken).not.toHaveBeenCalled();
  });

  it('401s when loadUserFromToken rejects the token', async () => {
    vi.mocked(loadUserFromToken).mockResolvedValue({ ok: false, error: 'invalid' });
    const req = { headers: { authorization: 'Bearer bad-token' } } as any;
    const { res, status } = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches userId/accessToken and calls next on a valid token', async () => {
    vi.mocked(loadUserFromToken).mockResolvedValue({ ok: true, userId: 'user-42' });
    const req = { headers: { authorization: 'Bearer good-token' } } as any;
    const { res, status } = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('user-42');
    expect(req.accessToken).toBe('good-token');
  });
});

describe('vendorClockNow', () => {
  it('derives the UTC hour index and day from one instant', () => {
    const clock = vendorClockNow(Date.UTC(2026, 7, 2, 23, 59, 59, 999));
    expect(clock.utcDay).toBe('2026-08-02');
    expect(clock.hour).toBe(Math.floor(Date.UTC(2026, 7, 2, 23, 0, 0) / 3_600_000));
  });
});

describe('getVendorView', () => {
  it('annotates cross-class slots without altering vendorStockFor\'s own stock', async () => {
    const userId = 'user-vendor-1';
    const maxLevel = 5;

    // Search forward an hour at a time for a shelf that includes at least one
    // ranger-restricted base, so the crossClass=true branch is genuinely
    // exercised against a mage-only account rather than being vacuously
    // false for all six slots.
    let clock: typeof CLOCK | null = null;
    let rawStock: ReturnType<typeof vendorStockFor> = [];
    for (let h = 0; h < 60; h++) {
      const candidate = vendorClockNow(Date.UTC(2026, 0, 1, 0, 0, 0) + h * 3_600_000);
      const stock = vendorStockFor(userId, candidate.hour, maxLevel);
      if (stock.some(s => s.base.classRestriction === 'ranger')) {
        clock = candidate;
        rawStock = stock;
        break;
      }
    }
    expect(clock, 'expected at least one hour with a ranger-restricted slot in 60 tries').not.toBeNull();

    const purchasedIndex = 1;
    const { client } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: maxLevel }])], // mage-only account
      vendor_purchases: [
        ok([{ instance_key: rawStock[purchasedIndex].instanceKey }]), // current shelf
        ok([]), // today's allowance
      ],
    });

    const view = await getVendorView(client, userId, clock!);

    expect(view.slots.length).toBe(6);
    // Some slot must actually carry the flag, or the assertions below pass
    // without the crossClass branch ever having been taken.
    expect(view.slots.some(s => s.crossClass)).toBe(true);
    view.slots.forEach((slot, i) => {
      // The view annotates; it must never substitute or re-price stock.
      expect(slot.base).toEqual(rawStock[i].base);
      expect(slot.rarity).toBe(rawStock[i].rarity);
      expect(slot.price).toBe(rawStock[i].price);
      expect(slot.instanceKey).toBe(rawStock[i].instanceKey);
      expect(slot.slotIndex).toBe(i);
      expect(slot.purchased).toBe(i === purchasedIndex);
      const expectCrossClass = rawStock[i].base.classRestriction != null && rawStock[i].base.classRestriction !== 'mage';
      expect(slot.crossClass).toBe(expectCrossClass);
    });
  });

  it('leaves a class-restricted slot un-annotated when the account owns that class', async () => {
    const userId = 'user-vendor-1';
    const maxLevel = 5;
    let clock: typeof CLOCK | null = null;
    for (let h = 0; h < 60; h++) {
      const candidate = vendorClockNow(Date.UTC(2026, 0, 1, 0, 0, 0) + h * 3_600_000);
      if (vendorStockFor(userId, candidate.hour, maxLevel).some(s => s.base.classRestriction === 'ranger')) {
        clock = candidate;
        break;
      }
    }
    expect(clock).not.toBeNull();

    const { client } = mockServiceClient({
      characters: [ok([{ class: 'ranger', level: maxLevel }])], // the account HAS a ranger
      vendor_purchases: [ok([]), ok([])],
    });

    const view = await getVendorView(client, userId, clock!);

    // Same shelf, same slots — only the account's roster differs, so the
    // ranger-restricted ones must now come back un-flagged. (Other slots may
    // be restricted to classes this account still lacks; those stay flagged.)
    const rangerSlots = view.slots.filter(s => s.base.classRestriction === 'ranger');
    expect(rangerSlots.length).toBeGreaterThan(0);
    expect(rangerSlots.every(s => !s.crossClass)).toBe(true);
  });

  it('marks a slot sold by instance key, not by slot index', async () => {
    const soldKey = keyFor('u1', 5, 2);
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        ok([{ instance_key: soldKey }]),  // current-shelf purchases
        ok([{ instance_key: soldKey }]),  // today's purchases (allowance)
      ],
    });

    const view = await getVendorView(service, 'u1', CLOCK);

    expect(view.slots.filter(s => s.purchased).map(s => s.slotIndex)).toEqual([2]);
  });

  it('reports the remaining daily allowance', async () => {
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        ok([]),
        ok([{ instance_key: 'a' }, { instance_key: 'b' }]),
      ],
    });

    const view = await getVendorView(service, 'u1', CLOCK);

    expect(view.purchasesRemaining).toBe(VENDOR_DAILY_PURCHASE_LIMIT - 2);
  });

  it('never reports a negative allowance', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ instance_key: `k${i}` }));
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), ok(rows)],
    });

    const view = await getVendorView(service, 'u1', CLOCK);

    expect(view.purchasesRemaining).toBe(0);
  });

  // Contract: purchasesRemaining is `number | null`, not a number that
  // silently defaults to "full allowance" when the read fails. Reporting 6
  // (the un-degraded default) on an infrastructure fault would tell a player
  // they have every buy available when the true count is simply unknown.
  it('reports a null allowance (not a false-good number) when the daily-allowance read fails', async () => {
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), fail('read failed')],
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = await getVendorView(service, 'u1', CLOCK);

    expect(view.purchasesRemaining).toBeNull();
    errorSpy.mockRestore();
  });
});

describe('buyVendorSlot', () => {
  it('rejects an out-of-range slotIndex without touching gold or the DB', async () => {
    const { client: service, fromCalls } = mockServiceClient({});
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 9, 'whatever');

    expect(result).toEqual({ ok: false, status: 400, error: 'invalid slotIndex' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).toEqual([]);
  });

  it('rejects a missing instanceKey without touching gold or the DB', async () => {
    const { client: service, fromCalls } = mockServiceClient({});
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, undefined);

    expect(result).toEqual({ ok: false, status: 400, error: 'invalid instanceKey' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).toEqual([]);
  });

  it('rejects a stale instanceKey with 409 before debiting gold', async () => {
    // The key the client saw six hours ago at this slot.
    const staleKey = vendorInstanceKey(0, 0, 4);
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, staleKey);

    expect(result).toEqual({ ok: false, status: 409, error: 'stock changed' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).not.toContain('vendor_purchases');
    expect(fromCalls).not.toContain('items');
  });

  it('rejects once the daily allowance is spent, before debiting gold', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [seqRows(0, 1, 2, 3, 4, 5)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: false, status: 429, error: 'daily purchase limit reached' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).not.toContain('items');
  });

  // Pins the permissive side of the cap boundary: with exactly
  // LIMIT - 1 rows already purchased today, the 6th buy must still succeed.
  // An off-by-one toward blocking (e.g. `>= LIMIT - 1`) would pass every
  // other test in this file (all of which use either 0 or LIMIT rows) while
  // cutting every account to 5 buys a day.
  it('allows the 6th purchase of the day when exactly LIMIT - 1 rows already exist', async () => {
    const insertedItem = { id: 'item-6', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const { client: service, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [seqRows(0, 1, 2, 3, 4), ok(null), ok(null)], // allowance (5 rows), existing check, reserve insert
      items: [ok(insertedItem)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();
    // The last free seq, not a 6th one that the DB check constraint would
    // have rejected outright.
    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    expect(insertedRow(vpCalls[2])).toMatchObject({ daily_seq: 5 });
  });

  // The wedge scenario: a purchase whose item insert failed released its row
  // and left a HOLE in today's sequence. Deriving the seq from the row COUNT
  // would re-pick an already-taken value forever, 429-ing an account that is
  // demonstrably below its cap; deriving it from max+1 would overshoot the
  // 0-5 check constraint. The hole must simply be reused.
  it('reuses a hole in the daily sequence instead of wedging the account below its cap', async () => {
    const insertedItem = { id: 'item-7', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const { client: service, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      // seq 3 was released; 5 rows exist, so a count-derived seq would be 5 —
      // already taken — and every later buy would collide identically.
      vendor_purchases: [seqRows(0, 1, 2, 4, 5), ok(null), ok(null)],
      items: [ok(insertedItem)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();
    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    expect(insertedRow(vpCalls[2])).toMatchObject({ daily_seq: 3 });
  });

  it('rejects an already-purchased offer before debiting gold', async () => {
    const key = keyFor('u1', 5, 0);
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), ok({ instance_key: key })], // allowance, then existing row
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, key);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already purchased/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('propagates spend_gold failure (insufficient gold), releases the reservation, and never grants an item', async () => {
    const { client: service, fromCalls, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [seqRows(), ok(null), ok(null), ok(null)], // allowance, existing check, reserve, release
    });
    const { client: buyer, rpc } = mockBuyerClient(fail('insufficient gold'));

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: false, status: 402, error: 'insufficient gold' });
    expect(rpc).toHaveBeenCalledOnce();
    expect(fromCalls).not.toContain('items');
    // The reservation is taken BEFORE the debit now, so a failed debit must
    // hand the offer (and its daily_seq) straight back — otherwise a player
    // clicking Buy while short on gold would silently burn one of their six
    // daily purchases and see the slot as SOLD.
    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    expect(vpCalls.length).toBe(4);
    expect(vpCalls[3].calls.some(c => c.method === 'delete')).toBe(true);
    // Nothing was debited, so nothing may be refunded.
    expect(fromCalls).not.toContain('profiles');
  });

  it('reserves the exact offer row BEFORE debiting gold, and debits before granting the item', async () => {
    const insertedItem = { id: 'item-1', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const key = keyFor('u1', 5, 0);
    const { client: service, fromCalls, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [seqRows(), ok(null), ok(null)], // allowance, existing check, reserve insert
      items: [ok(insertedItem)],
    });
    const callOrder: string[] = [];
    const rpc = vi.fn(() => { callOrder.push('spend_gold'); return Promise.resolve(ok()); });
    const buyer = { rpc } as unknown as SupabaseClient;
    const originalFrom = (service as any).from;
    let vpSeen = 0;
    (service as any).from = vi.fn((table: string) => {
      if (table === 'vendor_purchases' && ++vpSeen === 3) callOrder.push('reserve-insert');
      if (table === 'items') callOrder.push('items-insert');
      return originalFrom(table);
    });

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, key);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item).toEqual(insertedItem);
    expect(fromCalls).toContain('vendor_purchases');
    // Reserve-then-debit is what keeps a lost daily_seq race free of any
    // gold movement — see buyVendorSlot's docstring.
    expect(callOrder).toEqual(['reserve-insert', 'spend_gold', 'items-insert']);

    // Pins the reserve insert's exact written row — without this, a
    // regression that dropped instance_key, wrote a fresh Date() instead of
    // clock.utcDay, or omitted daily_seq would still pass every other
    // assertion in this test, since the mock's insert() otherwise discards
    // its argument.
    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    expect(insertedRow(vpCalls[2])).toEqual({ // allowance (0), existing check (1), reserve (2)
      user_id: 'u1',
      utc_day: CLOCK.utcDay,
      slot_index: 0,
      instance_key: key,
      daily_seq: 0, // no rows read on the allowance check above
    });
  });

  it('refunds gold and releases the slot when the item insert fails after debit', async () => {
    const key = keyFor('u1', 5, 0);
    const { client: service, fromCalls, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [seqRows(), ok(null), ok(null), ok(null)], // allowance, check, reserve, release
      items: [fail('insert failed')],
      profiles: [ok({ gold: 100 }), ok(null)], // refund read, then update
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, key);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
    expect(rpc).toHaveBeenCalledOnce();
    expect(fromCalls).toContain('profiles');

    // Exact vendor_purchases call count: allowance + existing-check +
    // reserve + release. Without this, deleting the release call entirely
    // (leaving the slot marked sold forever after a refunded failure) would
    // still pass every other assertion here.
    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    expect(vpCalls.length).toBe(4);
    const releaseCall = vpCalls[3];
    expect(releaseCall.calls.some(c => c.method === 'delete')).toBe(true);
    const releaseFilters = releaseCall.calls.filter(c => c.method === 'eq').map(c => c.args[0]);
    expect(releaseFilters).toEqual(['user_id', 'instance_key']);

    errorSpy.mockRestore();
  });

  // The whole point of finding 1: two buys fired concurrently by one account
  // (the client's double-submit guard is keyed per SLOT, so clicking slot 0
  // then slot 1 within one round trip really does race) can pick the same
  // free daily_seq. The loser is NOT over the cap — it lost a race on
  // sequence assignment — so it must retry onto the next free seq and
  // SUCCEED, not 429 an account that still has five buys left.
  it('retries onto the next free daily_seq and succeeds when a concurrent buy wins the race', async () => {
    const insertedItem = { id: 'item-8', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const { client: service, fromCalls, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        seqRows(), // allowance read: no purchases yet today
        ok(null), // existing check: not already purchased
        seqRaceLost(), // reserve seq 0 — a concurrent buy for this account got there first
        seqRows(0), // re-read: the winner's row is now visible
        ok(null), // reserve seq 1 — lands
      ],
      items: [ok(insertedItem)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: true, item: insertedItem });
    expect(rpc).toHaveBeenCalledOnce(); // debited exactly once, after the seq was secured
    // The lost race happened before any gold moved, so nothing was refunded —
    // which is what keeps refundGold's non-atomic read-modify-write off the
    // ordinary concurrent-buy path entirely.
    expect(fromCalls).not.toContain('profiles');

    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    expect(insertedRow(vpCalls[2])).toMatchObject({ daily_seq: 0 });
    expect(insertedRow(vpCalls[4])).toMatchObject({ daily_seq: 1 });
    errorSpy.mockRestore();
  });

  it('429s without moving any gold when the retry re-read shows every daily_seq taken', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        seqRows(0, 1, 2, 3, 4), // allowance read: one buy left
        ok(null), // existing check
        seqRaceLost(), // reserve seq 5 — a concurrent buy took the last one
        seqRows(0, 1, 2, 3, 4, 5), // re-read: genuinely capped now
      ],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: false, status: 429, error: 'daily purchase limit reached' });
    // A genuine over-cap buy still 429s — but because the seq is claimed
    // before the debit, there is no debit to compensate and no refund at all.
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).not.toContain('profiles');
    expect(fromCalls).not.toContain('items');
    errorSpy.mockRestore();
  });

  it('gives up with a 429 and no gold movement once the reservation retry budget is exhausted', async () => {
    // Pathological interleave: every attempt loses and the re-read never
    // reveals a full sequence (rows being released concurrently). The loop
    // must terminate rather than spin, and must not have debited anything.
    const vendorPurchases = [seqRows(), ok(null)];
    for (let i = 0; i < VENDOR_DAILY_PURCHASE_LIMIT; i++) {
      vendorPurchases.push(seqRaceLost(), seqRows());
    }
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: vendorPurchases,
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: false, status: 429, error: 'daily purchase limit reached' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).not.toContain('profiles');
    // Bounded: allowance + existing check + at most LIMIT (insert, re-read)
    // pairs. Without the budget this test would hang.
    expect(fromCalls.filter(t => t === 'vendor_purchases').length)
      .toBe(2 + 2 * VENDOR_DAILY_PURCHASE_LIMIT);
    errorSpy.mockRestore();
  });

  it('falls through to a generic 500 for a reserve-insert unique-violation on a different constraint', async () => {
    // Same offer double-bought concurrently — a violation of the (user_id,
    // instance_key) primary key, not the daily_seq cap constraint. This is
    // a different race, is not retryable, and must not be reported as
    // "daily limit reached".
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        seqRows(),
        ok(null),
        fail('duplicate key value violates unique constraint "vendor_purchases_pkey"', '23505'),
      ],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).not.toMatch(/daily purchase limit/);
      expect(result.error).not.toMatch(/refunded/); // nothing was debited
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).not.toContain('profiles');
    errorSpy.mockRestore();
  });

  // The discrimination is a substring match on PostgREST's message, so it
  // must key on the QUOTED constraint name. A constraint whose name merely
  // contains the daily_seq one would otherwise be mistaken for the race and
  // silently retried.
  it('does not mistake a different constraint whose name contains the daily_seq one for the seq race', async () => {
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        seqRows(),
        ok(null),
        fail(
          `duplicate key value violates unique constraint "${DAILY_SEQ_UNIQUE_CONSTRAINT}_extra"`,
          '23505',
        ),
      ],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('nextDailySeq', () => {
  it('starts at 0 for an account with no purchases today', () => {
    expect(nextDailySeq([])).toBe(0);
    expect(nextDailySeq(null)).toBe(0);
  });

  it('takes the next value up when the sequence is contiguous', () => {
    expect(nextDailySeq([{ daily_seq: 0 }, { daily_seq: 1 }])).toBe(2);
  });

  it('reuses a hole rather than extending past it', () => {
    expect(nextDailySeq([{ daily_seq: 0 }, { daily_seq: 1 }, { daily_seq: 3 }])).toBe(2);
  });

  it('is insensitive to row order', () => {
    expect(nextDailySeq([{ daily_seq: 4 }, { daily_seq: 0 }, { daily_seq: 2 }])).toBe(1);
  });

  it('returns null — the cap — once every seq in 0..LIMIT-1 is taken', () => {
    const full = Array.from({ length: VENDOR_DAILY_PURCHASE_LIMIT }, (_, i) => ({ daily_seq: i }));
    expect(nextDailySeq(full)).toBeNull();
  });

  it('never returns a value the migration\'s 0-5 check constraint would reject', () => {
    for (let taken = 0; taken < VENDOR_DAILY_PURCHASE_LIMIT; taken++) {
      const rows = Array.from({ length: taken }, (_, i) => ({ daily_seq: i }));
      const seq = nextDailySeq(rows)!;
      expect(seq).toBeGreaterThanOrEqual(0);
      expect(seq).toBeLessThan(VENDOR_DAILY_PURCHASE_LIMIT);
    }
  });
});

describe('DAILY_SEQ_UNIQUE_CONSTRAINT / migration shape-guard contract', () => {
  // Same drift-guard pattern as economy.test.ts's sell_price contract: the
  // 429-vs-500 discrimination in buyVendorSlot is a string match against a
  // constraint NAME that only exists in SQL, so renaming it in the migration
  // without updating the constant would silently turn every lost daily_seq
  // race into a 500 with no test noticing.
  it('names a unique constraint the vendor-rotation migration actually creates', () => {
    const migrationUrl = new URL(
      '../../supabase/migrations/20260803000000_vendor_rotation.sql',
      import.meta.url,
    );
    const sql = readFileSync(migrationUrl, 'utf8');

    expect(sql).toContain(`add constraint ${DAILY_SEQ_UNIQUE_CONSTRAINT}`);
    // ...and that it is the (user_id, utc_day, daily_seq) uniqueness the cap
    // rests on, not some other constraint that happens to carry the name.
    expect(sql).toMatch(
      new RegExp(`add constraint ${DAILY_SEQ_UNIQUE_CONSTRAINT}\\s+unique \\(user_id, utc_day, daily_seq\\)`),
    );
  });

  it('keeps the 0-5 check constraint that makes a 7th same-day row impossible', () => {
    const sql = readFileSync(
      new URL('../../supabase/migrations/20260803000000_vendor_rotation.sql', import.meta.url),
      'utf8',
    );
    expect(sql).toMatch(/check \(daily_seq between 0 and (\d+)\)/);
    const upper = Number(sql.match(/check \(daily_seq between 0 and (\d+)\)/)![1]);
    expect(upper).toBe(VENDOR_DAILY_PURCHASE_LIMIT - 1);
  });
});

describe('openLootbox', () => {
  it('rejects an invalid tier without touching gold', async () => {
    const { client: service, fromCalls } = mockServiceClient({});
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await openLootbox(service, buyer, 'u1', 'ultra-rare');

    expect(result).toEqual({ ok: false, status: 400, error: 'invalid tier' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).toEqual([]);
  });

  it('propagates spend_gold failure and never rolls or grants an item', async () => {
    const { client: service, fromCalls } = mockServiceClient({});
    const { client: buyer, rpc } = mockBuyerClient(fail('insufficient gold'));

    const result = await openLootbox(service, buyer, 'u1', 'basic');

    expect(result).toEqual({ ok: false, status: 402, error: 'insufficient gold' });
    expect(rpc).toHaveBeenCalledWith('spend_gold', { p_amount: 150 });
    expect(fromCalls).toEqual([]);
  });

  it('grants an item on the happy path, after debiting gold', async () => {
    const insertedItem = { id: 'item-2', base_id: 'bone_ring', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'ring' };
    const { client: service } = mockServiceClient({
      drop_tables: [ok({ weights: { basic: 100, magic: 0, rare: 0, unique: 0 } })],
      characters: [ok([{ class: 'mage', level: 3 }])],
      items: [ok(insertedItem)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await openLootbox(service, buyer, 'u1', 'basic');

    expect(rpc).toHaveBeenCalledWith('spend_gold', { p_amount: 150 });
    expect(result).toEqual({ ok: true, item: insertedItem });
  });

  it('refunds gold when the drop_tables weights are unavailable after debit', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      drop_tables: [ok(null)], // no row for this context
      profiles: [ok({ gold: 50 }), ok(null)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await openLootbox(service, buyer, 'u1', 'premium');

    expect(rpc).toHaveBeenCalledOnce();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
    expect(fromCalls.filter(t => t === 'profiles').length).toBe(2);
    errorSpy.mockRestore();
  });
});

describe('maybeRollMatchDrop', () => {
  it('rolls nothing (and touches no tables) when the win-chance gate misses', async () => {
    const { client: service, fromCalls } = mockServiceClient({});
    const rng = () => LOOTBOX_WIN_CHANCE; // >= chance => miss

    const result = await maybeRollMatchDrop(service, 'u1', rng);

    expect(result).toBeNull();
    expect(fromCalls).toEqual([]);
  });

  it('returns null and logs when match_drop weights are missing, even on a chance hit', async () => {
    const { client: service } = mockServiceClient({ drop_tables: [ok(null)] });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await maybeRollMatchDrop(service, 'u1', () => 0);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('grants and validates the dropped item on a chance hit', async () => {
    const insertedItem = { id: 'item-3', base_id: 'cloth_pants', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'leggings' };
    const { client: service } = mockServiceClient({
      drop_tables: [ok({ weights: { basic: 100, magic: 0, rare: 0, unique: 0 } })],
      characters: [ok([{ class: 'mage', level: 2 }])],
      items: [ok(insertedItem)],
    });

    const result = await maybeRollMatchDrop(service, 'u1', () => 0);

    expect(result).toEqual(insertedItem);
  });

  it('returns null when the inserted row fails validateItemRow (e.g. unknown base)', async () => {
    const badItem = { id: 'item-4', base_id: 'not-a-real-base', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'leggings' };
    const { client: service } = mockServiceClient({
      drop_tables: [ok({ weights: { basic: 100, magic: 0, rare: 0, unique: 0 } })],
      characters: [ok([{ class: 'mage', level: 2 }])],
      items: [ok(badItem)],
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await maybeRollMatchDrop(service, 'u1', () => 0);

    expect(result).toBeNull();
    errorSpy.mockRestore();
  });
});

describe('asyncHandler: misconfigured env fails fast instead of hanging', () => {
  // buyVendorHandler/openLootboxHandler call buyerClient(accessToken) inline,
  // which throws synchronously (inside an async function body, so it becomes
  // a rejected promise) when SUPABASE_URL/SUPABASE_ANON_KEY aren't set.
  // Express 4 doesn't catch that on its own — asyncHandler must, or the
  // request just hangs. Explicitly unset both here so the test doesn't
  // depend on the ambient environment already lacking them.
  const savedUrl = process.env.SUPABASE_URL;
  const savedAnonKey = process.env.SUPABASE_ANON_KEY;

  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
    if (savedAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = savedAnonKey;
  });

  function mockRes() {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    return { res: { status, headersSent: false } as any, status, json };
  }

  it('POST /vendor/buy resolves with a 500 (not a hang) when buyerClient() throws', async () => {
    const req = { userId: 'u1', accessToken: 'tok', body: { slotIndex: 0 } } as any;
    const { res, status, json } = mockRes();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // No fake timers / race needed: if asyncHandler didn't catch this, the
    // returned promise itself would reject and this await would throw,
    // failing the test explicitly rather than hanging it.
    await asyncHandler(buyVendorHandler)(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'internal error' });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('POST /lootbox/open resolves with a 500 (not a hang) when buyerClient() throws', async () => {
    const req = { userId: 'u1', accessToken: 'tok', body: { tier: 'basic' } } as any;
    const { res, status, json } = mockRes();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await asyncHandler(openLootboxHandler)(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'internal error' });
    errorSpy.mockRestore();
  });

  it('does not double-respond if headers were already sent before the throw', async () => {
    const req = { userId: 'u1', accessToken: 'tok', body: { slotIndex: 0 } } as any;
    const { res, status, json } = mockRes();
    res.headersSent = true;

    await asyncHandler(buyVendorHandler)(req, res);

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });
});

describe('buyVendorHandler wiring', () => {
  // buyerClient() constructs a real supabase-js client from these and
  // throws if they're missing; the values never get used, because the
  // instanceKey check rejects before any RPC.
  const savedUrl = process.env.SUPABASE_URL;
  const savedAnonKey = process.env.SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
  });

  afterEach(() => {
    supabaseStub.current = {};
    if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
    if (savedAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = savedAnonKey;
  });

  it('forwards slotIndex and instanceKey from the request body', async () => {
    supabaseStub.current = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
    }).client;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const req = {
      userId: 'u1',
      accessToken: 'tok',
      body: { slotIndex: 0, instanceKey: 'definitely-not-the-current-offer' },
    } as any;

    await buyVendorHandler(req, { status, json } as any);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ error: 'stock changed' });
  });
});
