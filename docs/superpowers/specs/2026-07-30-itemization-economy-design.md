# Itemization & Economy — Design

Approved 2026-07-30. Supersedes the Workstream C sketch in
`docs/superpowers/plans/2026-07-29-pixel-aesthetic-customization-items.md`.

## Sequencing (locked)

Three plans, executed in order; each ships something playable:

1. **Phase 1 — Core itemization**: schema, affix system, starter gear,
   stash/equip UI, stats + talent grants in combat, admin page (including
   drop-rate editor). This spec's primary subject.
2. **Phase 2 — Economy**: gold, selling, vendor, loot boxes, match rewards.
   Consumes Phase 1's drop tables; summarized here, planned separately.
3. **Phase 3 — Visible gear**: equipped items render as LPC sprite layers.
   Summarized here, planned separately.

## Item model

- **Ownership**: items are **account-owned** (`user_id`); the stash is shared
  across the account's characters. `equipped_by` (nullable character id)
  marks equipped items; null = in stash.
- **Slots**: base slots are `weapon`, `helmet`, `armor`, `leggings`,
  `ring`, `amulet`; equip positions are `weapon`, `helmet`, `armor`,
  `leggings`, `ring1`, `ring2`, `amulet` (a nullable `equipped_slot`
  column records the concrete position — rings fill the first empty of
  ring1/ring2). Weapons are class-restricted (staff → mage, bow → ranger);
  all other slots are class-agnostic so cross-class finds matter.
  Rings/amulet are stat-only forever (no sprite representation exists).
- **Base items**: shared TS manifest `ITEM_BASES` (pattern: `SKILL_NODES`) —
  id, slot, display name, class restriction, item-level band, implicit stat
  + range, Font Awesome icon (Phase 1), LPC layer path (Phase 3).
- **DB row** (`items`): `id, user_id, base_id, rarity, affixes jsonb,
  level_req, equipped_by, equipped_slot, slot, source, created_at`.
  `source` ∈ `starter | drop | vendor | lootbox | admin`. `slot` is the
  base slot denormalized for cheap queries; RPCs validate it against the
  manifest. `equipped_by` carries `ON DELETE SET NULL` semantics via the
  delete-character path so removing a character returns its gear to the
  stash rather than orphaning it.

## Rarity

| Rarity | Color | Affixes | Notes |
|---|---|---|---|
| Basic | white | 0 (implicit only) | Starter "Crude" set is level-1 basics |
| Magic | blue | 1–2 rolled | |
| Rare | yellow | 3–5 rolled, ≤1 talent affix | |
| Unique | gold | hand-authored, ≤2 talent affixes | `UNIQUE_ITEMS` manifest: fixed name, curated rolls, flavor text |

## Affix system

D2-style prefix/suffix pools (`AFFIX_POOL` in shared TS). Stats:

| Affix | Kind | Tier ranges (item level 1 / 4 / 7 / 10) |
|---|---|---|
| +max health | suffix | 20–40 / 40–70 / 70–110 / 110–160 |
| +max mana | suffix | 15–30 / 30–50 / 50–80 / 80–120 |
| +% damage | prefix | 2–4 / 4–7 / 7–11 / 11–15 |
| +% cast speed (cooldown reduction) | prefix | 2–3 / 3–5 / 5–8 / 8–10 |
| +% move speed | prefix | 2–3 / 3–4 / 4–6 / 6–8 |
| +mana regen % | suffix | 5–10 / 10–15 / 15–25 / 25–35 |
| +X to [talent] | suffix | +1 / +1 / +1–2 / +1–3 |

Taste rules: one instance of each affix type per item; talent affixes are
the rarest roll and weight 2:1 toward the equipping classes' trees but may
roll any tree (cross-build incentive); total move speed intent capped
(~+15% across a full loadout — enforced by range design, not runtime
clamping). Exact roll weights live in the plan and are tunable later.

- **Level requirements**: `level_req` = item level band (1/4/7/10, uniques
  bespoke). Equip RPC rejects if the character's level is lower. Stats are
  never partially applied — an equipped item always fully counts.

## +Talent semantics ("oskills", locked)

- At match start the server computes **effective ranks** per node:
  tree ranks + equipped item ranks.
- Item ranks may grant **unowned** talents, including active spells — they
  become castable and appear on the hotbar for that match. Item grants
  bypass tree gates and mutual exclusion (they are temporary; unequip
  removes them).
- **Class scoping**: talent affixes roll from any tree, but ranks apply
  only when the equipping character's class owns that tree (mage: fire +
  utility; ranger: archer + archer_utility). Off-class affixes are inert
  while equipped and render dimmed in tooltips — their value is moving the
  item to the account's other-class character via the shared stash. This
  keeps the per-class keybind/HUD model intact (keys 1–4 only ever host
  class spells) and in-class oskill grants fully functional.
- Element conflict (burn/freeze/poison): the derived arrow element is the
  highest effective rank; ties break burn > freeze > poison.
- The shared diminishing-returns curve (`effectAtRank`, rank^0.7) applies
  to the combined rank, exactly like tree supercharging.

## Combat integration

Mirrors the appearance pipeline: the server loads equipped items itself at
join (client is never trusted), folds them into a per-player **StatBlock**
`{ maxHp, maxMana, damageMult, cooldownMult, moveSpeedMult, manaRegenMult }`
stamped into `PlayerState`, and the tick loop reads the stamped values in
place of the `MAX_HP` / `MAX_MANA` / `PLAYER_SPEED` constants (which remain
as the base values). Modifier computation (fireball/ranger mods) and the
cast gate run on effective ranks. HUD spell slots derive from the same
effective set so item-granted spells appear with keybinds.

## Stash & equip UI (Phase 1)

Full-screen overlay off the lobby home ("Gear"), pixel-theme, mirroring the
talent tree's layout language:

- Left: **paper-doll** — the active character's seven slots.
- Right: **account stash** grid (scrollable) + pinned details panel
  (name, base, implicit, affixes, level/class requirements — unmet
  requirements highlighted red).
- Rarity-colored item cards (white/blue/yellow/gold).
- Click to equip/unequip; occupied slot swaps; rings fill first empty of
  ring1/ring2. Optimistic UI, server-validated RPCs, reconcile-on-error
  (pattern proven in the skill tree).
- `create_character` grants and equips the level-1 "Crude" starter set
  (weapon, helmet, armor, leggings).

## Admin page (Phase 1)

Client route rendered only for `profiles.is_admin` accounts, **enforced
server-side** (RLS policy for cross-account reads; every admin RPC checks
the flag — UI gating is cosmetic only). Contents:

1. **Items table**: every item in the DB with owner, rarity, slot, source
   filters; per-row delete.
2. **Manifest browsers**: `ITEM_BASES` and `UNIQUE_ITEMS` as read-only
   tables.
3. **Grant tool**: roll any base at any rarity (or a specific unique) to
   any account — the testing lever.
4. **Drop-rate editor**: per context, the four rarity weights with a live
   normalized preview, saved via admin RPC.

## Drop tables (Phase 1 data, Phase 2 consumption)

`drop_tables` DB table: `context` (`match_drop`, `lootbox_basic`,
`lootbox_premium`), `weights jsonb` (`{basic, magic, rare, unique}`),
`updated_at`. Seeded defaults: match_drop 70/24/5.5/0.5,
lootbox_basic 60/32/7.5/0.5, lootbox_premium 25/50/21/4. The server reads
at roll time; the admin editor mutates via RPC. A `unique` roll with no
eligible unique for the rolled slot/level band falls back to rare.

## Economy (Phase 2 summary — separate plan)

- **Gold** is account-level (`profiles.gold`), matching the shared stash.
- **Selling**: instant, price = f(rarity, level_req); uniques require a
  confirm. **Vendor**: lobby shop, daily-seeded stock of basic/magic items
  around the buyer's level. **Loot boxes**: two gold-priced tiers rolled
  server-side against `drop_tables`. **Match rewards**: gold per match +
  win bonus + win-only chance of a loot box.
- Every mutation is a `SECURITY DEFINER` RPC with `auth.uid()` ownership
  checks; gold amounts are never computed client-side.

## Visible gear (Phase 3 summary — separate plan)

Equipped weapon/helmet/armor/leggings map to LPC layer paths overriding the
appearance outfit layers (helmet → hat layer, armor → torso, leggings →
legs, weapon → animated weapon sheets — bows/staves exist upstream). Same
compositor pipeline as customization; upstream paths are live-verified in
that plan's first task (Workstream S discipline); attribution enforced by
the existing vendor licensing gate.

## Constraints & conventions (binding on all phases)

- Server authority for anything gameplay- or economy-affecting; the
  `normalizeCharacterClass`-style defensive validation at every DB read.
- Supabase RPC patterns per `update_appearance` / `refund_skill_node`
  (SECURITY DEFINER, pinned search_path, ownership checks).
- Pixel theme kit for all UI; XSS discipline (player strings → textContent).
- Suites stay green and grow (client 43, server 235 at time of writing).
- Migrations applied via the established management-API script flow.
