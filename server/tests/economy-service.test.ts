import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    const rows = Array.from(
      { length: VENDOR_DAILY_PURCHASE_LIMIT },
      (_, i) => ({ instance_key: `k${i}` }),
    );
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok(rows)],
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
    const rows = Array.from(
      { length: VENDOR_DAILY_PURCHASE_LIMIT - 1 },
      (_, i) => ({ instance_key: `k${i}` }),
    );
    const insertedItem = { id: 'item-6', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok(rows), ok(null), ok(null)], // allowance (5 rows), existing check, reserve insert
      items: [ok(insertedItem)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();
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

  it('propagates spend_gold failure (insufficient gold) and never grants an item', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), ok(null)],
    });
    const { client: buyer, rpc } = mockBuyerClient(fail('insufficient gold'));

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: false, status: 402, error: 'insufficient gold' });
    expect(rpc).toHaveBeenCalledOnce();
    expect(fromCalls).not.toContain('items');
  });

  it('debits gold BEFORE granting the item, on the happy path, and reserves the exact offer row', async () => {
    const insertedItem = { id: 'item-1', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const key = keyFor('u1', 5, 0);
    const { client: service, fromCalls, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), ok(null), ok(null)], // allowance, existing check, reserve insert
      items: [ok(insertedItem)],
    });
    const callOrder: string[] = [];
    const rpc = vi.fn(() => { callOrder.push('spend_gold'); return Promise.resolve(ok()); });
    const buyer = { rpc } as unknown as SupabaseClient;
    const originalFrom = (service as any).from;
    (service as any).from = vi.fn((table: string) => {
      if (table === 'items') callOrder.push('items-insert');
      return originalFrom(table);
    });

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, key);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item).toEqual(insertedItem);
    expect(fromCalls).toContain('vendor_purchases');
    expect(callOrder).toEqual(['spend_gold', 'items-insert']);

    // Pins the reserve insert's exact written row — without this, a
    // regression that dropped instance_key, wrote utcDayString() instead of
    // clock.utcDay, or omitted daily_seq would still pass every other
    // assertion in this test, since the mock's insert() otherwise discards
    // its argument.
    const vpCalls = callLog.filter(e => e.table === 'vendor_purchases');
    const reserveCall = vpCalls[2]; // allowance (0), existing check (1), reserve (2)
    const insertArgs = reserveCall.calls.find(c => c.method === 'insert')?.args[0];
    expect(insertArgs).toEqual({
      user_id: 'u1',
      utc_day: CLOCK.utcDay,
      slot_index: 0,
      instance_key: key,
      daily_seq: 0, // 0 rows read on the allowance check above
    });
  });

  it('refunds gold and releases the slot when the item insert fails after debit', async () => {
    const key = keyFor('u1', 5, 0);
    const { client: service, fromCalls, callLog } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), ok(null), ok(null), ok(null)], // allowance, check, reserve, release
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

  it('treats a concurrent daily_seq unique-violation on the reserve insert as the cap doing its job, not a 500', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        ok([]), // allowance read: this request's own view still shows room
        ok(null), // existing check: not already purchased
        fail(
          'duplicate key value violates unique constraint "vendor_purchases_user_day_seq_key"',
          '23505',
        ), // reserve insert: a concurrent buyer won this daily_seq first
      ],
      profiles: [ok({ gold: 100 }), ok(null)], // refund read, then update
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result).toEqual({ ok: false, status: 429, error: 'daily purchase limit reached' });
    expect(rpc).toHaveBeenCalledOnce(); // debited once, refunded via profiles below, never re-debited
    expect(fromCalls).toContain('profiles');
    errorSpy.mockRestore();
  });

  it('falls through to a generic 500 for a reserve-insert unique-violation on a different constraint', async () => {
    // Same offer double-bought concurrently — a violation of the (user_id,
    // instance_key) primary key, not the daily_seq cap constraint. This is
    // a different race and must not be reported as "daily limit reached".
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [
        ok([]),
        ok(null),
        fail('duplicate key value violates unique constraint "vendor_purchases_pkey"', '23505'),
      ],
      profiles: [ok({ gold: 100 }), ok(null)],
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).not.toMatch(/daily purchase limit/);
    }
    expect(rpc).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
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
