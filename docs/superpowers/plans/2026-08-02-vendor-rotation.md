# Vendor Stock Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotate the shop vendor's 6 slots on staggered 6-hour lifetimes — one turning over each UTC hour — without increasing how many items an account can buy per day, and make buys immune to item substitution across a reseed.

**Architecture:** Vendor stock stays stateless and derived; only the seed changes. Each slot gets its own mulberry32 stream seeded from `"<userId>:<slotIndex>:<generation>:<band>"`, where `generation = floor((utcHour - slotIndex) / 6)`. That string suffix is also the slot's `instanceKey`, which becomes the primary key of `vendor_purchases` and a required field on the buy request — the server rejects a buy whose `instanceKey` no longer matches the derived slot before any gold moves. A separate daily row count enforces the unchanged 6-purchases-per-UTC-day cap.

**Tech Stack:** TypeScript monorepo (npm workspaces: `shared`, `server`, `client`), vitest, Express, Supabase (Postgres + RLS), vanilla-TS DOM UI.

**Spec:** `docs/superpowers/specs/2026-08-02-vendor-rotation-design.md`

## Global Constraints

- **Branch off `main`, not `menu-moor`.** `menu-moor` is behind `main` by ~10 commits. Every file this plan touches is byte-identical on both, but `main` carries a migration (`20260802010000_spell_slots.sql`) that `menu-moor` lacks, and the new migration must sort after it.
- **`shared/src/economy.ts` must stay pure.** No `Date.now()` or `new Date()` anywhere in that module — callers pass the UTC hour index in. This is an existing, deliberate property of the file; the plan preserves it.
- **Migrations are hand-applied, not CLI-linked.** Do NOT apply the migration until the implementation review has passed (Task 8). Applying before review has previously put a live economy hole in prod.
- **`VENDOR_SLOT_COUNT = 6`, `VENDOR_SLOT_LIFETIME_HOURS = 6`, `VENDOR_DAILY_PURCHASE_LIMIT = 6`** — exact values, defined once in `shared/src/economy.ts` and imported everywhere else. No literal `6` in server or client code for these.
- **Purchase volume must not change.** At most 6 vendor items per account per UTC day, exactly as today.
- **Do not stage `client/dist/`.** `vite build` dirties this tracked directory; restore it after any build (`git checkout -- client/dist`).
- Tests: `npm test --workspace=server` and `npm test --workspace=client`. Both suites must stay green at every commit.

## File Structure

**Modified**
- `shared/src/economy.ts` — rotation clock primitives, `VendorSlot` shape, reseeded `vendorStockFor`. The only place rotation timing is defined.
- `server/src/economy/service.ts` — `VendorClock`, `getVendorView`, `buyVendorSlot`.
- `server/src/economy/routes.ts` — clock construction + `instanceKey` passthrough.
- `client/src/supabase.ts` — `VendorView` type, `buyVendorSlot` signature; deletes the now-invalid `fetchVendorPurchases`.
- `client/src/items/ShopScreen.ts` — countdowns, daily-allowance display, `limit-reached` state, rotation refresh timer.
- `server/tests/economy.test.ts`, `server/tests/economy-service.test.ts`, `client/tests/ShopScreen.test.ts`.

**Created**
- `supabase/migrations/20260803000000_vendor_rotation.sql`

---

### Task 1: Rotation clock primitives

Pure functions defining when each slot turns over. Nothing consumes them yet.

**Files:**
- Modify: `shared/src/economy.ts`
- Test: `server/tests/economy.test.ts` (shared's unit tests live in the server suite — that is the existing convention, `vendorStockFor` is already tested there)

**Interfaces:**
- Consumes: nothing.
- Produces: `VENDOR_SLOT_COUNT: number`, `VENDOR_SLOT_LIFETIME_HOURS: number`, `VENDOR_DAILY_PURCHASE_LIMIT: number`, `MS_PER_HOUR` (module-private), `utcHourIndex(nowMs: number): number`, `slotGeneration(slotIndex: number, hour: number): number`, `slotExpiryHour(slotIndex: number, generation: number): number`, `vendorInstanceKey(slotIndex: number, generation: number, band: number): string`.

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/economy.test.ts`, and add the new names to the existing `from '@arena/shared'` import block at the top of the file:

```ts
describe('vendor rotation clock', () => {
  it('converts epoch ms to whole UTC hours', () => {
    expect(utcHourIndex(Date.UTC(1970, 0, 1, 0, 0, 0))).toBe(0);
    expect(utcHourIndex(Date.UTC(1970, 0, 1, 0, 59, 59, 999))).toBe(0);
    expect(utcHourIndex(Date.UTC(1970, 0, 1, 1, 0, 0))).toBe(1);
  });

  it('advances by exactly 24 across one calendar day', () => {
    const a = utcHourIndex(Date.UTC(2026, 7, 2, 12, 30));
    const b = utcHourIndex(Date.UTC(2026, 7, 3, 12, 30));
    expect(b - a).toBe(24);
  });

  it('turns over exactly one slot each hour', () => {
    for (let hour = 1000; hour < 1024; hour++) {
      const changed = [0, 1, 2, 3, 4, 5].filter(
        i => slotGeneration(i, hour) !== slotGeneration(i, hour - 1),
      );
      expect(changed.length).toBe(1);
    }
  });

  it('gives every slot a six-hour lifetime', () => {
    for (let i = 0; i < VENDOR_SLOT_COUNT; i++) {
      const gen = slotGeneration(i, 1000);
      let hoursAtThisGen = 0;
      for (let h = 900; h < 1100; h++) if (slotGeneration(i, h) === gen) hoursAtThisGen++;
      expect(hoursAtThisGen).toBe(VENDOR_SLOT_LIFETIME_HOURS);
    }
  });

  it('never runs a generation backwards as the hour advances', () => {
    for (let i = 0; i < VENDOR_SLOT_COUNT; i++) {
      for (let h = 1000; h < 1050; h++) {
        expect(slotGeneration(i, h + 1)).toBeGreaterThanOrEqual(slotGeneration(i, h));
      }
    }
  });

  it('slotExpiryHour is the first hour of the next generation', () => {
    for (let i = 0; i < VENDOR_SLOT_COUNT; i++) {
      const gen = slotGeneration(i, 1000);
      const expiry = slotExpiryHour(i, gen);
      expect(slotGeneration(i, expiry)).toBe(gen + 1);
      expect(slotGeneration(i, expiry - 1)).toBe(gen);
    }
  });

  it('staggers the six slots so no two expire in the same hour', () => {
    const expiries = [0, 1, 2, 3, 4, 5].map(i => slotExpiryHour(i, slotGeneration(i, 1000)));
    expect(new Set(expiries).size).toBe(VENDOR_SLOT_COUNT);
  });

  it('vendorInstanceKey encodes slot, generation and band', () => {
    expect(vendorInstanceKey(3, 42, 7)).toBe('3:42:7');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace=server -- economy.test.ts`
Expected: FAIL — `utcHourIndex is not a function` (or a TS/import resolution error for the new names).

- [ ] **Step 3: Implement the primitives**

In `shared/src/economy.ts`, insert immediately above the existing `export type VendorSlot = ...` declaration:

```ts
export const VENDOR_SLOT_COUNT = 6;
/** Hours a single vendor slot stays on the shelf. Equal to
 * VENDOR_SLOT_COUNT so that exactly one of the six slots turns over each
 * hour — change one and the stagger stops being uniform. */
export const VENDOR_SLOT_LIFETIME_HOURS = 6;
/** Vendor purchases allowed per account per UTC day. Rotation buys variety,
 * not supply: this is deliberately unchanged from the pre-rotation
 * one-buy-per-slot-per-day budget. */
export const VENDOR_DAILY_PURCHASE_LIMIT = 6;

const MS_PER_HOUR = 3_600_000;

/** Whole UTC hours since the epoch — the vendor's clock. Takes `nowMs` as a
 * parameter rather than reading the clock so this module stays pure (see
 * the note on seededRng); callers pass Date.now(). */
export function utcHourIndex(nowMs: number): number {
  return Math.floor(nowMs / MS_PER_HOUR);
}

/** Which instance of `slotIndex` is on the shelf at `hour`. The -slotIndex
 * offset is what staggers the six slots: slot i rolls over exactly when
 * hour % 6 === i, so one slot (and only one) turns over every hour. */
export function slotGeneration(slotIndex: number, hour: number): number {
  return Math.floor((hour - slotIndex) / VENDOR_SLOT_LIFETIME_HOURS);
}

/** First hour at which `generation` of `slotIndex` is no longer on offer. */
export function slotExpiryHour(slotIndex: number, generation: number): number {
  return (generation + 1) * VENDOR_SLOT_LIFETIME_HOURS + slotIndex;
}

/** Identifies exactly one item offer. Doubles as the rng seed suffix (so
 * key and item can never disagree) and as vendor_purchases' primary key.
 * `band` is the item-level band, not the raw character level — the shelf
 * reshuffles on band crossings only, not on every level-up. */
export function vendorInstanceKey(slotIndex: number, generation: number, band: number): string {
  return `${slotIndex}:${generation}:${band}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --workspace=server -- economy.test.ts`
Expected: PASS, including all pre-existing tests in the file.

- [ ] **Step 5: Commit**

```bash
git add shared/src/economy.ts server/tests/economy.test.ts
git commit -m "feat(economy): add staggered vendor rotation clock primitives"
```

---

### Task 2: Reseed `vendorStockFor` per slot

Switch stock derivation from one day-seeded stream to six independently-clocked streams, and stamp each slot with its identity and expiry.

**Files:**
- Modify: `shared/src/economy.ts`
- Test: `server/tests/economy.test.ts`

**Interfaces:**
- Consumes: `VENDOR_SLOT_COUNT`, `slotGeneration`, `slotExpiryHour`, `vendorInstanceKey`, `MS_PER_HOUR` from Task 1; existing `levelToBand`, `seededRng`, `vendorBuyPrice`, `rollItem`, `ITEM_BASES`, `ITEM_LEVEL_BANDS`.
- Produces: `type VendorSlot = { slotIndex: number; instanceKey: string; expiresAt: number; base: ItemBase; rarity: 'basic' | 'magic'; affixes: RolledAffix[]; price: number }` and `vendorStockFor(userId: string, hour: number, maxCharLevel: number): VendorSlot[]`. Note the **signature change**: the second parameter is now a UTC hour index (number), not a `'YYYY-MM-DD'` string. `expiresAt` is epoch milliseconds.

- [ ] **Step 1: Rewrite the `vendorStockFor` tests**

In `server/tests/economy.test.ts`, replace the entire existing `describe('vendorStockFor', ...)` block with:

```ts
describe('vendorStockFor', () => {
  // 1000 is an arbitrary but fixed UTC hour index; every case below picks
  // hours relative to it so the stagger arithmetic is easy to follow.
  const HOUR = 1000;

  it('is byte-identical for the same user+hour+level', () => {
    expect(vendorStockFor('user1', HOUR, 5)).toEqual(vendorStockFor('user1', HOUR, 5));
  });

  it('differs for a different user', () => {
    expect(vendorStockFor('user1', HOUR, 5)).not.toEqual(vendorStockFor('user2', HOUR, 5));
  });

  it('rotates exactly one slot per hour and leaves the other five untouched', () => {
    const before = vendorStockFor('user1', HOUR, 5);
    const after = vendorStockFor('user1', HOUR + 1, 5);
    const changed = before.filter((s, i) => s.instanceKey !== after[i].instanceKey);
    expect(changed.length).toBe(1);
    for (let i = 0; i < VENDOR_SLOT_COUNT; i++) {
      if (before[i].instanceKey === after[i].instanceKey) expect(before[i]).toEqual(after[i]);
    }
  });

  it('replaces the whole shelf over six hours', () => {
    const before = vendorStockFor('user1', HOUR, 5);
    const after = vendorStockFor('user1', HOUR + VENDOR_SLOT_LIFETIME_HOURS, 5);
    for (let i = 0; i < VENDOR_SLOT_COUNT; i++) {
      expect(after[i].instanceKey).not.toBe(before[i].instanceKey);
    }
  });

  it('stamps each slot with its index, instance key and expiry', () => {
    const stock = vendorStockFor('userK', HOUR, 5); // level 5 -> band 4
    stock.forEach((slot, i) => {
      const gen = slotGeneration(i, HOUR);
      expect(slot.slotIndex).toBe(i);
      expect(slot.instanceKey).toBe(vendorInstanceKey(i, gen, 4));
      expect(slot.expiresAt).toBe(slotExpiryHour(i, gen) * 3_600_000);
    });
  });

  it('reshuffles across a band crossing but not within a band', () => {
    // levels 4 and 6 are both band 4; level 7 is band 7.
    expect(vendorStockFor('user1', HOUR, 4)).toEqual(vendorStockFor('user1', HOUR, 6));
    expect(vendorStockFor('user1', HOUR, 4)).not.toEqual(vendorStockFor('user1', HOUR, 7));
  });

  it('produces exactly 6 slots, each basic or magic, priced at 4x sell', () => {
    const stock = vendorStockFor('userX', HOUR, 8);
    expect(stock.length).toBe(VENDOR_SLOT_COUNT);
    for (const slot of stock) {
      expect(['basic', 'magic']).toContain(slot.rarity);
      expect(slot.price).toBe(vendorBuyPrice(slot.rarity, slot.base.itemLevel));
      if (slot.rarity === 'basic') expect(slot.affixes).toEqual([]);
    }
  });

  it('picks bases within ±1 band-step of the level band (mid band)', () => {
    // level 5 -> band 4 (index 1); allowed bands: 1, 4, 7
    for (const slot of vendorStockFor('userY', HOUR, 5)) {
      expect([1, 4, 7]).toContain(slot.base.itemLevel);
    }
  });

  it('does not go below band 1 at the lowest band', () => {
    for (const slot of vendorStockFor('userZ', HOUR, 2)) {
      expect([1, 4]).toContain(slot.base.itemLevel);
    }
  });

  it('does not go above band 10 at the highest band', () => {
    for (const slot of vendorStockFor('userW', HOUR, 12)) {
      expect([7, 10]).toContain(slot.base.itemLevel);
    }
  });

  it('rolls roughly 50/50 basic/magic over many seeds (weighted, not skewed)', () => {
    let magicCount = 0;
    let total = 0;
    // Step by the slot lifetime so every sample is a fresh generation for
    // every slot — stepping by 1 hour would resample five unchanged slots.
    for (let step = 0; step < 100; step++) {
      const stock = vendorStockFor('userBalance', 6000 + step * VENDOR_SLOT_LIFETIME_HOURS, 8);
      for (const slot of stock) {
        total++;
        if (slot.rarity === 'magic') magicCount++;
      }
    }
    expect(magicCount / total).toBeGreaterThan(0.35);
    expect(magicCount / total).toBeLessThan(0.65);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace=server -- economy.test.ts`
Expected: FAIL — `slot.instanceKey` is `undefined` and the identical-across-bands assertion fails, because `vendorStockFor` still seeds from a day string.

- [ ] **Step 3: Rewrite `VendorSlot` and `vendorStockFor`**

In `shared/src/economy.ts`, replace the existing `export type VendorSlot = ...` line and the whole `vendorStockFor` function with:

```ts
export type VendorSlot = {
  slotIndex: number;
  /** See vendorInstanceKey — identifies this exact offer. */
  instanceKey: string;
  /** Epoch ms at which this slot rotates. Derived from the caller-supplied
   * hour via slotExpiryHour, so no clock is read here. */
  expiresAt: number;
  base: ItemBase;
  rarity: 'basic' | 'magic';
  affixes: RolledAffix[];
  price: number;
};

/** Deterministic vendor stock at a given UTC hour: 6 slots, each basic or
 * magic (~50/50), bases drawn from bands within ±1 band-step of the
 * account's max character level's band.
 *
 * Each slot has its OWN rng stream keyed by its own generation, which is
 * what lets the six rotate independently on staggered 6-hour lives (one
 * turning over each hour) rather than all swapping together. Same
 * (userId, hour, maxCharLevel) ⇒ byte-identical output; the seed is
 * `${userId}:${instanceKey}` so a slot's advertised identity and its rolled
 * contents can never drift apart. */
export function vendorStockFor(userId: string, hour: number, maxCharLevel: number): VendorSlot[] {
  const band = levelToBand(maxCharLevel);
  const centerIdx = ITEM_LEVEL_BANDS.indexOf(band);
  const eligibleBands = new Set(
    [centerIdx - 1, centerIdx, centerIdx + 1]
      .filter(i => i >= 0 && i < ITEM_LEVEL_BANDS.length)
      .map(i => ITEM_LEVEL_BANDS[i]),
  );
  const eligibleBases = ITEM_BASES.filter(b => eligibleBands.has(b.itemLevel));

  const slots: VendorSlot[] = [];
  for (let slotIndex = 0; slotIndex < VENDOR_SLOT_COUNT; slotIndex++) {
    const generation = slotGeneration(slotIndex, hour);
    const instanceKey = vendorInstanceKey(slotIndex, generation, band);
    const rng = seededRng(userId, instanceKey);
    const rarity: 'basic' | 'magic' = rng() < 0.5 ? 'basic' : 'magic';
    const base = eligibleBases[Math.floor(rng() * eligibleBases.length)];
    const affixes = rarity === 'magic' ? rollItem(base, 'magic', rng) : [];
    slots.push({
      slotIndex,
      instanceKey,
      expiresAt: slotExpiryHour(slotIndex, generation) * MS_PER_HOUR,
      base,
      rarity,
      affixes,
      price: vendorBuyPrice(rarity, base.itemLevel),
    });
  }
  return slots;
}
```

Also update `seededRng`'s docstring — its second parameter is now an instance key, not a day:

```ts
/** Deterministic rng for a user + arbitrary discriminator (today: a vendor
 * instance key) — same inputs always produce the same sequence, so
 * byte-identical downstream output. */
export function seededRng(userId: string, discriminator: string): () => number {
  return mulberry32(fnv1aHash(`${userId}:${discriminator}`));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --workspace=server -- economy.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm the rest of the server suite's breakage is limited to the vendor call sites**

Run: `npm test --workspace=server`
Expected: FAIL only in `economy-service.test.ts` (its `getVendorView` / `buyVendorSlot` cases pass a day string). That is Task 4's job — do not fix it here. Record the failing test names in the commit body.

- [ ] **Step 6: Commit**

```bash
git add shared/src/economy.ts server/tests/economy.test.ts
git commit -m "feat(economy): reseed vendor stock per slot on a staggered hourly clock"
```

---

### Task 3: `vendor_purchases` migration

Write the migration. **Do not apply it** — Task 8 applies it after review.

**Files:**
- Create: `supabase/migrations/20260803000000_vendor_rotation.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `vendor_purchases.instance_key text not null`, primary key `(user_id, instance_key)`, index `vendor_purchases_user_day_idx (user_id, utc_day)`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260803000000_vendor_rotation.sql`:

```sql
-- Vendor stock rotation: the vendor's 6 slots now rotate on staggered
-- 6-hour lifetimes (one turning over each UTC hour) instead of all six
-- swapping at midnight UTC. A purchase therefore marks a specific ITEM
-- OFFER as spent, not a (day, slot) coordinate: instance_key is
-- '<slotIndex>:<generation>:<band>', produced by shared/src/economy.ts's
-- vendorInstanceKey and used verbatim as that offer's rng seed suffix.
--
-- utc_day survives as a plain column because it still backs the unchanged
-- 6-purchases-per-UTC-day allowance — it just no longer identifies WHICH
-- offer was bought. A 6-hour slot can straddle midnight UTC, so a live
-- offer's purchase row may legitimately carry yesterday's utc_day.
--
-- Written to be idempotently re-runnable against an already-migrated live
-- DB, matching the other economy migrations.

alter table vendor_purchases add column if not exists instance_key text;

-- Pre-rotation rows have no offer identity to recover. 'legacy:' keys can
-- never collide with a live instance_key (which always starts with a
-- digit), so these rows keep counting toward their own day's allowance in
-- the historical record and can never mark a live slot SOLD.
update vendor_purchases
   set instance_key = 'legacy:' || utc_day::text || ':' || slot_index::text
 where instance_key is null;

alter table vendor_purchases alter column instance_key set not null;

-- Swap the primary key from (user_id, utc_day, slot_index) to
-- (user_id, instance_key). Dropping the PK drops its backing index too.
alter table vendor_purchases drop constraint if exists vendor_purchases_pkey;
alter table vendor_purchases add constraint vendor_purchases_pkey
  primary key (user_id, instance_key);

-- Backs the daily-allowance count, which the PK no longer serves.
create index if not exists vendor_purchases_user_day_idx
  on vendor_purchases (user_id, utc_day);
```

- [ ] **Step 2: Verify the SQL parses and is order-safe by reading it back**

Run: `cat supabase/migrations/20260803000000_vendor_rotation.sql`
Confirm by inspection: the `update` runs before `set not null`; the PK is dropped before being re-added; every DDL statement is `if exists` / `if not exists` guarded. There is no local Postgres to execute against — this is a read-back check, and Task 8 is where it actually runs.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260803000000_vendor_rotation.sql
git commit -m "feat(db): key vendor_purchases by offer instance instead of day+slot"
```

---

### Task 4: Server service — instance-keyed view and substitution-proof buy

**Files:**
- Modify: `server/src/economy/service.ts`
- Test: `server/tests/economy-service.test.ts`

**Interfaces:**
- Consumes: Task 2's `vendorStockFor(userId, hour, maxCharLevel)` and `VendorSlot`; `VENDOR_DAILY_PURCHASE_LIMIT`, `VENDOR_SLOT_COUNT`, `utcHourIndex` from Task 1; Task 3's `instance_key` column.
- Produces:
  - `type VendorClock = { hour: number; utcDay: string }`
  - `vendorClockNow(nowMs?: number): VendorClock`
  - `type VendorSlotView = VendorSlot & { purchased: boolean; crossClass: boolean }` (`slotIndex` moved onto `VendorSlot` in Task 2, so it is no longer added here)
  - `type VendorViewResult = { slots: VendorSlotView[]; purchasesRemaining: number }`
  - `getVendorView(service, userId, clock: VendorClock): Promise<VendorViewResult>`
  - `buyVendorSlot(service, buyer, userId, clock: VendorClock, slotIndex: unknown, instanceKey: unknown): Promise<VendorBuyResult>`

- [ ] **Step 1: Write the failing tests**

In `server/tests/economy-service.test.ts`, add `VENDOR_DAILY_PURCHASE_LIMIT` and `vendorInstanceKey` to the `from '@arena/shared'` import, and `vendorClockNow` to the `from '../src/economy/service.ts'` import. Add this helper next to the other mock helpers near the top of the file:

```ts
// A fixed vendor clock. 2026-08-02T12:00Z is an arbitrary but stable
// instant; tests derive expected instance keys from it via vendorStockFor
// rather than hardcoding generation numbers.
const CLOCK = vendorClockNow(Date.UTC(2026, 7, 2, 12, 0, 0));
const keyFor = (userId: string, level: number, slotIndex: number) =>
  vendorStockFor(userId, CLOCK.hour, level)[slotIndex].instanceKey;
```

Then replace the whole `describe('buyVendorSlot', ...)` block with the following, and append the new `getVendorView` cases:

```ts
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

  it('debits gold BEFORE granting the item, on the happy path', async () => {
    const insertedItem = { id: 'item-1', base_id: 'leather_cap', rarity: 'basic', affixes: [], level_req: 1, equipped_by: null, equipped_slot: null, slot: 'helmet' };
    const { client: service, fromCalls } = mockServiceClient({
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

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item).toEqual(insertedItem);
    expect(fromCalls).toContain('vendor_purchases');
    expect(callOrder).toEqual(['spend_gold', 'items-insert']);
  });

  it('refunds gold and releases the slot when the item insert fails after debit', async () => {
    const { client: service, fromCalls } = mockServiceClient({
      characters: [ok([{ class: 'mage', level: 5 }])],
      vendor_purchases: [ok([]), ok(null), ok(null), ok(null)], // allowance, check, reserve, release
      items: [fail('insert failed')],
      profiles: [ok({ gold: 100 }), ok(null)], // refund read, then update
    });
    const { client: buyer, rpc } = mockBuyerClient(ok());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await buyVendorSlot(service, buyer, 'u1', CLOCK, 0, keyFor('u1', 5, 0));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
    expect(rpc).toHaveBeenCalledOnce();
    expect(fromCalls).toContain('profiles');
    errorSpy.mockRestore();
  });
});
```

Delete any remaining pre-existing `getVendorView` cases in the file that pass a `'YYYY-MM-DD'` string as the third argument — the cases above replace them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace=server -- economy-service.test.ts`
Expected: FAIL — `vendorClockNow` is not exported, and `getVendorView` returns an array rather than `{ slots, purchasesRemaining }`.

- [ ] **Step 3: Implement the service changes**

In `server/src/economy/service.ts`:

Add to the `from '@arena/shared'` import: `VENDOR_DAILY_PURCHASE_LIMIT`, `VENDOR_SLOT_COUNT`, `utcHourIndex`.

Add below the existing `utcDayString()` (keep that function — it has other callers):

```ts
/** The vendor's two clock readings taken from ONE instant, so a request can
 * never straddle an hour or day boundary mid-flight. Injected into
 * getVendorView/buyVendorSlot rather than read inside them, which keeps
 * both testable without fake timers. */
export type VendorClock = { hour: number; utcDay: string };

export function vendorClockNow(nowMs: number = Date.now()): VendorClock {
  return { hour: utcHourIndex(nowMs), utcDay: new Date(nowMs).toISOString().slice(0, 10) };
}
```

Replace `VendorSlotView` (drop `slotIndex`, which `VendorSlot` now carries) and `getVendorView`:

```ts
export type VendorSlotView = VendorSlot & {
  purchased: boolean;
  /** True when this slot's base is class-restricted and the account
   * currently has no character of that class — see the class-filter note
   * on getVendorView below. Purely informational; the slot stays
   * purchasable (the account may roll that class later, or is buying for a
   * future character). */
  crossClass: boolean;
};

export type VendorViewResult = { slots: VendorSlotView[]; purchasesRemaining: number };

export async function getVendorView(
  service: SupabaseClient, userId: string, clock: VendorClock,
): Promise<VendorViewResult> {
  const { maxLevel, ownedClasses } = await loadAccountCharSummary(service, userId);
  const stock = vendorStockFor(userId, clock.hour, maxLevel);

  // Purchases against the offers CURRENTLY on the shelf. Keyed by
  // instance_key rather than utc_day: a 6-hour slot can straddle midnight
  // UTC, so a live offer's purchase row may carry yesterday's day.
  const { data: purchases, error } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .in('instance_key', stock.map(s => s.instanceKey));
  if (error) console.error('getVendorView: vendor_purchases read failed:', error.message);
  const purchasedKeys = new Set((purchases ?? []).map((r: { instance_key: string }) => r.instance_key));

  // Today's purchases, for the daily allowance. Capped at
  // VENDOR_DAILY_PURCHASE_LIMIT rows, so selecting them is cheaper than a
  // separate count query and keeps one code path for both reads.
  const { data: todayRows, error: todayErr } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .eq('utc_day', clock.utcDay);
  if (todayErr) console.error('getVendorView: daily allowance read failed:', todayErr.message);
  const purchasesRemaining = Math.max(0, VENDOR_DAILY_PURCHASE_LIMIT - (todayRows?.length ?? 0));

  return {
    slots: stock.map(slot => ({
      ...slot,
      purchased: purchasedKeys.has(slot.instanceKey),
      crossClass: slot.base.classRestriction != null && !ownedClasses.has(slot.base.classRestriction),
    })),
    purchasesRemaining,
  };
}
```

Replace `buyVendorSlot`'s signature and its validate/check prologue, leaving the debit → reserve → grant → compensate tail intact except where noted:

```ts
/** Buy one vendor offer. Order: validate -> confirm the offer is still the
 * one the client saw -> daily allowance -> not already bought -> debit gold
 * (buyer's own JWT, so spend_gold's auth.uid() is the buyer) -> reserve the
 * offer -> grant the item. Everything that can reject does so BEFORE the
 * debit, so the only compensation path is the item insert failing. */
export async function buyVendorSlot(
  service: SupabaseClient,
  buyer: SupabaseClient,
  userId: string,
  clock: VendorClock,
  slotIndex: unknown,
  instanceKey: unknown,
): Promise<VendorBuyResult> {
  if (typeof slotIndex !== 'number' || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= VENDOR_SLOT_COUNT) {
    return { ok: false, status: 400, error: 'invalid slotIndex' };
  }
  if (typeof instanceKey !== 'string' || instanceKey.length === 0) {
    return { ok: false, status: 400, error: 'invalid instanceKey' };
  }

  const { maxLevel } = await loadAccountCharSummary(service, userId);
  const slot = vendorStockFor(userId, clock.hour, maxLevel)[slotIndex];

  // Substitution guard. The client bought a specific offer; if the shelf
  // has reseeded since it rendered — hourly rotation, a level-band change,
  // a tab left open — this index now holds something else, and granting it
  // would charge the displayed price for a different item. Reject before
  // any gold moves and let the client refetch. This is the authoritative
  // check; the client's own expiry guard only narrows the window.
  if (slot.instanceKey !== instanceKey) {
    return { ok: false, status: 409, error: 'stock changed' };
  }

  const { data: todayRows, error: todayErr } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .eq('utc_day', clock.utcDay);
  if (todayErr) {
    console.error('buyVendorSlot: daily allowance read failed:', todayErr.message);
    return { ok: false, status: 500, error: 'internal error' };
  }
  if ((todayRows?.length ?? 0) >= VENDOR_DAILY_PURCHASE_LIMIT) {
    return { ok: false, status: 429, error: 'daily purchase limit reached' };
  }

  const { data: existing, error: existingErr } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .eq('instance_key', instanceKey)
    .maybeSingle();
  if (existingErr) {
    console.error('buyVendorSlot: purchase check failed:', existingErr.message);
    return { ok: false, status: 500, error: 'internal error' };
  }
  if (existing) return { ok: false, status: 400, error: 'slot already purchased' };

  const { error: debitErr } = await buyer.rpc('spend_gold', { p_amount: slot.price });
  if (debitErr) return { ok: false, status: 402, error: debitErr.message };

  const { error: reserveErr } = await service
    .from('vendor_purchases')
    .insert({ user_id: userId, utc_day: clock.utcDay, slot_index: slotIndex, instance_key: instanceKey });
  if (reserveErr) {
    console.error('buyVendorSlot: vendor_purchases insert failed after debit — refunding:', reserveErr.message);
    await refundGold(service, userId, slot.price);
    return { ok: false, status: 500, error: 'purchase failed, gold refunded' };
  }
  // ... existing items insert unchanged ...
```

In the item-insert failure branch, change the release to key on the instance:

```ts
    await service.from('vendor_purchases').delete().eq('user_id', userId).eq('instance_key', instanceKey);
```

Delete the now-unused local `const utcDay = utcDayString();` from `buyVendorSlot` (the clock supplies it).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --workspace=server`
Expected: PASS — the whole server suite, including `economy.test.ts` from Task 2.

- [ ] **Step 5: Commit**

```bash
git add server/src/economy/service.ts server/tests/economy-service.test.ts
git commit -m "feat(economy): key vendor buys to a specific offer and cap them daily"
```

---

### Task 5: Route wiring

**Files:**
- Modify: `server/src/economy/routes.ts`
- Test: `server/tests/economy-service.test.ts` (the handler tests already live there)

**Interfaces:**
- Consumes: `vendorClockNow`, `getVendorView`, `buyVendorSlot` from Task 4.
- Produces: `GET /economy/vendor` → `{ slots, purchasesRemaining }`; `POST /economy/vendor/buy` accepts `{ slotIndex, instanceKey }`.

- [ ] **Step 1: Make the module-level `supabase` mock swappable**

`buyVendorHandler` reaches the service through the module-level `supabase`
singleton, which `economy-service.test.ts` currently mocks as a frozen
`{}` — useless for exercising a handler end to end. Convert that mock (line
~10) into a hoisted, per-test-swappable holder. The default stays `{}`, so
every existing test in the file is unaffected:

```ts
const supabaseStub = vi.hoisted(() => ({ current: {} as any }));
vi.mock('../src/supabase.ts', () => ({ get supabase() { return supabaseStub.current; } }));
```

- [ ] **Step 2: Write the failing test**

Append a new top-level block to `server/tests/economy-service.test.ts`. The
assertion is deliberately the **409**, not a 200: reaching `stock changed`
proves the handler forwarded `instanceKey` from the body (a handler that
dropped it would produce a 400 `invalid instanceKey`) and that it built a
clock, while rejecting before `buyer.rpc` is ever called — so no network
call is attempted against the throwaway anon client.

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test --workspace=server -- economy-service.test.ts`
Expected: FAIL with a 400 `invalid instanceKey` instead of the 409 — the handler never reads `instanceKey` from the body.

- [ ] **Step 4: Update the handlers**

In `server/src/economy/routes.ts`, change the service import to bring in `vendorClockNow` (and drop `utcDayString` if nothing else in the file uses it), then replace both vendor handlers:

```ts
export async function getVendorHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthedRequest;
  res.json(await getVendorView(supabase, userId, vendorClockNow()));
}

export async function buyVendorHandler(req: Request, res: Response): Promise<void> {
  const { userId, accessToken } = req as AuthedRequest;
  const result = await buyVendorSlot(
    supabase, buyerClient(accessToken), userId, vendorClockNow(),
    req.body?.slotIndex, req.body?.instanceKey,
  );
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.json({ item: result.item });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test --workspace=server`
Expected: PASS — including the pre-existing `asyncHandler: misconfigured env fails fast` block, which depends on `SUPABASE_URL`/`SUPABASE_ANON_KEY` being absent. If it now fails, the new block's `afterEach` is not restoring them.

- [ ] **Step 6: Commit**

```bash
git add server/src/economy/routes.ts server/tests/economy-service.test.ts
git commit -m "feat(economy): pass the vendor clock and instance key through the routes"
```

---

### Task 6: Client API layer

**Files:**
- Modify: `client/src/supabase.ts`

**Interfaces:**
- Consumes: Task 5's response and request shapes.
- Produces: `type VendorSlotView = VendorSlot & { purchased: boolean; crossClass: boolean }`, `type VendorView = { slots: VendorSlotView[]; purchasesRemaining: number }`, `buyVendorSlot(slotIndex: number, instanceKey: string): Promise<EconomyPurchaseResult>`. Removes `fetchVendorPurchases`.

- [ ] **Step 1: Update the types and the buy helper**

In `client/src/supabase.ts`:

Replace the two type declarations (around line 310):

```ts
// slotIndex/instanceKey/expiresAt now live on shared's VendorSlot itself,
// so the view type only adds the two account-specific annotations.
export type VendorSlotView = VendorSlot & { purchased: boolean; crossClass: boolean };
export type VendorView = { slots: VendorSlotView[]; purchasesRemaining: number };
```

Change `buyVendorSlot` to take and send the instance key:

```ts
export async function buyVendorSlot(slotIndex: number, instanceKey: string): Promise<EconomyPurchaseResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, status: 401, error: 'not signed in' };
  try {
    const res = await fetch(`${GAME_SERVER_URL}/economy/vendor/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ slotIndex, instanceKey }),
    });
    // ... rest of the body unchanged ...
```

Delete `fetchVendorPurchases` entirely (it is unreferenced anywhere in `client/`, and it reads `vendor_purchases` by the `(utc_day, slot_index)` pair that Task 3 stops identifying an offer). Also update the stale block comment above the type declarations, which claims no UI consumes these helpers — ShopScreen has since.

- [ ] **Step 2: Confirm the only breakage is the ShopScreen call sites**

Run: `npm run build --workspace=client`
Expected: FAIL, and **only** in `client/src/items/ShopScreen.ts` — it still calls the one-argument `buyVendorSlot` and reads `vendor.utcDay`. That is Task 7's job; do not fix it here. Any error in another file means something else consumed the deleted `fetchVendorPurchases` or the old `VendorView` shape — investigate before continuing.

Run: `npm test --workspace=client`
Expected: PASS — `ShopScreen.test.ts` only imports pure helpers, none of which changed yet.

`tsc` fails before `vite build` runs, so `client/dist/` should be untouched. Confirm with `git status --short client/dist` and restore if it isn't:

```bash
git checkout -- client/dist && git clean -fdq client/dist
```

- [ ] **Step 3: Commit**

```bash
git add client/src/supabase.ts
git commit -m "feat(client): send the vendor instance key with a buy"
```

---

### Task 7: Shop screen — countdowns, allowance, and the expiry guard

**Files:**
- Modify: `client/src/items/ShopScreen.ts`
- Test: `client/tests/ShopScreen.test.ts`

**Interfaces:**
- Consumes: Task 6's `VendorView` / `VendorSlotView` / `buyVendorSlot(slotIndex, instanceKey)`; `VENDOR_DAILY_PURCHASE_LIMIT` from `@arena/shared`.
- Produces: `slotExpired(expiresAt: number, nowMs: number): boolean`, `formatCountdown(msRemaining: number): string`, `slotDisplayState(slot, gold, purchasesRemaining): SlotDisplayState` where `SlotDisplayState = 'available' | 'sold' | 'limit-reached' | 'unaffordable'`. Removes `currentUtcDay` and `vendorViewIsStale`.

- [ ] **Step 1: Rewrite the failing tests**

In `client/tests/ShopScreen.test.ts`, change the import to
`import { canAfford, slotDisplayState, slotExpired, formatCountdown } from '../src/items/ShopScreen';`,
delete the `describe('currentUtcDay')` and `describe('vendorViewIsStale')` blocks, replace the `describe('slotDisplayState')` block, and append the two new blocks:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace=client -- ShopScreen.test.ts`
Expected: FAIL — `slotExpired` / `formatCountdown` are not exported and `slotDisplayState` ignores its third argument.

- [ ] **Step 3: Replace the pure helpers**

In `client/src/items/ShopScreen.ts`, add `VENDOR_DAILY_PURCHASE_LIMIT` to the `from '@arena/shared'` import. Delete `currentUtcDay` and `vendorViewIsStale` entirely, and replace `SlotDisplayState` / `slotDisplayState` / `noticeForError` with:

```ts
export type SlotDisplayState = 'available' | 'sold' | 'limit-reached' | 'unaffordable';

/** Derives a vendor card's display state from server-reported `purchased`,
 * the account's remaining daily allowance, and a fresh gold read. Ordering
 * is deliberate: an already-bought slot reads SOLD whatever else is true,
 * and a spent allowance outranks affordability because it is the blocker
 * the player can actually do something about (come back tomorrow). */
export function slotDisplayState(
  slot: { purchased: boolean; price: number },
  gold: number | null,
  purchasesRemaining: number,
): SlotDisplayState {
  if (slot.purchased) return 'sold';
  if (purchasesRemaining <= 0) return 'limit-reached';
  if (!canAfford(gold, slot.price)) return 'unaffordable';
  return 'available';
}

/** True once a slot's rotation deadline has passed. Slots rotate on
 * staggered 6-hour lifetimes, so a shop left open will outlive its stock;
 * this is what the buy handler checks before submitting. Takes `nowMs` as a
 * parameter so it stays deterministic in tests. */
export function slotExpired(expiresAt: number, nowMs: number): boolean {
  return nowMs >= expiresAt;
}

/** Per-card rotation countdown: "5h 02m" / "42m" / "<1m". */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'rotating…';
  const totalMinutes = Math.floor(msRemaining / 60_000);
  if (totalMinutes < 1) return '<1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

/** Insufficient-gold (402), rotated-out (409) and allowance-spent (429)
 * rejections get fixed, friendly notices; every other failure surfaces the
 * server's own message so it stays specific and doesn't drift from
 * service.ts's actual error strings. */
function noticeForError(status: number, error: string): string {
  if (status === 402) return 'Not enough gold.';
  if (status === 409) return 'That item just rotated out.';
  if (status === 429) return 'Daily purchase limit reached.';
  return error;
}
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run: `npm test --workspace=client -- ShopScreen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the helpers**

```bash
git add client/src/items/ShopScreen.ts client/tests/ShopScreen.test.ts
git commit -m "feat(shop): add rotation-aware display state and countdown helpers"
```

- [ ] **Step 6: Wire the class body to the new view shape**

Still in `client/src/items/ShopScreen.ts`:

Add to the `STYLES` template, after the `.sh-vslot-price` rule:

```css
.sh-vslot-timer{font-size:11px;color:var(--px-border-light);opacity:0.7;letter-spacing:0.04em;}
```

Replace the `staleNotice` field declaration's neighbours with a rotation timer field:

```ts
  // Refetch handle armed at the soonest slot expiry — a shop left open
  // would otherwise keep offering stock the server has already rotated out.
  private rotationTimer: number | null = null;
```

In `render()`, replace the vendor column label with the daily allowance:

```ts
          <div class="sh-col-vendor">
            <div class="sh-col-label">Vendor<span class="sh-countdown">${
              this.vendor
                ? `${this.vendor.purchasesRemaining} / ${VENDOR_DAILY_PURCHASE_LIMIT} purchases left today`
                : 'stock rotates hourly'
            }</span></div>
```

In `renderVendorCard`, pass the allowance into the state derivation, add the countdown line, and extend the label:

```ts
    const state = slotDisplayState(slot, this.gold, this.vendor?.purchasesRemaining ?? 0);
    ...
    const label = state === 'sold' ? 'Sold'
      : pending ? 'Buying…'
      : state === 'limit-reached' ? 'Daily Limit'
      : state === 'unaffordable' ? "Can't Afford"
      : 'Buy';
```

and insert directly below the existing price div:

```ts
        <div class="sh-vslot-timer">${esc(formatCountdown(slot.expiresAt - Date.now()))}</div>
```

In `attachListeners`, update the buy-click state recomputation to match:

```ts
        const state = slot ? slotDisplayState(slot, this.gold, this.vendor?.purchasesRemaining ?? 0) : 'unaffordable';
```

Add the timer scheduler as a private method, and call `this.scheduleRotationRefresh();` as the last statement of `reload()`:

```ts
  /** Arms a single refetch at the soonest slot expiry. One timer, not six:
   * the earliest deadline is the only one that matters, and reload()
   * re-arms from the fresh view. */
  private scheduleRotationRefresh(): void {
    if (this.rotationTimer !== null) { clearTimeout(this.rotationTimer); this.rotationTimer = null; }
    if (!this.vendor || this.vendor.slots.length === 0) return;
    const soonest = Math.min(...this.vendor.slots.map(s => s.expiresAt));
    // +1s of slack so the refetch lands after the server's own hour boundary.
    const delay = Math.max(1000, soonest - Date.now() + 1000);
    this.rotationTimer = window.setTimeout(() => { void this.reload(); }, delay);
  }
```

Clear it in `hide()` and in `reset()`:

```ts
    if (this.rotationTimer !== null) { clearTimeout(this.rotationTimer); this.rotationTimer = null; }
```

Replace the UTC-day guard at the top of `handleBuySlot` with a per-slot expiry guard, and send the instance key:

```ts
    // Rotation guard: the card on screen advertises a specific offer, and
    // slots rotate on staggered 6-hour lives. If this one's deadline has
    // passed, the server has already re-derived a different offer at the
    // same index — abort and refetch rather than submit. This only narrows
    // the window; buyVendorSlot's instanceKey check is the real backstop,
    // rejecting with 409 rather than ever substituting an item.
    const slot = this.vendor?.slots.find(s => s.slotIndex === slotIndex);
    if (!slot || slotExpired(slot.expiresAt, Date.now())) {
      this.staleNotice = 'New stock has arrived — refreshed.';
      await this.reload();
      return;
    }
    this.staleNotice = null;

    this.pending.add(key);
    this.noticeBySlot.delete(slotIndex);

    if (this.gold !== null) {
      // DISPLAY-ONLY: flips SOLD, decrements the shown balance and burns an
      // allowance slot immediately for responsiveness; reload() below always
      // overwrites all three from a fresh server read, win or lose.
      slot.purchased = true;
      this.gold -= slot.price;
      if (this.vendor) this.vendor.purchasesRemaining = Math.max(0, this.vendor.purchasesRemaining - 1);
    }
    this.render();

    sfx.playPurchase();
    const result = await buyVendorSlot(slotIndex, slot.instanceKey);
```

Delete the now-dead `const slot = this.vendor?.slots.find(...)` lookup that previously sat below `this.pending.add(key)` — the guard above supplies it.

- [ ] **Step 7: Verify the client builds and both suites pass**

Run: `npm run build --workspace=client && npm test --workspace=client && npm test --workspace=server`
Expected: PASS, with no TypeScript errors.

Then restore the tracked build output:

```bash
git checkout -- client/dist && git clean -fdq client/dist
```

- [ ] **Step 8: Commit**

```bash
git add client/src/items/ShopScreen.ts
git commit -m "feat(shop): show per-slot rotation countdowns and the daily allowance"
```

---

### Task 8: Apply the migration and verify live

**Do not start this task until the implementation review has passed.** Applying an economy migration before review has previously put a live hole in prod.

**Files:**
- No source changes. Uses `supabase/migrations/20260803000000_vendor_rotation.sql` from Task 3.

**Interfaces:**
- Consumes: everything above.
- Produces: a migrated live database and a verified end-to-end shop.

- [ ] **Step 1: Package the migration as a script for the user to run**

Migrations here are hand-applied via the Supabase management API, and the agent must not harvest the access token. Write `scripts/apply-vendor-rotation-migration.sh` (git-ignored or deleted afterwards) that POSTs the migration file to `/v1/projects/{ref}/database/query`, following the same shape as previous migration applications, reading the token from the user's environment. Then ask the user to run it with a leading `!` so it executes in their session.

- [ ] **Step 2: Confirm the schema landed**

Ask the user to run, via `!`, a query returning `vendor_purchases`' columns and its primary-key definition. Confirm: `instance_key text NOT NULL` exists; the PK is `(user_id, instance_key)`; `vendor_purchases_user_day_idx` exists; every pre-existing row has a `legacy:`-prefixed `instance_key`.

- [ ] **Step 3: Restart the game server**

The dev game server is frequently started WITHOUT watch mode, in which case it keeps serving the old code and every check below tests stale behaviour.

Run: confirm with the user which server process is live, then restart it.

- [ ] **Step 4: Verify the shop end to end in the browser**

Open the shop on a logged-in account and confirm:
- Six cards render, each with its own countdown, and no two countdowns are equal.
- The header reads `6 / 6 purchases left today` on a fresh day.
- A purchase succeeds, the card flips to SOLD, gold drops by the displayed price, and the header decrements.
- Reloading the page keeps that card SOLD.

- [ ] **Step 5: Verify the substitution guard rejects rather than substitutes**

In the browser console, call the buy endpoint directly with a deliberately wrong instance key for an unbought slot (e.g. `'0:1:4'`). Confirm the response is **409 `stock changed`**, that gold is unchanged afterwards, and that no new item appears in the stash.

- [ ] **Step 6: Report results and commit any cleanup**

Report which checks passed, with the actual observed values — not a summary. If a script was created in Step 1, delete it.

```bash
git add -A
git commit -m "chore(economy): apply vendor rotation migration"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Rotation model: constants, `utcHourIndex`, `slotGeneration`, `slotExpiryHour` | 1 |
| Per-slot seeding with band, `instanceKey`, `expiresAt`, signature change | 2 |
| `vendor_purchases` PK swap, `legacy:` backfill, daily index | 3 |
| SOLD by current instance key; daily cap enforcement; `purchasesRemaining` | 4 |
| `instanceKey` request field, 409 before any gold movement | 4, 5 |
| Client `VendorView` reshape, `expiresAt` epoch ms, `purchasesRemaining` | 6 |
| Countdowns, allowance header, `limit-reached`, expiry refetch timer, guard replacement | 7 |
| Test matrix (shared / server / client) | 1, 2, 4, 7 |

**Deliberately-not-addressed items** from the spec (one-off reshuffle on deploy, band still in the seed, quality-shopping) need no task by definition.

**Type consistency:** `VendorSlot` gains `slotIndex` / `instanceKey` / `expiresAt` in Task 2; Tasks 4 and 6 both drop `slotIndex` from their `VendorSlotView` intersections accordingly. `VendorClock` is introduced in Task 4 and consumed in Task 5 only. `slotDisplayState` is three-arity from Task 7 onward, at both of its call sites (`renderVendorCard` and the click handler).

**Known scope note:** Task 6 deletes `fetchVendorPurchases` from `client/src/supabase.ts`. It has no callers and reads `vendor_purchases` by the `(utc_day, slot_index)` pair this change stops treating as an offer's identity, so leaving it would leave a silently-wrong helper behind.
