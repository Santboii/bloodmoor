# Vendor Stock Rotation — Design

Approved 2026-08-02. The shop vendor's 6 slots rotate on staggered 6-hour
lifetimes — one slot turning over each UTC hour — instead of all six
swapping at midnight UTC. Purchase volume is unchanged: still at most 6
vendor items per account per UTC day. Buys are hardened against item
substitution across any reseed.

## Motivation

Vendor stock currently changes once a day, so the shop reads as static
within a play session. Faster rotation makes it worth revisiting.

Two constraints shape the design:

**Supply must not inflate.** Today the vendor can sell at most 6 items per
day. Naively rotating hourly with a per-rotation limit would make that 144,
gold-capped only — and since stock is basic/magic at a flat 4x sell-price
markup, cheap magic rerolls would start competing with loot drops as an
affix source. The daily cap therefore stays; rotation buys variety, not
volume.

**Faster rotation must not reward clock-watching.** All-six-every-hour
means an item you liked is gone in under 60 minutes. Staggering the six
slots on independent 6-hour lives keeps something always new while giving
any single item a window forgiving enough that you need not camp the shop.

## Current behaviour

Stock is stateless and deterministic. `vendorStockFor(userId, utcDay,
maxCharLevel)` in `shared/src/economy.ts` seeds one mulberry32 stream from
`FNV-1a("<userId>:<YYYY-MM-DD>")` and draws all 6 slots from it in
sequence. Nothing is persisted — the server re-derives on every read
(`server/src/economy/service.ts`, `getVendorView`). Only purchases are
stored, as `(user_id, utc_day, slot_index)` rows in `vendor_purchases`.

Changing the rotation is therefore purely a change of seed and of the
purchase key. No stock table is introduced by this design; stock stays
derived.

## Rotation model — `shared/src/economy.ts`

Each slot gets its own rng stream and its own clock.

```ts
export const VENDOR_SLOT_COUNT = 6;
export const VENDOR_SLOT_LIFETIME_HOURS = 6;
export const VENDOR_DAILY_PURCHASE_LIMIT = 6;

utcHourIndex(nowMs)              // floor(nowMs / 3_600_000) — whole UTC hours since epoch
slotGeneration(slotIndex, hour)  // floor((hour - slotIndex) / VENDOR_SLOT_LIFETIME_HOURS)
slotExpiryHour(slotIndex, gen)   // (gen + 1) * VENDOR_SLOT_LIFETIME_HOURS + slotIndex
```

Slot *i* turns over exactly when `(hour - i) % 6 === 0`. With six slots and
a six-hour lifetime, precisely one expires per hour and every item is on
the shelf for six hours.

The per-slot seed is `` `${userId}:${slotIndex}:${gen}:${band}` ``, where
`band` is the item-level band from `levelToBand(maxCharLevel)` (1/4/7/10) —
deliberately the band and not the raw level, so the shelf reshuffles only
when the account crosses a band boundary rather than on every level-up.

`vendorStockFor` keeps its current roll mechanics per slot (basic/magic
~50/50, bases drawn from bands within +/-1 band-step, `vendorBuyPrice`).
Only the stream feeding it changes: one stream per slot rather than one
shared sequential stream. This is required for slots to rotate
independently.

Every slot additionally exposes an **`instanceKey`**:
`` `${slotIndex}:${gen}:${band}` `` — one opaque string naming exactly
which item is on offer, and the unit of both purchase records and buy
validation.

`vendorStockFor`'s signature becomes `(userId, hour, maxCharLevel)`, taking
a UTC hour index in place of the `'YYYY-MM-DD'` string. The module stays
pure: no `Date.now()` inside it; callers pass the hour.

## Purchase records — migration

`vendor_purchases`'s primary key moves from `(user_id, utc_day,
slot_index)` to `(user_id, instance_key)`. `utc_day` and `slot_index`
remain as plain columns; add an index on `(user_id, utc_day)` for the daily
count. The existing `slot_index between 0 and 5` check constraint stays.

- **SOLD** = a row exists for the slot's *current* instance key. Once the
  slot rotates, its old row no longer matches and the slot reads available
  again.
- **Daily cap** = `count(*) where user_id = ? and utc_day = <today>` >=
  `VENDOR_DAILY_PURCHASE_LIMIT` rejects the buy.

Existing rows backfill `instance_key` as
`` `legacy:${utc_day}:${slot_index}` ``: they still count toward their own
day's cap and can never collide with a live instance key. As with the other
economy migrations, the migration must stay idempotently re-runnable
against an already-migrated live DB.

## Substitution-proof buys

This closes a hole that exists today, independent of rotation speed.

`POST /economy/vendor/buy` currently takes only `{ slotIndex }`, re-derives
stock server-side, and grants whatever now sits at that index. If the seed
changed between the client's view and the click, the buyer pays the
displayed price for a different item. `vendorViewIsStale` in
`client/src/items/ShopScreen.ts` narrows that window client-side but cannot
close it — and rotating hourly would open it far more often.

The request therefore carries `{ slotIndex, instanceKey }`. The server
re-derives the slot, compares the keys, and on mismatch returns **409
`stock changed`** *before any gold moves*. One check covers hour rollover,
band changes, and client clock skew, and makes rotation frequency
irrelevant to correctness.

Ordering within `buyVendorSlot` is otherwise unchanged — validate ->
instanceKey match -> daily-cap check -> already-purchased check -> debit
gold -> reserve the slot -> grant the item, with the existing
refund-on-failure compensation at each step after the debit.

## Client — `client/src/items/ShopScreen.ts`

`VendorView` becomes `{ slots: VendorSlotView[]; purchasesRemaining:
number }`; `utcDay` is dropped. Each `VendorSlotView` gains `instanceKey`
(string) and `expiresAt` (epoch milliseconds, computed server-side from
`slotExpiryHour` so the client never derives rotation timing itself).
`purchasesRemaining` is likewise computed server-side as
`VENDOR_DAILY_PURCHASE_LIMIT` minus today's row count.

- The fixed `new stock at midnight UTC` caption is replaced by a per-card
  countdown and a header reading `N / 6 purchases left today`.
- A timer set to the nearest slot expiry triggers a refetch, so a shop left
  open does not display expired stock.
- `slotDisplayState` gains a `'limit-reached'` state; the button reads
  `Daily Limit` and plays the denied sfx. Purchased-wins-over-affordability
  ordering is preserved, with `sold` still taking precedence.
- `currentUtcDay` / `vendorViewIsStale` are replaced by an expiry check
  driven by `expiresAt`. The pre-submit guard and its `staleNotice` path
  remain, now keyed on expiry rather than UTC day; the server's 409 is the
  authoritative backstop behind it.

## Testing

**shared** — exactly one slot turns over per hour; each slot's lifetime is
six hours; `slotGeneration` is monotonic in `hour`; a slot's generation at
`slotExpiryHour(i, gen)` is exactly `gen + 1`, and at the hour before it is
still `gen`; `vendorStockFor` is byte-identical for a repeated
`(userId, hour, maxCharLevel)` and slots are independent (advancing one
slot's generation leaves the other five untouched).

**server** — a mismatched `instanceKey` returns 409 with zero gold
movement and no `vendor_purchases` row; the daily cap rejects the 7th
purchase in a UTC day; a rotated slot carrying a stale purchase row reads
available; the existing refund-on-failure paths still hold.

**client** — `slotDisplayState` returns `'limit-reached'` when the daily
allowance is spent, and `'sold'` still wins over it; countdown formatting.

## Deliberately not addressed

**Deploying reshuffles every account's current shelf once.** Unavoidable
when the seeding scheme changes; there is no migration path that preserves
in-flight stock, and none is wanted.

**The band still enters the seed.** Deleting an account's highest-level
character can drop it a band and reshuffle all six slots. With instanceKey
validation in place this is financially harmless — no substituted item can
be sold — and it costs the player a character to attempt. A monotonic
level high-water mark would close it, and is judged not worth the state.

**Quality-shopping.** A player who checks every rotation picks their 6
daily purchases from a larger pool than one who logs in once. This is
inherent to any rotation; the daily cap bounds its effect to the same 6
items either way.
