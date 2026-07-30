import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { vendorStockFor, LOOTBOX_WIN_CHANCE } from '@arena/shared';

// routes.ts pulls in server/src/supabase.ts (the service-role singleton) at
// module scope, which throws if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
// aren't set — true in this test environment. Mock it out (and
// loadUserFromToken, so the middleware test controls auth outcomes directly
// instead of hitting a real Supabase project) before importing routes.ts.
vi.mock('../src/supabase.ts', () => ({ supabase: {} }));
vi.mock('../src/skills/loadSkills.ts', () => ({ loadUserFromToken: vi.fn() }));

import { requireUser } from '../src/economy/routes.ts';
import { loadUserFromToken } from '../src/skills/loadSkills.ts';
import {
  getVendorView, buyVendorSlot, openLootbox, maybeRollMatchDrop,
} from '../src/economy/service.ts';

// --- Minimal fluent + thenable Supabase query-builder stub -----------------
// Real supabase-js builders (`.from().select().eq()...`) are awaitable at
// any point in the chain, not just after a terminal call — mirror that so
// service.ts's exact call shape doesn't matter to the mock.
type ChainResult = { data: unknown; error: { message: string } | null };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'insert', 'update', 'delete', 'maybeSingle', 'single']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (r: ChainResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Builds a fake SupabaseClient whose `.from(table)` hands out the next
 * queued ChainResult for that table (in call order) — lets a test configure
 * exactly what each successive `.from('items')` / `.from('vendor_purchases')`
 * / etc. call in a service function resolves to. */
function mockServiceClient(results: Record<string, ChainResult[]>): { client: SupabaseClient; fromCalls: string[] } {
  const counts: Record<string, number> = {};
  const fromCalls: string[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const idx = counts[table] ?? 0;
    counts[table] = idx + 1;
    const list = results[table] ?? [];
    return makeChain(list[idx] ?? { data: null, error: null });
  });
  return { client: { from } as unknown as SupabaseClient, fromCalls };
}

function mockBuyerClient(rpcResult: ChainResult): { client: SupabaseClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

const ok = (data: unknown = null): ChainResult => ({ data, error: null });
const fail = (message: string): ChainResult => ({ data: null, error: { message } });

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

describe('getVendorView', () => {
  it('annotates purchased slots and cross-class weapon slots without altering vendorStockFor\'s stock', async () => {
    const userId = 'user-vendor-1';
    const maxLevel = 5;

    // Search for a day whose stock includes at least one ranger-restricted
    // weapon, so the crossClass=true branch is actually exercised (not just
    // vacuously true for every slot).
    let utcDay = '';
    let rawStock: ReturnType<typeof vendorStockFor> = [];
    for (let d = 1; d <= 60; d++) {
      const day = `2026-01-${String(d).padStart(2, '0')}`;
      const stock = vendorStockFor(userId, day, maxLevel);
      if (stock.some(s => s.base.classRestriction === 'ranger')) {
        utcDay = day;
        rawStock = stock;
        break;
      }
    }
    expect(utcDay, 'expected at least one seed with a ranger weapon slot in 60 tries').not.toBe('');

    const purchasedIndex = 1;
    const { client } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: maxLevel }])], // mage-only account
      vendor_purchases: [ok([{ slot_index: purchasedIndex }])],
    });

    const view = await getVendorView(client, userId, utcDay);

    expect(view.length).toBe(6);
    view.forEach((slot, i) => {
      expect(slot.base).toEqual(rawStock[i].base);
      expect(slot.rarity).toBe(rawStock[i].rarity);
      expect(slot.price).toBe(rawStock[i].price);
      expect(slot.slotIndex).toBe(i);
      expect(slot.purchased).toBe(i === purchasedIndex);
      const expectCrossClass = rawStock[i].base.classRestriction === 'ranger';
      expect(slot.crossClass).toBe(expectCrossClass);
    });
  });

  it('is stable for the same (userId, utcDay, maxLevel) inputs', async () => {
    const { client: c1 } = mockServiceClient({ characters: [ok([])], vendor_purchases: [ok([])] });
    const { client: c2 } = mockServiceClient({ characters: [ok([])], vendor_purchases: [ok([])] });
    const a = await getVendorView(c1, 'stable-user', '2026-07-28');
    const b = await getVendorView(c2, 'stable-user', '2026-07-28');
    expect(a).toEqual(b);
  });
});

describe('buyVendorSlot', () => {
  it('rejects an out-of-range slotIndex without touching gold or the DB', async () => {
    const { client: service, fromCalls } = mockServiceClient({});
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', 9);

    expect(result).toEqual({ ok: false, status: 400, error: 'invalid slotIndex' });
    expect(rpc).not.toHaveBeenCalled();
    expect(fromCalls).toEqual([]);
  });

  it('rejects an already-purchased slot before debiting gold', async () => {
    const { client: service } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([{ slot_index: 0 }])], // existing row found
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());

    const result = await buyVendorSlot(service, buyer, 'u1', 0);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already purchased/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('propagates spend_gold failure (insufficient gold) and never grants an item', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok(null)], // no existing purchase
    });
    const { client: buyer, rpc } = mockBuyerClient(fail('insufficient gold'));

    const result = await buyVendorSlot(service, buyer, 'u1', 0);

    expect(result).toEqual({ ok: false, status: 402, error: 'insufficient gold' });
    expect(rpc).toHaveBeenCalledOnce();
    expect(fromCalls).not.toContain('items');
  });

  it('debits gold BEFORE granting the item, on the happy path', async () => {
    const insertedItem = { id: 'item-1', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok(null), ok(null)], // check: none purchased; insert: reserve succeeds
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

    const result = await buyVendorSlot(service, buyer, 'u1', 0);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item).toEqual(insertedItem);
    expect(fromCalls).toContain('vendor_purchases');
    expect(callOrder).toEqual(['spend_gold', 'items-insert']);
  });

  it('refunds gold and releases the slot when the item insert fails after debit', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok(null), ok(null)], // check: none purchased; insert: reserve succeeds
      items: [fail('insert failed')],
      profiles: [ok({ gold: 100 }), ok(null)], // refund read, then update
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', 0);

    expect(rpc).toHaveBeenCalledOnce(); // debited exactly once, never refunded via a second debit
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/refunded/);
    }
    // vendor_purchases: check (1) + insert reserve (2) + delete compensation (3)
    expect(fromCalls.filter(t => t === 'vendor_purchases').length).toBe(3);
    // profiles: refund read (1) + refund update (2)
    expect(fromCalls.filter(t => t === 'profiles').length).toBe(2);
    expect(errorSpy).toHaveBeenCalled();
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
