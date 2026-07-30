# Economy Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the gold economy: match rewards (gold + win-chance loot roll), selling items, a daily vendor, and loot boxes — all server-authoritative, consuming Phase 1's drop tables and closing the two recorded preconditions.

**Architecture:** Gold lives on `profiles.gold`, mutated only by SQL RPCs. Item *creation* (loot boxes, match drops, vendor grants) runs in the Node game server via shared `rollItem` + service-role inserts behind JWT-validated HTTP endpoints — SQL never re-implements rolling. Sell pricing exists once in shared TS and once in SQL, kept honest by a drift-contract test (the Phase 1 pattern). UI extends the Gear screen (sell) and adds a Shop screen (vendor + loot boxes).

**Tech Stack:** As Phase 1 (TS monorepo, Supabase, pixel theme kit). Spec: `docs/superpowers/specs/2026-07-30-itemization-economy-design.md` — binding, including its **Phase 2 preconditions** section.

## Global Constraints

- Gold is account-level (`profiles.gold`, integer ≥ 0), never computed or asserted client-side; every mutation is a SECURITY DEFINER RPC (pinned search_path, `auth.uid()` checks) or a game-server service-role write behind a validated user JWT.
- **Precondition 1 (spec):** `source = 'starter'` items are unsellable — enforced in the sell RPC, not just hidden in UI.
- **Precondition 2 (spec):** `move_speed_pct` affix becomes leggings-only in the roll pools (single slot ⇒ max +8%, under the 1.15 computeLoadout clamp, which stays as a safety net). Existing rolled items with the affix on other slots remain valid (validateItemRow unchanged).
- Sell requires the item to be UNEQUIPPED and non-starter. Uniques require a client-side confirm (server doesn't care).
- Economy numbers (single source: shared `economy.ts`): SELL_PRICES by rarity × band [1,4,7,10]: basic 5/10/15/25, magic 25/40/60/90, rare 100/150/220/320, unique 400/550/750/1000. Vendor buy price = 4 × sell price. Loot box prices: basic 150, premium 500. Match rewards: GOLD_PER_MATCH 25, GOLD_WIN_BONUS 35, LOOTBOX_WIN_CHANCE 0.15 (win-only, rolls `lootbox_basic` weights for free, item lands in stash and is surfaced in the duel-ended payload).
- Vendor: 6 slots, deterministic per (user, UTC day) via a seeded PRNG in shared (`vendorStockFor`) — basics and magics only, item level bands centered on the account's highest character level; each slot purchasable once per day (`vendor_purchases` table).
- Loot box / match-drop rarity comes from the live `drop_tables` rows (admin-tuned); `unique` rolls with no eligible unique for the slot/band fall back to rare (Phase 1 rule; uniques are eligible from loot boxes and match drops only, never vendor).
- **Live-verification rule (hard, from the Phase 1 incident):** every DB verification script must include at least one plain *authenticated non-admin* read per touched table — service-role and DEFINER paths bypass RLS and prove nothing about it.
- Migrations via the established user-run management-API script flow. Ephemeral-user testing pattern as before (username metadata required; full cleanup).
- Pixel theme; XSS discipline; no new dependencies. Suites at plan time: client 69, server 261 — stay green and grow.

---

### Task 1: Shared economy module + affix slot restriction

**Files:**
- Create: `shared/src/economy.ts` (export via index barrel)
- Modify: `shared/src/items.ts` (move_speed_pct → leggings-only rolls)
- Test: `server/tests/economy.test.ts`; extend `server/tests/items.test.ts`

**Interfaces (Produces):**
```ts
export const GOLD_PER_MATCH = 25;
export const GOLD_WIN_BONUS = 35;
export const LOOTBOX_WIN_CHANCE = 0.15;
export const LOOTBOX_PRICES = { basic: 150, premium: 500 } as const;
export type LootboxTier = keyof typeof LOOTBOX_PRICES;
export const SELL_PRICES: Record<ItemRarity, [number, number, number, number]>; // per band [1,4,7,10]
export function sellPriceFor(rarity: ItemRarity, levelReq: number): number;    // band lookup; bespoke unique levels round DOWN to nearest band
export function vendorBuyPrice(rarity: ItemRarity, levelReq: number): number;  // 4x sell
export type VendorSlot = { base: ItemBase; rarity: 'basic' | 'magic'; affixes: RolledAffix[]; price: number };
export function vendorStockFor(userId: string, utcDay: string, maxCharLevel: number): VendorSlot[]; // 6 slots, deterministic (mulberry32 over a string hash of userId+utcDay)
export function rollLootboxItem(tier: LootboxTier, weights: Record<ItemRarity, number>, maxCharLevel: number, rng?: () => number): { base: ItemBase; rarity: ItemRarity; affixes: RolledAffix[]; levelReq: number };
export function rollMatchDropItem(weights: Record<ItemRarity, number>, maxCharLevel: number, rng?: () => number): ReturnType<typeof rollLootboxItem>; // shared internals with above
```
- Affix restriction: `rollItem` must never roll `move_speed_pct` on non-leggings bases (implement as per-affix allowed-slots metadata in the pool, not a special case).
- Unique handling in rolls: when the rarity lands `unique`, pick uniformly among `UNIQUE_ITEMS` whose base slot/band is eligible for `maxCharLevel`; none eligible → downgrade to rare (log-free, deterministic under rng).

- [ ] **Step 1: Failing tests.** Binding cases: SELL_PRICES exact table lookups incl. band rounding (level 7 unique → band index 2); vendor determinism (same user+day ⇒ identical stock; different day ⇒ different; 6 slots; basic/magic only; prices = 4× sell; bands within ±1 of the level's band); move_speed never rolls off-leggings across 300 seeded rare rolls on rings/amulets/helmets but does roll on leggings; lootbox roll respects weights deterministically, unique-fallback-to-rare when no unique eligible at band 1; all functions pure under injected rng.
- [ ] **Step 2: Run to verify failure. Step 3: Implement. Step 4: Suites green, tsc clean both.**
- [ ] **Step 5: Commit** — `feat(shared): economy constants, pricing, vendor stock, loot rolls; move-speed affix restricted to leggings`.

---

### Task 2: Migration + gold/sell RPCs + live verification

**Files:**
- Create: `supabase/migrations/20260731040000_economy.sql`
- Modify: `client/src/supabase.ts` (fetchGold via profile, sellItem, fetchVendorPurchases)

**Migration content (exact requirements):**
- `alter table profiles add column if not exists gold integer not null default 0 check (gold >= 0);`
- `vendor_purchases(user_id uuid, utc_day date, slot_index int, primary key (user_id, utc_day, slot_index))`, RLS owner-read; insert only via game-server service role.
- `sell_item(p_item_id uuid)`: DEFINER, pinned path; item owned by `auth.uid()`, `equipped_by IS NULL`, `source <> 'starter'` (raise 'starter gear cannot be sold'); price from a SQL `sell_price(rarity text, level_req int)` immutable function mirroring shared SELL_PRICES (drift-contract-tested — the test parses this migration's CASE table like the appearance contract test); delete item, increment gold, return the price.
- `spend_gold(p_amount int)`: DEFINER; `p_amount > 0`; atomic `update profiles set gold = gold - p_amount where user_id = auth.uid() and gold >= p_amount`; raise 'insufficient gold' when no row updated. (Game server calls this with the USER'S JWT via PostgREST before service-role granting purchases — never trusts its own math for the debit.)
- `credit_match_result` v2: CREATE OR REPLACE preserving current XP behavior, adding `p_gold int` credited to the character owner's profile (validate `p_gold between 0 and 200` as sanity).
- [ ] **Steps:** contract test in `server/tests/economy.test.ts` (SQL↔shared price parity, key-set equality style); client helpers; apply script (`apply-economy-migration.sh`, NOT run) with sanity checks (column, table, 3 functions, sell_price parity spot-check via SQL SELECTs); extended live-verify script `verify-economy.mjs` (NOT run) covering: authed non-admin reads of profiles.gold and vendor_purchases (**the RLS regression rule**), sell own unequipped magic item credits exact price, sell starter rejected, sell equipped rejected, sell other's item rejected, spend_gold happy/insufficient/negative, credit_match_result gold arithmetic; ephemeral users, cleanup.
- [ ] Return DONE_WITH_CONCERNS with apply pending; controller runs the user-apply + verification flow.
- [ ] **Commit** — `feat(db): gold, selling, vendor purchases, match gold crediting`.

---

### Task 3: Game-server economy endpoints + match rewards

**Files:**
- Create: `server/src/economy/routes.ts` (Express router), `server/src/economy/service.ts`
- Modify: `server/src/index.ts` (mount router; settleMatchEnd integration)
- Test: `server/tests/economy-service.test.ts`

**Requirements:**
- Auth middleware: `Authorization: Bearer <user JWT>` → `supabase.auth.getUser`; 401 otherwise. Endpoints: `GET /economy/vendor` (derive stock via shared `vendorStockFor` using the account's max character level; annotate slots already purchased today from `vendor_purchases`); `POST /economy/vendor/buy {slotIndex}` (re-derive stock server-side, reject purchased/invalid slot, debit via `spend_gold` **called with the user's JWT** — construct a PostgREST client per-request with the user's token so the RPC's auth.uid() is the buyer — then service-role: insert item `source='vendor'` + record vendor_purchases; on insert failure AFTER debit, refund via service-role gold increment and 500 — document the two-step consistency tradeoff); `POST /economy/lootbox/open {tier}` (validate tier, debit price via user-JWT spend_gold, fetch live `drop_tables` weights for the tier, `rollLootboxItem`, service-role insert `source='lootbox'`, return the item row; same refund-on-failure rule).
- settleMatchEnd: for each authed player, gold = GOLD_PER_MATCH (+ GOLD_WIN_BONUS if won) via `credit_match_result` v2; on WIN additionally roll LOOTBOX_WIN_CHANCE — success rolls `match_drop` weights via `rollMatchDropItem`, service-role inserts `source='drop'`, and the duel-ended payload's matchResults entry gains `{ goldGained, droppedItem? }` (droppedItem = the validated ItemRow). Guests get nothing (unchanged).
- Tests: middleware 401; vendor stock stability + purchased-slot annotation logic; buy path with mocked supabase clients (unit-level: assert debit-before-grant ordering and refund-on-failure); lootbox tier validation; settleMatchEnd payload shape with gold/drop (follow existing settleMatchEnd test conventions if any; otherwise unit-test the service functions and leave socket-level assertions to the controller's live sweep).
- [ ] **Commit** — `feat(server): vendor, loot box, and match-reward economy endpoints`.

---

### Task 4: Client economy data + gold surfacing

**Files:**
- Modify: `client/src/supabase.ts` (economy fetch helpers hitting the game-server endpoints with the session JWT), `client/src/lobby/LobbyUI.ts` (gold pill on home), `client/src/main.ts` (thread gold refresh; duel-ended handling of goldGained/droppedItem into the result screen), `client/src/lobby/LobbyUI.ts` result screen (gold line + dropped-item card)
- [ ] Gold pill (pixel-theme, coin glyph `fa-coins`) on lobby home and refreshed after matches/shop/sell actions; result screen shows "+N gold" and, when present, the dropped item as a rarity-colored card ("WAR SPOILS").
- [ ] **Commit** — `feat(client): gold display and match-reward surfacing`.

---

### Task 5: Shop screen (vendor + loot boxes)

**Files:**
- Create: `client/src/items/ShopScreen.ts`; wire a "⚖ Shop" lobby button (authed-only), main.ts show/close-refresh cycle
- [ ] Left: vendor's 6 daily slots (rarity-colored cards, price tags, SOLD overlay on purchased; details panel reuse from GearScreen patterns); buy → optimistic gold decrement + card SOLD, reconcile; insufficient gold → inline notice. Right: the two loot boxes (basic/premium) with prices; buy → server roll → reveal the item card (simple flash-in, no animation system) + "sent to stash". Countdown note "new stock at midnight UTC".
- [ ] Double-submit guards from the start (the AdminScreen lesson). Pure helpers (e.g. slot-affordability) exported + tested if any emerge meaty.
- [ ] **Commit** — `feat(client): shop screen — daily vendor and loot boxes`.

---

### Task 6: Gear screen selling

**Files:**
- Modify: `client/src/items/GearScreen.ts`
- [ ] Sell affordance on stash items (not equipped ones): price line in the details panel ("Sell: N gold") and a Sell button; starter items show "Starter gear — cannot be sold" instead. Uniques get the confirm dialog (st-confirm pattern). Optimistic: remove card + bump gold display, reconcile; revert on error. Double-submit guard on the button.
- [ ] **Commit** — `feat(client): sell items from the stash`.

---

### Task 7: Final verification sweep (controller)

- [ ] Full suites + build + dist commit.
- [ ] Live pass: apply + verify scripts (with the authed-read regression checks); economy loop end-to-end via harness: ephemeral user → win a match vs guest bot → gold credited + occasional drop (force by temporarily setting LOOTBOX_WIN_CHANCE? No — verify via credit path assertions and a drop-table-tweak: admin-set match_drop to 100% basic momentarily, restore after) → vendor stock deterministic + buy → sell the bought item → lootbox open. Starter-sell rejection live. Browser pass of Shop/sell UI if an authed session is available; otherwise delegate visuals to the user with a checklist.
- [ ] Ledger notes, done.

---

## Self-review notes
- Spec coverage: gold/selling/vendor/lootboxes/match rewards ↔ Tasks 1–6; both preconditions closed (T1 slot restriction, T2 starter-unsellable); drop_tables consumed (T3); admin drop-rate editor now live-effective.
- Type consistency: VendorSlot/rollLootboxItem shapes defined once in T1, consumed by T3 (server) and T4/T5 (client via endpoint JSON — the endpoint returns validated ItemRow for created items).
- Judgment calls bounded: two-step debit/grant with refund documented (T3); vendor per-user-daily seed; unique-from-vendor excluded; band rounding for bespoke unique levels.
- Execution precondition: clean tree at branch time (currently clean post-merge).
