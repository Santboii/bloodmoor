# Itemization Phase 1 (Core Items) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the core item system: account-owned items with D2-style rolled affixes, starter gear, a stash/equip UI, server-authoritative stats + talent grants in combat, and an admin page with grant tooling and the drop-rate editor.

**Architecture:** Shared TS manifests (`ITEM_BASES`, `UNIQUE_ITEMS`, `AFFIX_POOL`) + a pure roll/compute engine mirror the `SKILL_NODES`/appearance patterns; an `items` table with SECURITY DEFINER RPCs mirrors `update_appearance`/`refund_skill_node`; the server folds equipped items into a per-player StatBlock + effective talent ranks stamped into `PlayerState`, exactly like the appearance pipeline; UI follows the talent tree's pinned-details + optimistic-RPC patterns.

**Tech Stack:** TypeScript monorepo (client Vite/Three.js, server Node/socket.io, shared @arena/shared), Supabase (Postgres, RLS, RPCs), pixel theme kit, Font Awesome icons.

**Spec:** `docs/superpowers/specs/2026-07-30-itemization-economy-design.md` — binding. Read its Constraints section.

## Global Constraints

- Server authority: equipped items are loaded server-side at join; the StatBlock and effective ranks in `PlayerState` are the only stat sources combat may read. The client never sends stats.
- Base slots: `weapon|helmet|armor|leggings|ring|amulet`. Equip positions: `weapon|helmet|armor|leggings|ring1|ring2|amulet`. `items.slot` = base slot; `items.equipped_slot` = position (null when stashed).
- Rarity affix counts: basic 0, magic 1–2, rare 3–5 (≤1 talent affix), unique hand-authored (≤2 talent affixes).
- Talent affixes: class-scoped application — ranks apply only if the equipping character's class owns the tree (mage: `fire`+`utility`; ranger: `archer`+`archer_utility`); off-class affixes are inert and render dimmed. Rolls weight 2:1 toward the trees of classes that can equip the item.
- Effective rank = tree rank + applied item ranks; diminishing via shared `effectAtRank`; element conflict resolved by highest effective rank, ties burn > freeze > poison.
- Affix tier ranges and drop-table seeds: exactly the spec's tables. Item level bands: 1/4/7/10.
- All mutations via SECURITY DEFINER RPCs, pinned `search_path`, `auth.uid()` ownership (admin RPCs check `profiles.is_admin`). UI gating is cosmetic; the DB enforces.
- Migrations applied via the established management-API script flow (user-run; controller packages the script). Live RPC verification uses ephemeral `@example.invalid` users (admin.createUser requires `user_metadata.username`), always cleaned up.
- Pixel theme kit for UI; player-controlled strings only ever via `textContent`.
- No new dependencies. Suites stay green: client 43, server 235 at plan time, and grow.

---

### Task 1: Shared item manifests, roll engine, loadout math

**Files:**
- Create: `shared/src/items.ts`
- Modify: `shared/src/index.ts` (add `export * from './items.js';`)
- Test: `server/tests/items.test.ts`

**Interfaces (Produces):**
```ts
export type ItemRarity = 'basic' | 'magic' | 'rare' | 'unique';
export type ItemBaseSlot = 'weapon' | 'helmet' | 'armor' | 'leggings' | 'ring' | 'amulet';
export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'leggings' | 'ring1' | 'ring2' | 'amulet';
export type AffixId =
  | 'max_health' | 'max_mana' | 'damage_pct' | 'cast_speed_pct'
  | 'move_speed_pct' | 'mana_regen_pct' | 'talent';
export type RolledAffix = { id: AffixId; value: number; node?: NodeId }; // node only for 'talent'
export type ItemBase = {
  id: string; slot: ItemBaseSlot; name: string; icon: string;
  classRestriction?: CharacterClass;        // weapons only
  itemLevel: 1 | 4 | 7 | 10;                // band; also the level_req
  implicit: RolledAffix;                    // fixed value, no rolling
};
export type UniqueItem = {
  id: string; baseId: string; name: string; flavor: string;
  affixes: RolledAffix[]; levelReq: number;
};
export type ItemRow = {                      // DB shape, snake_case at the boundary
  id: string; base_id: string; rarity: ItemRarity; affixes: RolledAffix[];
  level_req: number; equipped_by: string | null; equipped_slot: EquipSlot | null;
  slot: ItemBaseSlot;
};
export type StatBlock = {
  maxHp: number; maxMana: number; damageMult: number;
  cooldownMult: number; moveSpeedMult: number; manaRegenMult: number;
};
export const BASE_STAT_BLOCK: StatBlock; // {750, 500, 1, 1, 1, 1}
export function rollItem(base: ItemBase, rarity: ItemRarity, rng?: () => number): RolledAffix[];
export function rollRarity(weights: Record<ItemRarity, number>, rng?: () => number): ItemRarity;
export function classOwnsTree(cls: CharacterClass, node: NodeId): boolean;
export function computeLoadout(items: ItemRow[], cls: CharacterClass): {
  statBlock: StatBlock; talentRanks: Map<NodeId, number>;
};
export function validateItemRow(row: unknown): ItemRow | null; // defensive DB-read guard
export const ITEM_BASES: ItemBase[];
export const UNIQUE_ITEMS: UniqueItem[];
export const AFFIX_TIERS: Record<AffixId, [number, number][]>; // per band, [min,max]; talent = rank range
```

- [ ] **Step 1: Write failing tests** (`server/tests/items.test.ts`) — the binding behaviors:

```ts
import { describe, it, expect } from 'vitest';
import {
  ITEM_BASES, UNIQUE_ITEMS, AFFIX_TIERS, rollItem, rollRarity, computeLoadout,
  classOwnsTree, validateItemRow, BASE_STAT_BLOCK, MAX_HP, MAX_MANA,
} from '@arena/shared';

const seeded = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('manifests', () => {
  it('every base has a valid slot, band, and implicit', () => {
    for (const b of ITEM_BASES) {
      expect([1, 4, 7, 10]).toContain(b.itemLevel);
      expect(b.implicit.value).toBeGreaterThan(0);
      if (b.slot === 'weapon') expect(b.classRestriction).toBeDefined();
      else expect(b.classRestriction).toBeUndefined();
    }
  });
  it('every unique references a real base and respects the 2-talent cap', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(ITEM_BASES.some(b => b.id === u.baseId)).toBe(true);
      expect(u.affixes.filter(a => a.id === 'talent').length).toBeLessThanOrEqual(2);
    }
  });
});

describe('rollItem', () => {
  it('respects rarity affix counts and the rare talent cap over many seeds', () => {
    const base = ITEM_BASES.find(b => b.slot === 'ring')!;
    for (let s = 0; s < 200; s++) {
      const rng = seeded([((s * 37) % 100) / 100, ((s * 61) % 100) / 100, ((s * 13) % 100) / 100, ((s * 7) % 100) / 100, ((s * 91) % 100) / 100, ((s * 53) % 100) / 100]);
      const magic = rollItem(base, 'magic', rng);
      expect(magic.length).toBeGreaterThanOrEqual(1); expect(magic.length).toBeLessThanOrEqual(2);
      const rare = rollItem(base, 'rare', rng);
      expect(rare.length).toBeGreaterThanOrEqual(3); expect(rare.length).toBeLessThanOrEqual(5);
      expect(rare.filter(a => a.id === 'talent').length).toBeLessThanOrEqual(1);
      const ids = rare.filter(a => a.id !== 'talent').map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length); // no duplicate affix types
    }
  });
  it('rolled values stay inside the band range', () => {
    const base = ITEM_BASES.find(b => b.itemLevel === 7 && b.slot === 'amulet')!;
    for (let s = 0; s < 100; s++) {
      const rng = seeded([(s % 100) / 100, ((s * 31) % 100) / 100, ((s * 17) % 100) / 100, ((s * 71) % 100) / 100]);
      for (const a of rollItem(base, 'rare', rng)) {
        if (a.id === 'talent') continue;
        const [lo, hi] = AFFIX_TIERS[a.id][2]; // band index for level 7
        expect(a.value).toBeGreaterThanOrEqual(lo);
        expect(a.value).toBeLessThanOrEqual(hi);
      }
    }
  });
  it('basic rolls no affixes', () => {
    expect(rollItem(ITEM_BASES[0], 'basic', seeded([0.5]))).toEqual([]);
  });
});

describe('computeLoadout', () => {
  const mk = (over: Partial<ItemRowLike>) => ({
    id: 'x', base_id: ITEM_BASES[0].id, rarity: 'magic', affixes: [],
    level_req: 1, equipped_by: 'c', equipped_slot: 'helmet', slot: 'helmet', ...over,
  });
  it('starts from the base block and folds affixes + implicits', () => {
    const items = [mk({ affixes: [{ id: 'max_health', value: 40 }, { id: 'damage_pct', value: 5 }] })];
    const { statBlock } = computeLoadout(items as never, 'mage');
    expect(statBlock.maxHp).toBeGreaterThanOrEqual(MAX_HP + 40); // implicit may add more
    expect(statBlock.damageMult).toBeCloseTo(1.05, 5);
  });
  it('applies on-class talent affixes and ignores off-class ones', () => {
    const items = [mk({ affixes: [
      { id: 'talent', value: 2, node: 'fire.cataclysm' },
      { id: 'talent', value: 1, node: 'archer.barrage' },
    ] })];
    const { talentRanks } = computeLoadout(items as never, 'mage');
    expect(talentRanks.get('fire.cataclysm')).toBe(2);
    expect(talentRanks.has('archer.barrage')).toBe(false);
  });
  it('classOwnsTree maps both classes correctly', () => {
    expect(classOwnsTree('mage', 'fire.meteor')).toBe(true);
    expect(classOwnsTree('mage', 'utility.teleport')).toBe(true);
    expect(classOwnsTree('mage', 'archer.barrage')).toBe(false);
    expect(classOwnsTree('ranger', 'archer_utility.evade')).toBe(true);
  });
});

describe('rollRarity + validateItemRow', () => {
  it('rollRarity respects weights deterministically', () => {
    const w = { basic: 70, magic: 24, rare: 5.5, unique: 0.5 };
    expect(rollRarity(w, () => 0.0)).toBe('basic');
    expect(rollRarity(w, () => 0.71)).toBe('magic');
    expect(rollRarity(w, () => 0.9999)).toBe('unique');
  });
  it('validateItemRow rejects malformed rows and passes real ones', () => {
    expect(validateItemRow(null)).toBeNull();
    expect(validateItemRow({ base_id: 'nope' })).toBeNull();
  });
});
```
(Adapt the `ItemRowLike` helper typing as needed — the assertions are the contract.)

- [ ] **Step 2: Run to verify failure** — `cd server && npx vitest run tests/items.test.ts` → FAIL (missing exports).

- [ ] **Step 3: Implement `shared/src/items.ts`.** Content requirements:
  - `AFFIX_TIERS` exactly per the spec table; band index = [1,4,7,10].indexOf(itemLevel).
  - `ITEM_BASES` initial catalog (12): weapons `apprentice_staff`(mage, L1, implicit damage_pct 2), `gnarled_staff`(mage, L7, damage_pct 6), `short_bow`(ranger, L1, damage_pct 2), `war_bow`(ranger, L7, damage_pct 6); helmets `leather_cap`(L1, max_health 15), `iron_helm`(L7, max_health 60); armor `padded_tunic`(L1, max_health 25), `scale_mail`(L7, max_health 90); leggings `cloth_pants`(L1, max_health 10), `mail_leggings`(L7, max_health 45); `bone_ring`(L1, max_mana 10); `moon_amulet`(L4, max_mana 25). Icons: FA (`fa-staff-snake`, `fa-bow-arrow`→fallback `fa-crosshairs` if not in FA 6.5 free — verify at implementation, `fa-hat-wizard`, `fa-helmet-safety`, `fa-shirt`, `fa-socks`, `fa-ring`, `fa-gem`).
  - `UNIQUE_ITEMS` (2 to start): `emberheart` (base `moon_amulet`, level 7: max_mana 60, damage_pct 8, talent +2 `fire.volatile_ember`, talent +1 `fire.searing_heat`, flavor text) and `windrunner_band` (base `bone_ring`, level 7: move_speed_pct 6, cast_speed_pct 5, talent +2 `archer.barrage`, flavor text).
  - `rollItem`: count by rarity (magic 1–2, rare 3–5 via rng), draw without replacement from non-talent pool; talent affix drawn with weight such that ~1 in 4 rare rolls includes one (exact weight constant, documented); talent node chosen 2:1 weighted toward trees of classes that can equip the base (weapon: its class's trees only make sense — still allow any, weighting handles taste); value uniform int in band range.
  - `computeLoadout`: fold implicits + affixes of all equipped items into a copy of `BASE_STAT_BLOCK` (`maxHp/maxMana` additive; `*_pct` multiplicative as `1 + pct/100` products; `cooldownMult = 1 - cast_speed_pct/100` products, floor 0.5); talent map sums only `classOwnsTree` nodes.
  - `classOwnsTree`: prefix match on the node's tree segment.
  - `validateItemRow`: shape + manifest checks (base exists, rarity valid, slot matches base, affix ids valid, talent affixes carry a real node) — returns null on any failure; used defensively at every DB read.
- [ ] **Step 4: Tests pass; both `tsc --noEmit` clean.**
- [ ] **Step 5: Commit** — `feat(shared): item manifests, affix roll engine, loadout math`.

---

### Task 2: DB migration + item RPCs + live verification

**Files:**
- Create: `supabase/migrations/20260731000000_items.sql`
- Modify: `client/src/supabase.ts` (typed helpers: `fetchItems`, `equipItem`, `unequipItem`; admin: `adminFetchAllItems`, `adminGrantItem`, `adminDeleteItem`, `fetchDropTables`, `adminUpdateDropTable`; `fetchProfile` gains `is_admin`)

**Interfaces (Produces):** RPCs `equip_item(p_item_id, p_character_id, p_slot)`, `unequip_item(p_item_id)`, `admin_grant_item(p_user_id, p_base_id, p_rarity, p_affixes, p_level_req, p_slot)`, `admin_delete_item(p_item_id)`, `admin_update_drop_table(p_context, p_weights)`, plus `grant_starter_gear(p_character_id)` invoked from `create_character`.

- [ ] **Step 1: Write the migration.** Exact requirements (full SQL in the migration file):
  - `alter table profiles add column if not exists is_admin boolean not null default false;`
  - `items` table per the spec row (uuid pk default `gen_random_uuid()`, `user_id` references auth.users, `equipped_by` uuid references characters **on delete set null**, timestamps). When `equipped_by` is set null by character deletion, `equipped_slot` goes stale — add a trigger or handle in the delete-character RPC to null both. Index on `(user_id)`, partial index on `(equipped_by) where equipped_by is not null`.
  - RLS: enable; policy `items_owner_read` (`user_id = auth.uid()`), policy `items_admin_read` (exists profiles where id = auth.uid() and is_admin). No insert/update/delete policies — mutations only via RPCs.
  - `drop_tables(context text primary key, weights jsonb not null, updated_at timestamptz default now())` seeded with the spec's three rows. RLS: readable by authenticated; mutation via admin RPC only.
  - `equip_item`: SECURITY DEFINER, pinned search_path; checks: caller owns item and character; item not already equipped by another character; `p_slot` valid for the item's base slot (ring → ring1|ring2, others exact); character's level ≥ item level_req (join characters.level); class restriction (weapon staff↔mage etc. — pass the class check as data: the RPC receives `p_expected_class text` from the client manifest? NO — keep authority: store `class_restriction` on grant in a column, set from the manifest at grant time, so SQL can check without knowing the manifest). Then: unequip any item currently in that slot for that character (set null), set `equipped_by`/`equipped_slot`.
  - Note: add `class_restriction text null` column to `items`, populated at grant time from the manifest — the SQL check is `class_restriction is null or class_restriction = (select class from characters where id = p_character_id)`.
  - `unequip_item`: ownership; null both fields.
  - `admin_*` RPCs: `is_admin` check first; `admin_grant_item` inserts with `source = 'admin'`; `admin_update_drop_table` validates the four keys are non-negative numbers, at least one positive.
  - `grant_starter_gear(p_character_id)`: inserts + equips the 4 Crude basics matching the character's class weapon (staff/bow), `source='starter'`, `level_req=1`; called at the end of `create_character` (CREATE OR REPLACE it, preserving current behavior).
- [ ] **Step 2: Client helpers** in `client/src/supabase.ts`, matching existing error conventions; `fetchItems` validates every row through `validateItemRow` and drops invalid ones with a `console.warn`.
- [ ] **Step 3: Package the apply script** (controller pattern: `apply-items-migration.sh` with a sanity query: items table exists, 3 drop_tables rows, 7 functions) — the CONTROLLER hands it to the user; the implementer STOPS with the script written and returns status noting the apply is pending (NEEDS_CONTEXT is wrong here — return DONE_WITH_CONCERNS and list "migration not yet applied" as the concern).
- [ ] **Step 4: After the user applies: live verification** with two ephemeral users (pattern from the customization workstream): grant → equip (own) ✓; equip other's item ✗; equip under-level ✗; wrong-class weapon ✗; ring1/ring2 fill + swap ✓; unequip ✓; non-admin calling `admin_grant_item` ✗; drop-table update as admin ✓ (then restore seeds). Clean up users. This step may be resumed after the apply lands.
- [ ] **Step 5: `tsc` clean, client suite green. Commit** — `feat(db): items schema, equip/unequip and admin RPCs, drop tables`.

---

### Task 3: Server combat integration — StatBlock + effective ranks

**Files:**
- Modify: `server/src/skills/loadSkills.ts` (load equipped items alongside skills/appearance)
- Modify: `server/src/rooms/Room.ts` (loadout map + PlayerInit + remap)
- Modify: `server/src/gameloop/StateAdvancer.ts` (stamp StatBlock + effective ranks; consume in tick)
- Modify: `server/src/index.ts` (join/rejoin storage)
- Modify: `shared/src/types.ts` (`PlayerState` gains `maxHp`, `maxMana`, `statBlock`? — see step 2)
- Test: `server/tests/items-combat.test.ts`

- [ ] **Step 1: Failing tests.** Cases (write with real `makeInitialState`/`advanceState` calls per existing test conventions):
  - StatBlock stamps: player with +40 maxHp item spawns at hp 790 and `maxHp` 790; guest spawns at 750/500 baseline.
  - `manaRegenMult` 1.2 → after N ticks mana grew 20% faster (compare two players).
  - `cooldownMult` 0.9 → casting fireball sets cooldown `round(30*0.9)`.
  - `damageMult` scales fireball damage bounds (hook level: wherever damage is computed — assert via a controlled hit).
  - `moveSpeedMult` 1.06 → position delta per tick 6% larger.
  - Effective ranks: item `+2 fire.cataclysm` on a mage with tree rank 3 → modifiers computed at rank 5; oskill: item grants `fire.meteor` to a mage without the node → cast gate allows spell 3; element conflict: tree burn 2 + item freeze 3 → element freeze.
- [ ] **Step 2: Implement.**
  - `loadSkillsForCharacter` → also select the character's equipped items (`items` where `equipped_by = characterId`), validate rows via `validateItemRow`, return `items: ItemRow[]`. Compute nothing here.
  - `Room` stores `loadouts: Map<socketId, ItemRow[]>`; `remapPlayer` carries it; `startMatch` passes items into `PlayerInit`.
  - `makeInitialState`: `const { statBlock, talentRanks } = computeLoadout(items, charClass)`; effective skills = merge(skillSets ranks, talentRanks) — the merged map REPLACES the plain skill map in room.skillSets flow for match purposes (merge server-side at startMatch into the per-match `skillSets` the tick loop already consumes; do NOT mutate the persistent room map — build the match copy). Stamp `hp: statBlock.maxHp`, `mana: statBlock.maxMana`, and `PlayerState.maxHp/maxMana` (numbers, not the whole block) plus `statMults: { damage, cooldown, moveSpeed, manaRegen }` (one object field on PlayerState — wire cost is ~4 numbers, static per match).
  - Tick consumption: mana regen `* p.statMults.manaRegen` and clamp to `p.maxMana`; HP clamps to `p.maxHp`; cooldown assignment `Math.round(cooldownTicks * p.statMults.cooldown)`; movement passes `speedMultiplier * p.statMults.moveSpeed`; damage application sites multiply by the ATTACKER's `damage` mult (fireball/arrow/wall/meteor/rain/burn/poison — grep every damage write; the attacker is the owner id).
  - HUD/client: effective spell set already reaches the client because the cast gate + `SPELL_BINDINGS` drive the HUD from owned nodes — Task 4 wires the client side.
- [ ] **Step 3: Full server suite green (grow by the new file). Both tsc clean.**
- [ ] **Step 4: Commit** — `feat(server): equipped items drive stats and effective talents in combat`.

---

### Task 4: Client loadout — HUD spells + spell modifiers from items

**Files:**
- Modify: `client/src/main.ts` (`refreshLoadout` merges equipped-item talent ranks; guest slot fallback unchanged)
- Modify: `client/src/hud/HUD.ts` (no structural change expected; verify slots build from the merged set)

- [ ] **Step 1:** In `refreshLoadout`, fetch the character's equipped items (`fetchItems` filtered to `equipped_by === characterId`), `computeLoadout(items, charClass)`, union the granted spell nodes into the node set used for `spellsFromNodes`/`elementFromNodes` (element: highest-effective-rank rule — reuse a shared helper if Task 3 exports one; otherwise implement per spec and keep server/client identical by putting `deriveElement(effRanks)` in shared during Task 3 — Produces note for Task 3: export `deriveElement`).
- [ ] **Step 2:** Manual check deferred to Task 7 (controller). `tsc` + client suite green.
- [ ] **Step 3: Commit** — `feat(client): HUD and loadout derive from equipped items`.

---

### Task 5: Stash & equip UI

**Files:**
- Create: `client/src/items/GearScreen.ts`
- Modify: `client/src/lobby/LobbyUI.ts` (add "Gear" button on home, callback wiring)
- Modify: `client/src/main.ts` (instantiate + show/hide wiring, refresh loadout on close — same pattern as the skill tree's close-resolver)
- Test: `client/tests/GearScreen.test.ts` (pure helpers)

- [ ] **Step 1:** Build `GearScreen` (pixel theme, `.st-overlay`-style full screen):
  - Left column: paper-doll — 7 equip positions with slot icons; occupied slots show the item card (rarity-colored border: white `#e8dff5`, blue `#4a6fc4`, yellow `#ddb84a`, gold `#ffb347`).
  - Right column: pinned details panel (top) + account stash grid (scroll, all unequipped items, newest first).
  - Details panel: name (rarity color), base name + slot, implicit, affix list (talent affixes show node name; off-class ones dimmed with "(inert for this class)"), level req (red if unmet), class restriction (red if mismatched).
  - Interactions: hover → details (sticky, tree pattern); click stash item → equip to its slot (rings: first empty else ring2 swap); click equipped item → unequip to stash. Optimistic with reconcile-on-error (skill-tree pattern verbatim).
  - Pure helpers exported for tests: `ringTargetSlot(equipped: EquipSlot[]): 'ring1' | 'ring2'`, `canEquip(item, charLevel, charClass): { ok: boolean; reason?: string }`.
- [ ] **Step 2: Tests** for the two helpers (ring fill/swap order; level and class rejections with reasons).
- [ ] **Step 3:** Wire the lobby "Gear" button (next to Skills) with the show/close-refresh cycle.
- [ ] **Step 4:** `tsc` + suite green. **Commit** — `feat(client): gear screen with paper-doll and account stash`.

---

### Task 6: Admin page

**Files:**
- Create: `client/src/admin/AdminScreen.ts`
- Modify: `client/src/lobby/LobbyUI.ts` (admin button, rendered only when `fetchProfile().is_admin`)
- Modify: `client/src/main.ts` (wiring)

- [ ] **Step 1:** Build `AdminScreen` with four tabs (pixel theme):
  1. **Items**: `adminFetchAllItems()` table — owner (username via profiles join in the helper), base, rarity, slot, source, equipped-by; filters (rarity, slot, source) client-side; per-row Delete (confirm dialog → `adminDeleteItem`).
  2. **Manifests**: read-only rendering of `ITEM_BASES` and `UNIQUE_ITEMS`.
  3. **Grant**: pickers (target account by username — helper resolves via profiles; base; rarity; for non-unique: "roll" preview using `rollItem` client-side, re-rollable, granted exactly as previewed via `admin_grant_item(p_affixes)`; for unique: pick from `UNIQUE_ITEMS`).
  4. **Drop rates**: per context, four numeric weight inputs + live normalized percentage preview; Save → `adminUpdateDropTable`; Reset-to-seed button (writes the spec's seed values).
- [ ] **Step 2:** Non-admin behavior verified: button absent AND direct RPC calls fail server-side (assert in Task 2's live verification — cross-reference, nothing new here).
- [ ] **Step 3:** `tsc` + suite green. **Commit** — `feat(client): admin screen — item DB, grant tool, drop-rate editor`.

---

### Task 7: Final verification sweep (controller)

- [ ] **Step 1:** Full suites both packages + `vite build`; commit dist refresh.
- [ ] **Step 2:** Controller visual pass: create a fresh character → Crude starter set granted and equipped (paper-doll shows 4 items); admin grant a rare ring → appears in stash → equip → details panel correct; headless authed bot match verifies stamped `maxHp`/mults and an oskill grant end-to-end (bot-authed harness pattern with an item-equipped ephemeral user); admin drop-rate edit persists across reload; non-admin sees no admin button.
- [ ] **Step 3:** Ledger notes for anything deferred; done.

---

## Self-review notes
- Spec coverage: item model → T1/T2; rarity/affixes → T1; starter gear → T2; level/class gates → T2 (SQL) + T5 (UI); oskills/class scoping/element rule → T1/T3/T4; StatBlock combat → T3; stash UI → T5; admin incl. drop-rate editor → T2 (RPCs) + T6 (UI); drop tables seeded → T2. Economy/visuals: separate plans per spec.
- Type consistency: `ItemRow`/`StatBlock`/`computeLoadout`/`deriveElement` defined in T1 (T3 adds `deriveElement` export — flagged in both tasks); `EquipSlot` used by T2 SQL constraints and T5 helpers.
- Known judgment calls bounded: talent-affix frequency constant (documented in T1), FA icon fallbacks (verified at implementation), damage-mult application enumerated by grep in T3.
- Execution precondition: the working tree currently holds five uncommitted feature batches — they MUST be committed (or explicitly shelved) before the execution branch is created.
