# More Unique Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow `UNIQUE_ITEMS` from 2 to 14, giving uniques drawbacks (negative affix values), visual identity (a tint override on the base sprite), and per-item particle auras.

**Architecture:** All item data stays in the shared typed manifest (`shared/src/items.ts`) consumed by both server and client — no new gameplay engine code, because item talent ranks already merge into tree ranks (`Room.ts:89`) and the cast gate only checks node presence (`StateAdvancer.ts:239`), so a talent affix on a spell node already grants that spell. Three plumbing changes support the new data: an `unique_id` column so a stored row knows which unique it is, a widened `GearVisuals` that carries `{ base, unique }` across all seven equip slots, and a `gravityScale` per particle so auras can rise and float.

**Tech Stack:** TypeScript monorepo (`shared` / `server` / `client` npm workspaces), Vitest, three.js, Supabase Postgres.

Spec: [`docs/superpowers/specs/2026-08-02-more-unique-items-design.md`](../specs/2026-08-02-more-unique-items-design.md)

## Global Constraints

- `@arena/shared` resolves straight to `shared/src/index.ts` via a vitest/vite alias in both workspaces. **There is no build step for shared** — edits are live in both test suites.
- Server + shared tests: `npm run test --workspace=server -- tests/<file>`. Client tests: `npm run test --workspace=client -- tests/<file>`.
- Typecheck: `npx tsc --noEmit -p server/tsconfig.json` and `npx tsc --noEmit -p client/tsconfig.json`. **Never run `npm run build --workspace=client`** — `vite build` writes into the tracked `client/dist/` directory and dirties the checkout.
- Client tests run in the **node** environment (no jsdom). Only test pure functions and code that guards its own DOM access. `three.js` imports fine in node as long as no WebGL renderer is constructed.
- Tests anchor items by **id**, never by array position in `ITEM_BASES` / `UNIQUE_ITEMS`. Re-sorting either catalog must never change a test outcome.
- Existing clamps in `computeLoadout` (`cooldownMult >= 0.5`, `moveSpeedMult <= 1.15`) are hard balance caps, not taste guidelines. Do not relax them.
- The unique-affix cap is **≤ 2 talent affixes per unique** — enforced by an existing test in `server/tests/items.test.ts`.
- Aura colors are `[r, g, b]` triples in the **0–1** range, matching `ParticleSystem`'s `colorR/G/B` float buffers (not 0–255).
- **Do not apply the database migration.** Task 6 writes the SQL file only. Applying it is a post-review step the user performs.
- Commit after every task. Do not use `--no-verify`.

---

### Task 1: Stat floors in `computeLoadout`

Negative affix values already flow through `computeLoadout`'s arithmetic, but nothing bounds the result. This must land before any drawback item exists.

**Files:**
- Modify: `shared/src/items.ts:310-361` (`computeLoadout`)
- Test: `server/tests/items.test.ts` (inside the existing `describe('computeLoadout')` block, which already defines the `mk` row helper at line 85)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export const STAT_FLOORS: { readonly maxHp: 100; readonly maxMana: 50; readonly moveSpeedMult: 0.75; readonly manaRegenMult: 0 }`

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/items.test.ts`, inside the existing `describe('computeLoadout', ...)` block so the `mk` helper is in scope:

```ts
  it('floors maxHp and maxMana when drawback affixes would drive them under', () => {
    const items = [mk({ affixes: [{ id: 'max_health', value: -900 }, { id: 'max_mana', value: -900 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.maxHp).toBe(100);
    expect(statBlock.maxMana).toBe(50);
  });
  it('floors moveSpeedMult at 0.75 under stacked negative move_speed_pct', () => {
    const items = [
      mk({ base_id: 'mail_leggings', slot: 'leggings', equipped_slot: 'leggings', affixes: [{ id: 'move_speed_pct', value: -20 }] }),
      mk({ base_id: 'iron_helm', slot: 'helmet', equipped_slot: 'helmet', affixes: [{ id: 'move_speed_pct', value: -20 }] }),
      mk({ base_id: 'scale_mail', slot: 'armor', equipped_slot: 'armor', affixes: [{ id: 'move_speed_pct', value: -20 }] }),
    ];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.moveSpeedMult).toBe(0.75);
  });
  it('floors manaRegenMult at 0 rather than letting it go negative', () => {
    const items = [mk({ affixes: [{ id: 'mana_regen_pct', value: -150 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.manaRegenMult).toBe(0);
  });
  it('leaves an ordinary positive loadout untouched by the floors', () => {
    const items = [mk({ affixes: [{ id: 'max_health', value: 40 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.maxHp).toBeGreaterThan(700);
    expect(statBlock.moveSpeedMult).toBe(1);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL — `expected -235 to be 100` (or similar) on the first three; the fourth passes already.

- [ ] **Step 3: Implement the floors**

In `shared/src/items.ts`, add above `computeLoadout`:

```ts
/** Floors for a folded StatBlock. Unique items carry negative affix values
 * (drawbacks) and nothing else bounds the result — these guarantee no
 * combination produces a character who cannot move, cast, or survive a hit.
 * Same posture as the moveSpeedMult cap below: a hard cap, not a taste
 * guideline. The shipped catalog's worst stack is ~-430 HP against a 750
 * base, well clear of these; they exist for future items. */
export const STAT_FLOORS = {
  maxHp: 100, maxMana: 50, moveSpeedMult: 0.75, manaRegenMult: 0,
} as const;
```

Then change `computeLoadout`'s returned `statBlock` (currently `shared/src/items.ts:345-358`) to clamp:

```ts
    statBlock: {
      maxHp: Math.max(STAT_FLOORS.maxHp, maxHp),
      maxMana: Math.max(STAT_FLOORS.maxMana, maxMana),
      damageMult,
      cooldownMult: Math.max(0.5, cooldownMult),
      // Spec's affix-system taste rules cap total move-speed intent at
      // "~+15% across a full loadout, enforced by range design" — but the
      // ranges alone don't enforce it (move_speed_pct can roll on all 7
      // slots, and the shipped catalog's best bands multiply out to ~+45%).
      // Runtime-clamp here, mirroring the cooldownMult floor above: in an
      // arena PvP game, uncapped move speed is the single most
      // balance-decisive stat, so this is a hard cap, not just a taste
      // guideline. The floor is the drawback-item mirror of it.
      moveSpeedMult: Math.min(1.15, Math.max(STAT_FLOORS.moveSpeedMult, moveSpeedMult)),
      manaRegenMult: Math.max(STAT_FLOORS.manaRegenMult, manaRegenMult),
    },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: PASS, including the pre-existing `caps moveSpeedMult at 1.15` test.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit -p server/tsconfig.json
git add shared/src/items.ts server/tests/items.test.ts
git commit -m "feat(items): floor folded stats so drawback affixes cannot zero a character out"
```

---

### Task 2: `unique_id` identity for stored item rows

`GearScreen`'s private `findUniqueItem` guesses a row's unique from `base_id` alone; its own comment (`client/src/items/GearScreen.ts:64-66`) flags that a second unique on one base breaks it. Task 3 adds exactly that, so identity must land first.

**Files:**
- Modify: `shared/src/items.ts:55-64` (`ItemRow`), `shared/src/items.ts:380-409` (`validateItemRow`)
- Test: `server/tests/items.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `ItemRow` gains `unique_id?: string | null`
  - `export function uniqueForRow(row: Pick<ItemRow, 'base_id' | 'unique_id'>): UniqueItem | undefined`

- [ ] **Step 1: Write the failing tests**

Add a new top-level `describe` to `server/tests/items.test.ts`. Import `uniqueForRow` by adding it to the existing `@arena/shared` import list at the top of the file:

```ts
describe('uniqueForRow', () => {
  const uniqueRow = (over: Partial<ItemRow> = {}): ItemRow => ({
    id: 'u1', base_id: 'moon_amulet', rarity: 'unique', affixes: [],
    level_req: 7, equipped_by: null, equipped_slot: null, slot: 'amulet', ...over,
  });

  it('resolves by unique_id', () => {
    expect(uniqueForRow(uniqueRow({ unique_id: 'emberheart' }))?.id).toBe('emberheart');
  });
  it('returns undefined when unique_id names a unique that does not sit on this base', () => {
    expect(uniqueForRow(uniqueRow({ base_id: 'bone_ring', unique_id: 'emberheart' }))).toBeUndefined();
  });
  it('returns undefined for an unknown unique_id', () => {
    expect(uniqueForRow(uniqueRow({ unique_id: 'no_such_unique' }))).toBeUndefined();
  });
  it('falls back to a base_id match for legacy rows granted before the column existed', () => {
    expect(uniqueForRow(uniqueRow())?.id).toBe('emberheart');
  });
});

describe('validateItemRow unique_id', () => {
  const raw = (over: Record<string, unknown> = {}) => ({
    id: 'r1', base_id: 'moon_amulet', rarity: 'unique', affixes: [],
    level_req: 7, equipped_by: null, equipped_slot: null, slot: 'amulet', ...over,
  });

  it('accepts a row with no unique_id at all', () => {
    expect(validateItemRow(raw())).not.toBeNull();
  });
  it('accepts null unique_id', () => {
    expect(validateItemRow(raw({ unique_id: null }))?.unique_id).toBeNull();
  });
  it('accepts a valid unique_id and passes it through', () => {
    expect(validateItemRow(raw({ unique_id: 'emberheart' }))?.unique_id).toBe('emberheart');
  });
  it('rejects an unknown unique_id', () => {
    expect(validateItemRow(raw({ unique_id: 'no_such_unique' }))).toBeNull();
  });
  it('rejects a unique_id whose manifest base disagrees with the row base', () => {
    expect(validateItemRow(raw({ base_id: 'bone_ring', slot: 'ring', unique_id: 'emberheart' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL — `uniqueForRow is not a function`, plus type errors on `unique_id`.

- [ ] **Step 3: Implement the column, the lookup, and validation**

In `shared/src/items.ts`, add `unique_id` to `ItemRow` (after `slot`, keeping the existing comment about optional selected columns intact):

```ts
  slot: ItemBaseSlot;
  /** Which manifest unique this row is, for rarity 'unique' rows. Absent on
   * every non-unique row, and on unique rows granted before the column
   * existed — uniqueForRow falls back to a base_id match for those. */
  unique_id?: string | null;
```

Add the lookup below the `UNIQUE_ITEMS` manifest:

```ts
const UNIQUES_BY_ID = new Map(UNIQUE_ITEMS.map(u => [u.id, u]));

/** The manifest unique a stored row represents. Resolves by unique_id, and
 * falls back to a base_id match for legacy rows granted before that column
 * existed. The fallback is ambiguous once a base carries two uniques — it
 * returns the first in manifest order — which is correct, because the second
 * one cannot predate the column. */
export function uniqueForRow(row: Pick<ItemRow, 'base_id' | 'unique_id'>): UniqueItem | undefined {
  if (row.unique_id) {
    const byId = UNIQUES_BY_ID.get(row.unique_id);
    return byId && byId.baseId === row.base_id ? byId : undefined;
  }
  return UNIQUE_ITEMS.find(u => u.baseId === row.base_id);
}
```

In `validateItemRow`, after the existing `source` check, add:

```ts
  // unique_id is optional (see ItemRow); when present it must name a manifest
  // unique that actually sits on this row's base.
  if (r.unique_id !== undefined && r.unique_id !== null) {
    if (typeof r.unique_id !== 'string') return null;
    const u = UNIQUES_BY_ID.get(r.unique_id);
    if (!u || u.baseId !== r.base_id) return null;
  }
```

and add to the returned object:

```ts
    unique_id: r.unique_id as string | null | undefined,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: PASS (all suites in the file, including the pre-existing `validateItemRow` tests).

- [ ] **Step 5: Point `GearScreen` at the shared lookup**

In `client/src/items/GearScreen.ts`, delete the private `findUniqueItem` (lines 64-68 including its comment) and use the shared one. Add `uniqueForRow` to the `@arena/shared` import list, then:

```ts
export function itemDisplayName(item: ItemRow, base: ItemBase): string {
  if (item.rarity === 'unique') return uniqueForRow(item)?.name ?? base.name;
  return base.name;
}
```

`ShopScreen` and `LobbyUI` both call `itemDisplayName`, so this fixes every name site at once.

- [ ] **Step 6: Verify the client suite and typecheck**

Run:
```bash
npm run test --workspace=client -- tests/GearScreen.test.ts
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
```
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add shared/src/items.ts server/tests/items.test.ts client/src/items/GearScreen.ts
git commit -m "feat(items): identify unique rows by unique_id instead of guessing from base_id"
```

---

### Task 3: The twelve new uniques

**Files:**
- Modify: `shared/src/items.ts:48-51` (`UniqueItem` type), `shared/src/items.ts:195-217` (`UNIQUE_ITEMS`)
- Test: `server/tests/items.test.ts`

**Interfaces:**
- Consumes: `uniqueForRow` (Task 2).
- Produces:
  - `export type AuraStyle = 'embers' | 'frost' | 'orbit' | 'drip' | 'wisp'`
  - `export type AuraAnchor = 'head' | 'chest' | 'feet'`
  - `export type UniqueAura = { style: AuraStyle; color: [number, number, number]; anchor: AuraAnchor; intensity?: number; motes?: number }`
  - `UniqueItem` gains `lpcTint?: { color: string; mode?: 'fabric' }` and `aura?: UniqueAura`
  - 12 new entries in `UNIQUE_ITEMS`; the 2 existing entries gain `aura`

- [ ] **Step 1: Write the failing manifest tests**

Add to `server/tests/items.test.ts`, inside the existing top-level `describe('manifests')` block:

```ts
  it('ships fourteen uniques, three new per band', () => {
    expect(UNIQUE_ITEMS).toHaveLength(14);
    const byBand = (lvl: number) => UNIQUE_ITEMS.filter(u => u.levelReq === lvl).length;
    expect(byBand(1)).toBe(3);
    expect(byBand(4)).toBe(3);
    expect(byBand(7)).toBe(5);  // 3 new + emberheart + windrunner_band
    expect(byBand(10)).toBe(3);
  });
  it('unique ids are distinct', () => {
    const ids = UNIQUE_ITEMS.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every talent affix on a unique names a real skill node', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) {
        if (a.id !== 'talent') continue;
        expect(a.node, `${u.id}`).toBeDefined();
        expect(SKILL_NODES.some(n => n.id === a.node), `${u.id} -> ${a.node}`).toBe(true);
      }
    }
  });
  it('every unique carries flavor text and a level requirement in a real band', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(u.flavor.length, u.id).toBeGreaterThan(0);
      expect([1, 4, 7, 10], u.id).toContain(u.levelReq);
    }
  });
  it('aura colors are 0-1 rgb triples and every unique has an aura', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(u.aura, u.id).toBeDefined();
      expect(u.aura!.color, u.id).toHaveLength(3);
      for (const c of u.aura!.color) {
        expect(c, u.id).toBeGreaterThanOrEqual(0);
        expect(c, u.id).toBeLessThanOrEqual(1);
      }
    }
  });
  it('lpcTint only sits on bases that have an lpc manifest', () => {
    for (const u of UNIQUE_ITEMS) {
      if (!u.lpcTint) continue;
      const base = ITEM_BASES.find(b => b.id === u.baseId)!;
      expect(base.lpc, `${u.id} on ${u.baseId}`).toBeDefined();
    }
  });
  // Drift guard: a unique is rare-tier numbers plus a talent payload, not a
  // stat item that outclasses its own rarity. Upside is held to 1.5x the top
  // of its band's rare range. Drawbacks get a looser 2.5x bound on purpose —
  // a unique buys its power with an outsized cost, and a drawback capped at
  // the same multiple as the upside would not be felt.
  it('unique upside stays within 1.5x its band top, drawbacks within 2.5x', () => {
    for (const u of UNIQUE_ITEMS) {
      const bandIndex = ITEM_LEVEL_BANDS.indexOf(u.levelReq as (typeof ITEM_LEVEL_BANDS)[number]);
      expect(bandIndex, u.id).toBeGreaterThanOrEqual(0);
      for (const a of u.affixes) {
        if (a.id === 'talent') continue;
        const [, hi] = AFFIX_TIERS[a.id][bandIndex];
        const ceiling = hi * (a.value < 0 ? 2.5 : 1.5);
        expect(Math.abs(a.value), `${u.id} ${a.id}`).toBeLessThanOrEqual(ceiling);
      }
    }
  });
  it('the two uniques sharing moon_amulet are distinguishable by unique_id', () => {
    const onMoon = UNIQUE_ITEMS.filter(u => u.baseId === 'moon_amulet');
    expect(onMoon.length).toBe(2);
    for (const u of onMoon) {
      expect(uniqueForRow({ base_id: 'moon_amulet', unique_id: u.id })?.id).toBe(u.id);
    }
  });
```

Add `SKILL_NODES` and `ITEM_LEVEL_BANDS` to the file's `@arena/shared` import list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL — `expected length 2 to be 14`.

- [ ] **Step 3: Extend the `UniqueItem` type**

In `shared/src/items.ts`, replace the `UniqueItem` type (line 48) with:

```ts
/** A unique's particle aura. `style` picks a shared emitter shape; there is
 * no per-item emitter code. Colors are 0-1 rgb, matching ParticleSystem's
 * float color buffers. */
export type AuraStyle = 'embers' | 'frost' | 'orbit' | 'drip' | 'wisp';
export type AuraAnchor = 'head' | 'chest' | 'feet';
export type UniqueAura = {
  style: AuraStyle;
  color: [number, number, number];
  anchor: AuraAnchor;
  /** Scales emission rate and particle size; 1 is the default weight. */
  intensity?: number;
  /** 'orbit' only — how many motes ride the ring. Defaults to 1. */
  motes?: number;
};

export type UniqueItem = {
  id: string; baseId: string; name: string; flavor: string;
  affixes: RolledAffix[]; levelReq: number;
  /** Overrides the tint of every layer of the base's lpc manifest, so the
   * unique is visually distinct in-world and on its inventory icon. Only
   * meaningful on bases that have an lpc entry. */
  lpcTint?: { color: string; mode?: 'fabric' };
  aura?: UniqueAura;
};
```

- [ ] **Step 4: Write the manifest**

Replace the whole `UNIQUE_ITEMS` array in `shared/src/items.ts` with the following. Note `levelReq` is deliberately independent of the base's `itemLevel` — several level-4 and level-7 uniques sit on level-1 bases, exactly as `windrunner_band` already does.

```ts
/**
 * Hand-authored uniques: one axis above rare, one axis below. Negative affix
 * values are drawbacks and are load-bearing — `computeLoadout`'s STAT_FLOORS
 * bound what they can stack into.
 *
 * Talent affixes are the payload, used three ways: granting a spell the
 * player never bought (the cast gate only checks node presence), granting a
 * binary modifier node, and pushing a stackable node past its soft cap into
 * its keystone. An item never trips a keystone alone — it rewards investment
 * already made.
 *
 * Class-shared slots grant BOTH classes' equivalent node; off-class talent
 * affixes are inert in computeLoadout, so one item reads identically on
 * either class at no extra cost.
 *
 * Only ranger nodes carry keystone data today, so keystone-forcing is
 * ranger-only here; the mage's equivalent payoff is the spell grants.
 */
export const UNIQUE_ITEMS: UniqueItem[] = [
  // --- Level 1 ---
  {
    id: 'kindling', baseId: 'apprentice_staff', name: 'Kindling',
    flavor: 'Every apprentice is told not to feed it. Every apprentice does.',
    affixes: [
      { id: 'damage_pct', value: 5 },
      { id: 'talent', value: 1, node: 'fire.volatile_ember' },
      { id: 'max_health', value: -35 },
    ],
    levelReq: 1,
    lpcTint: { color: '#ff8a3d' },
    aura: { style: 'embers', color: [1.0, 0.45, 0.1], anchor: 'chest', intensity: 0.6 },
  },
  {
    // Grants Multi-shot — a 2-point tier-2 spell — at level 1. The mana cut
    // is what makes firing it a choice rather than a freebie.
    id: 'threefold_draw', baseId: 'short_bow', name: 'Threefold Draw',
    flavor: 'One string. It has never agreed with itself.',
    affixes: [
      { id: 'talent', value: 1, node: 'archer.multishot' },
      { id: 'cast_speed_pct', value: 3 },
      { id: 'max_mana', value: -25 },
    ],
    levelReq: 1,
    lpcTint: { color: '#e8e2cf', mode: 'fabric' },
    aura: { style: 'orbit', color: [0.88, 0.9, 0.82], anchor: 'chest', intensity: 0.8, motes: 3 },
  },
  {
    // Both classes' homing node: your shots track, and they hit softer.
    id: 'hunters_eye', baseId: 'bone_ring', name: "Hunter's Eye",
    flavor: 'It always knows where you meant to look.',
    affixes: [
      { id: 'talent', value: 1, node: 'fire.seeking_flame' },
      { id: 'talent', value: 1, node: 'archer.guided' },
      { id: 'max_mana', value: 20 },
      { id: 'damage_pct', value: -5 },
    ],
    levelReq: 1,
    aura: { style: 'orbit', color: [1.0, 0.72, 0.25], anchor: 'chest', intensity: 0.5, motes: 1 },
  },

  // --- Level 4 ---
  {
    id: 'widows_vow', baseId: 'carved_amulet', name: "Widow's Vow",
    flavor: "She traded her heart's warmth for one more word with him.",
    affixes: [
      { id: 'max_mana', value: 75 },
      { id: 'mana_regen_pct', value: 18 },
      { id: 'cast_speed_pct', value: 4 },
      { id: 'max_health', value: -95 },
    ],
    levelReq: 4,
    aura: { style: 'drip', color: [0.7, 0.85, 1.0], anchor: 'chest', intensity: 0.7 },
  },
  {
    id: 'marshstrider_breeches', baseId: 'cloth_pants', name: 'Marshstrider Breeches',
    flavor: 'Peat-stained to the knee. They remember every path out of the moor.',
    affixes: [
      { id: 'move_speed_pct', value: 6 },
      { id: 'max_health', value: 45 },
      { id: 'cast_speed_pct', value: -6 },
    ],
    levelReq: 4,
    lpcTint: { color: '#6f8f4a', mode: 'fabric' },
    aura: { style: 'wisp', color: [0.45, 0.7, 0.35], anchor: 'feet', intensity: 0.9 },
  },
  {
    // Each class's 2-point vanish-while-moving node: invulnerability after
    // teleport for a mage, invisibility after evade for a ranger.
    id: 'hollowhide_jerkin', baseId: 'padded_tunic', name: 'Hollowhide Jerkin',
    flavor: 'Cut from something that had already learned to vanish.',
    affixes: [
      { id: 'talent', value: 1, node: 'utility.ethereal_form' },
      { id: 'talent', value: 1, node: 'archer_utility.shadowstep' },
      { id: 'max_health', value: 50 },
      { id: 'mana_regen_pct', value: -35 },
      { id: 'damage_pct', value: -6 },
    ],
    levelReq: 4,
    lpcTint: { color: '#7d5f96', mode: 'fabric' },
    aura: { style: 'drip', color: [0.55, 0.35, 0.7], anchor: 'chest', intensity: 0.7 },
  },

  // --- Level 7 (keystone band opens) ---
  {
    // The boldest item in the set: a free tier-6, 3-point spell, paid for
    // with the mana to sustain it.
    id: 'cinderfall', baseId: 'gnarled_staff', name: 'Cinderfall',
    flavor: 'The sky owes it a favour.',
    affixes: [
      { id: 'talent', value: 1, node: 'fire.meteor' },
      { id: 'damage_pct', value: 6 },
      { id: 'max_mana', value: -110 },
      { id: 'cast_speed_pct', value: -8 },
    ],
    levelReq: 7,
    lpcTint: { color: '#6b4a3a' },
    aura: { style: 'embers', color: [1.0, 0.35, 0.05], anchor: 'chest', intensity: 1.4 },
  },
  {
    // Two tree ranks of Freeze plus these two reach rank 4 — past the soft
    // cap of 3 — and unlock Deep Freeze.
    id: 'quiverfrost', baseId: 'war_bow', name: 'Quiverfrost',
    flavor: 'The string does not thaw.',
    affixes: [
      { id: 'talent', value: 2, node: 'archer.freeze' },
      { id: 'damage_pct', value: 8 },
      { id: 'max_health', value: -75 },
      { id: 'mana_regen_pct', value: -20 },
    ],
    levelReq: 7,
    lpcTint: { color: '#9fd8f0', mode: 'fabric' },
    aura: { style: 'frost', color: [0.6, 0.9, 1.0], anchor: 'chest', intensity: 1.0 },
  },
  {
    // Four tree ranks of Wide Rain plus these two reach 6 and unlock Twin
    // Storm. The negative move_speed_pct on a helmet is deliberate: the
    // leggings-only rule in AFFIX_ALLOWED_SLOTS governs ROLLED affixes, and a
    // heavy helm that slows you is the whole idea.
    id: 'doomsayers_barbute', baseId: 'iron_helm', name: "Doomsayer's Barbute",
    flavor: 'The visor is welded shut. Whoever wore it last had stopped looking.',
    affixes: [
      { id: 'talent', value: 2, node: 'fire.cataclysm' },
      { id: 'talent', value: 2, node: 'archer.wide_rain' },
      { id: 'max_health', value: 85 },
      { id: 'move_speed_pct', value: -6 },
    ],
    levelReq: 7,
    lpcTint: { color: '#b06a4a' },
    aura: { style: 'drip', color: [0.7, 0.3, 0.18], anchor: 'head', intensity: 0.8 },
  },
  {
    id: 'emberheart', baseId: 'moon_amulet', name: 'Emberheart',
    flavor: 'A cinder that never cools, warm to the touch even in the dead of winter.',
    affixes: [
      { id: 'max_mana', value: 60 },
      { id: 'damage_pct', value: 8 },
      { id: 'talent', value: 2, node: 'fire.volatile_ember' },
      { id: 'talent', value: 1, node: 'fire.searing_heat' },
    ],
    levelReq: 7,
    aura: { style: 'orbit', color: [1.0, 0.55, 0.15], anchor: 'chest', intensity: 0.8, motes: 2 },
  },
  {
    id: 'windrunner_band', baseId: 'bone_ring', name: 'Windrunner Band',
    flavor: 'Fletched with feathers that never touched a bird.',
    affixes: [
      { id: 'move_speed_pct', value: 6 },
      { id: 'cast_speed_pct', value: 5 },
      { id: 'talent', value: 2, node: 'archer.barrage' },
    ],
    levelReq: 7,
    aura: { style: 'wisp', color: [0.75, 0.95, 0.8], anchor: 'feet', intensity: 0.8 },
  },

  // --- Level 10 ---
  {
    id: 'ninefold_ember', baseId: 'archmage_staff', name: 'Ninefold Ember',
    flavor: 'Nine splinters of the same falling star, bound with wire.',
    affixes: [
      { id: 'talent', value: 3, node: 'fire.pyroclasm' },
      { id: 'damage_pct', value: 12 },
      { id: 'max_health', value: -150 },
      { id: 'cast_speed_pct', value: -8 },
    ],
    levelReq: 10,
    lpcTint: { color: '#ffd9a0', mode: 'fabric' },
    aura: { style: 'embers', color: [1.0, 0.9, 0.75], anchor: 'chest', intensity: 1.8 },
  },
  {
    // The full rain build in one item: can trip Stormcall (soft cap 5) and
    // Exposed (soft cap 3) together on an invested tree.
    id: 'stormcallers_yew', baseId: 'great_bow', name: "Stormcaller's Yew",
    flavor: 'It bends toward weather that has not arrived yet.',
    affixes: [
      { id: 'talent', value: 2, node: 'archer.sustained_rain' },
      { id: 'talent', value: 2, node: 'archer.piercing_rain' },
      { id: 'cast_speed_pct', value: 6 },
      { id: 'max_mana', value: -120 },
      { id: 'move_speed_pct', value: -5 },
    ],
    levelReq: 10,
    lpcTint: { color: '#9a86d6', mode: 'fabric' },
    aura: { style: 'wisp', color: [0.65, 0.5, 0.95], anchor: 'feet', intensity: 1.2 },
  },
  {
    // Shares moon_amulet with Emberheart — legal only because rows now carry
    // unique_id.
    id: 'the_quiet_hour', baseId: 'moon_amulet', name: 'The Quiet Hour',
    flavor: 'Between the last bell and the first, nothing is owed to anyone.',
    affixes: [
      { id: 'talent', value: 1, node: 'utility.phantom_step' },
      { id: 'talent', value: 1, node: 'archer_utility.combat_roll' },
      { id: 'cast_speed_pct', value: 9 },
      { id: 'max_health', value: -110 },
      { id: 'max_mana', value: -70 },
    ],
    levelReq: 10,
    aura: { style: 'orbit', color: [0.85, 0.87, 0.95], anchor: 'chest', intensity: 0.5, motes: 2 },
  },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: PASS, including the pre-existing `every unique references a real base and respects the 2-talent cap` test.

- [ ] **Step 6: Fix the two economy tests whose premises this invalidates**

Run: `npm run test --workspace=server`

Two tests in `server/tests/economy.test.ts` fail because they assume the old two-unique manifest. Replace both — do not weaken what they check.

`downgrades unique to rare when no unique is eligible at band 1` (line ~155) assumed no unique existed below level 7. Level-1 uniques exist now, so a level-2 account rolls one. The downgrade branch is still reachable for an account with no characters at all:

```ts
  it('downgrades unique to rare when the account has no eligible unique at all', () => {
    // maxCharLevel 0 (an account with no characters) — every unique requires
    // at least level 1, so the unique roll has nothing to pick and falls back.
    const result = rollLootboxItem('premium', weights, 0, () => 0.9999);
    expect(result.rarity).toBe('rare');
  });
  it('rolls a level-1 unique for a low-level account', () => {
    const result = rollLootboxItem('premium', weights, 2, () => 0.9999);
    expect(result.rarity).toBe('unique');
  });
```

`rolls an eligible unique deterministically when maxCharLevel qualifies` (line ~161) indexes `UNIQUE_ITEMS[1]`. A constant `0.9999` rng selects the **last** eligible unique, so anchor on that id explicitly:

```ts
  it('rolls an eligible unique deterministically when maxCharLevel qualifies', () => {
    // A constant 0.9999 lands rollRarity on 'unique' and then selects the
    // last eligible entry — the_quiet_hour, the final manifest item. This is
    // one of the few places manifest order is load-bearing: re-sorting
    // UNIQUE_ITEMS means updating this id.
    const expected = UNIQUE_ITEMS.find(u => u.id === 'the_quiet_hour')!;
    const result = rollMatchDropItem(weights, 10, () => 0.9999);
    expect(result.rarity).toBe('unique');
    expect(result.affixes).toEqual(expected.affixes);
    expect(result.base.id).toBe(expected.baseId);
    expect(result.levelReq).toBe(expected.levelReq);
  });
```

Run `npm run test --workspace=server` again.
Expected: PASS.

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
git add shared/src/items.ts server/tests/items.test.ts server/tests/economy.test.ts
git commit -m "feat(items): twelve new uniques with drawbacks, tints, and auras"
```

---

### Task 4: Sign-aware affix labels

`affixLabel` is duplicated verbatim in three files and hardcodes `+`, so a drawback renders as `+-35 Max Health`. Hoist one copy into shared and make it sign-aware.

**Files:**
- Modify: `shared/src/items.ts` (add `affixLabel`), `client/src/items/GearScreen.ts:43-57`, `client/src/items/ShopScreen.ts:17-31`, `client/src/admin/AdminScreen.ts:36-48`
- Test: `server/tests/items.test.ts`

**Interfaces:**
- Consumes: `RolledAffix`, `AffixId` (existing).
- Produces:
  - `export function affixLabel(a: RolledAffix): string`
  - `export function isDrawback(a: RolledAffix): boolean`

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/items.test.ts` (add `affixLabel` and `isDrawback` to the `@arena/shared` import list):

```ts
describe('affixLabel', () => {
  it('prefixes positive values with +', () => {
    expect(affixLabel({ id: 'max_health', value: 40 })).toBe('+40 Max Health');
    expect(affixLabel({ id: 'damage_pct', value: 8 })).toBe('+8% Damage');
  });
  it('renders negative values with a single minus sign, never +-', () => {
    expect(affixLabel({ id: 'max_health', value: -35 })).toBe('-35 Max Health');
    expect(affixLabel({ id: 'damage_pct', value: -6 })).toBe('-6% Damage');
    expect(affixLabel({ id: 'max_health', value: -35 })).not.toContain('+-');
  });
  it('labels talent affixes by rank', () => {
    expect(affixLabel({ id: 'talent', value: 2, node: 'fire.cataclysm' })).toBe('+2 Talent Rank');
  });
  it('isDrawback marks only negative values', () => {
    expect(isDrawback({ id: 'max_health', value: -35 })).toBe(true);
    expect(isDrawback({ id: 'max_health', value: 35 })).toBe(false);
    expect(isDrawback({ id: 'talent', value: 2, node: 'fire.cataclysm' })).toBe(false);
  });
  it('every shipped unique drawback renders without a doubled sign', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) expect(affixLabel(a), u.id).not.toContain('+-');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL — `affixLabel is not a function`.

- [ ] **Step 3: Implement the shared label**

Add to `shared/src/items.ts`:

```ts
/** Human-readable affix text, shared by the Gear, Shop, and Admin screens —
 * they each had a private copy that hardcoded '+', which renders a drawback
 * as '+-35 Max Health'. */
const AFFIX_LABELS: Record<Exclude<AffixId, 'talent'>, (abs: number, sign: string) => string> = {
  max_health:     (v, s) => `${s}${v} Max Health`,
  max_mana:       (v, s) => `${s}${v} Max Mana`,
  damage_pct:     (v, s) => `${s}${v}% Damage`,
  cast_speed_pct: (v, s) => `${s}${v}% Cast Speed`,
  move_speed_pct: (v, s) => `${s}${v}% Move Speed`,
  mana_regen_pct: (v, s) => `${s}${v}% Mana Regen`,
};

export function affixLabel(a: RolledAffix): string {
  if (a.id === 'talent') return `+${a.value} Talent Rank`;
  return AFFIX_LABELS[a.id](Math.abs(a.value), a.value < 0 ? '-' : '+');
}

/** True for a negative (drawback) affix — the UI renders these in a muted
 * red so the tradeoff is legible at a glance. Talent ranks are never
 * drawbacks. */
export function isDrawback(a: RolledAffix): boolean {
  return a.id !== 'talent' && a.value < 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the three private copies**

In each of `client/src/items/GearScreen.ts`, `client/src/items/ShopScreen.ts`, and `client/src/admin/AdminScreen.ts`: delete the local `AFFIX_LABELS` constant and the local `affixLabel` function, and add `affixLabel` to that file's `@arena/shared` import list. Every existing call site keeps working unchanged. Remove the now-unused `AffixId` type import from any file that no longer references it (the typechecker in Step 7 will tell you which).

- [ ] **Step 6: Style drawbacks in the Gear screen**

In `client/src/items/GearScreen.ts`, import `isDrawback` alongside `affixLabel`. Find the affix rows rendered in the item details panel (search for `affixLabel(` in that file) and give drawback rows a class:

```ts
`<div class="gr-details-row${isDrawback(a) ? ' gr-bad' : ''}">${esc(affixLabel(a))}</div>`
```

Add to the `STYLES` template in the same file:

```css
.gr-bad{color:#c4564a;}
.gr-card-unique{box-shadow:inset 0 0 0 2px #ffb347,0 0 12px rgba(255,179,71,0.35);}
```

Apply `gr-card-unique` to item cells whose `rarity === 'unique'`, alongside whatever class the cell already carries.

- [ ] **Step 7: Verify and commit**

```bash
npm run test --workspace=server -- tests/items.test.ts
npm run test --workspace=client
npx tsc --noEmit -p client/tsconfig.json
git add shared/src/items.ts server/tests/items.test.ts client/src/items/GearScreen.ts client/src/items/ShopScreen.ts client/src/admin/AdminScreen.ts
git commit -m "feat(items): sign-aware affix labels shared across gear, shop, and admin"
```

---

### Task 5: Widen `GearVisuals` and apply unique tints

`GearVisuals` currently maps four visible slots to a base-id string. Tinting needs the unique per slot, and auras need ring/amulet slots too — so one map carries both, across all seven slots.

**Files:**
- Modify: `shared/src/gearVisuals.ts` (whole file)
- Test: `server/tests/gear-visuals.test.ts`, `server/tests/gear-wire.test.ts`
- Modify (mechanical type follow-through): `client/src/main.ts`, `client/src/renderer/CharacterMesh.ts`, `client/src/renderer/sprites/SpriteCharacter.ts`, `client/src/renderer/sprites/SpritePreview.ts`, `client/src/renderer/sprites/SpriteCompositor.ts`, `client/src/lobby/LobbyUI.ts`, `client/src/items/GearScreen.ts`

**Interfaces:**
- Consumes: `uniqueForRow` (Task 2), `UniqueItem`/`UniqueAura` (Task 3).
- Produces:
  - `export type GearVisualEntry = { base: string; unique?: string }`
  - `export type GearVisuals = Partial<Record<EquipSlot, GearVisualEntry>>`
  - `export type ActiveAura = { unique: UniqueItem; aura: UniqueAura }`
  - `export const MAX_AURAS_PER_PLAYER = 2`
  - `export function aurasForGear(gear: GearVisuals, max?: number): ActiveAura[]`

- [ ] **Step 1: Write the failing tests**

Replace the `describe('gearVisualsFor')` block in `server/tests/gear-visuals.test.ts` with:

```ts
describe('gearVisualsFor', () => {
  it('maps equipped visible slots to base entries', () => {
    const gear = gearVisualsFor([
      row('iron_helm', 'helmet'), row('padded_tunic', 'armor'),
      row('mail_leggings', 'leggings'), row('gnarled_staff', 'weapon'),
    ]);
    expect(gear).toEqual({
      helmet: { base: 'iron_helm' }, armor: { base: 'padded_tunic' },
      leggings: { base: 'mail_leggings' }, weapon: { base: 'gnarled_staff' },
    });
  });
  it('drops plain rings, amulets, and unequipped rows', () => {
    const stashRow = { ...row('iron_helm', 'helmet'), equipped_by: null, equipped_slot: null };
    expect(gearVisualsFor([row('bone_ring', 'ring1'), row('moon_amulet', 'amulet'), stashRow]))
      .toEqual({});
  });
  it('carries a unique id on visible slots', () => {
    const gear = gearVisualsFor([
      { ...row('gnarled_staff', 'weapon'), rarity: 'unique', unique_id: 'cinderfall' },
    ]);
    expect(gear.weapon).toEqual({ base: 'gnarled_staff', unique: 'cinderfall' });
  });
  it('keeps a non-visual slot when it holds a unique, because its aura needs it', () => {
    const gear = gearVisualsFor([
      { ...row('moon_amulet', 'amulet'), rarity: 'unique', unique_id: 'the_quiet_hour' },
    ]);
    expect(gear.amulet).toEqual({ base: 'moon_amulet', unique: 'the_quiet_hour' });
  });
});

describe('unique lpcTint', () => {
  it('overrides the base layer tint for a tinted unique', () => {
    const plain = layersForLoadout(MAGE, { weapon: { base: 'gnarled_staff' } });
    const tinted = layersForLoadout(MAGE, { weapon: { base: 'gnarled_staff', unique: 'cinderfall' } });
    const plainWeapon = plain.filter(l => l.weapon === 'gnarled_staff');
    const tintedWeapon = tinted.filter(l => l.weapon === 'gnarled_staff');
    expect(tintedWeapon.length).toBe(plainWeapon.length);
    expect(tintedWeapon.every(l => l.tint === '#6b4a3a')).toBe(true);
    expect(plainWeapon.every(l => l.tint === undefined)).toBe(true);
  });
  it('leaves layers untinted for a unique with no lpcTint', () => {
    const layers = layersForLoadout(MAGE, { amulet: { base: 'moon_amulet', unique: 'the_quiet_hour' } });
    expect(layers).toEqual(layersFor(MAGE));
  });
});

describe('aurasForGear', () => {
  it('returns nothing for gear with no uniques', () => {
    expect(aurasForGear({ helmet: { base: 'iron_helm' } })).toEqual([]);
  });
  it('caps at two auras, keeping the highest levelReq', () => {
    const auras = aurasForGear({
      weapon: { base: 'archmage_staff', unique: 'ninefold_ember' },   // 10
      amulet: { base: 'moon_amulet', unique: 'the_quiet_hour' },      // 10
      helmet: { base: 'iron_helm', unique: 'doomsayers_barbute' },    // 7
      ring1:  { base: 'bone_ring', unique: 'hunters_eye' },           // 1
    });
    expect(auras.map(a => a.unique.levelReq)).toEqual([10, 10]);
  });
  it('deduplicates the same unique worn in both ring slots', () => {
    const auras = aurasForGear({
      ring1: { base: 'bone_ring', unique: 'hunters_eye' },
      ring2: { base: 'bone_ring', unique: 'hunters_eye' },
    });
    expect(auras).toHaveLength(1);
  });
});
```

Add `aurasForGear` to that file's `@arena/shared` import list, and extend its local `row()` helper's return type so `rarity` and `unique_id` can be overridden (it already returns an `ItemRow`; the spread in the tests handles it).

In `server/tests/gear-wire.test.ts`, update the two gear assertions:

```ts
    expect(state.players.a.gear).toEqual({ helmet: { base: 'iron_helm' } });
```
(the empty-gear assertion at line 27 is unchanged).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/gear-visuals.test.ts tests/gear-wire.test.ts`
Expected: FAIL — `aurasForGear is not a function`, and object-shape mismatches.

- [ ] **Step 3: Rewrite `shared/src/gearVisuals.ts`**

```ts
// Equipped-gear → LPC layer resolution. Pure and DOM-free like appearance.ts;
// consumed by the server (PlayerState stamping) and client (compositor,
// paperdoll, icons).
import type { Appearance, LpcLayer } from './appearance.js';
import { layersFor } from './appearance.js';
import type { EquipSlot, ItemRow, UniqueAura, UniqueItem } from './items.js';
import { ITEM_BASES, UNIQUE_ITEMS, uniqueForRow } from './items.js';

export type GearVisualSlot = 'helmet' | 'armor' | 'leggings' | 'weapon';

/** What one equipped slot contributes. `unique` drives both the sprite tint
 * and the item's aura, so tinting and auras share one source of truth —
 * a ring's aura has no sprite to hang off otherwise. */
export type GearVisualEntry = { base: string; unique?: string };
export type GearVisuals = Partial<Record<EquipSlot, GearVisualEntry>>;

const VISUAL_SLOTS: GearVisualSlot[] = ['helmet', 'armor', 'leggings', 'weapon'];

// z bands layersFor assigns to the appearance layers each slot replaces —
// keep in sync with layersFor (hair fg 30, torso 40, legs 50, hat 60).
const REPLACED_Z: Record<GearVisualSlot, number | null> = {
  helmet: 60, armor: 40, leggings: 50, weapon: null,
};
const ABOVE_HEAD_HAIR_Z = 30;

/** Equipped items → slot→entry map. A slot is carried when it either draws a
 * sprite (has an lpc manifest) or holds a unique (whose aura needs it);
 * everything else contributes nothing and stays off the wire. */
export function gearVisualsFor(items: ItemRow[]): GearVisuals {
  const gear: GearVisuals = {};
  for (const item of items) {
    const slot = item.equipped_slot;
    if (item.equipped_by === null || slot === null) continue;
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    if (!base) continue;
    const unique = item.rarity === 'unique' ? uniqueForRow(item) : undefined;
    if (!base.lpc && !unique) continue;
    gear[slot] = unique ? { base: base.id, unique: unique.id } : { base: base.id };
  }
  return gear;
}

function substitute(path: string, a: Appearance): string {
  return path
    .replace('{body}', a.body)
    .replace('{legs}', a.body === 'female' ? 'thin' : 'male');
}

/** layersFor + equipped gear: helmet/armor/leggings replace their appearance
 * layer, weapons append bg/fg layers. Unknown or non-visual base ids are
 * ignored (defensive — same posture as validateItemRow). A unique's lpcTint
 * overrides the base layers' own tint. */
export function layersForLoadout(a: Appearance, gear: GearVisuals): LpcLayer[] {
  let layers = layersFor(a);
  for (const slot of VISUAL_SLOTS) {
    const entry = gear[slot];
    if (!entry) continue;
    const base = ITEM_BASES.find(b => b.id === entry.base);
    if (!base?.lpc || (slot !== 'weapon' && base.slot !== slot)) continue;
    if (slot === 'weapon' && base.slot !== 'weapon') continue;
    const tint = entry.unique ? UNIQUE_ITEMS.find(u => u.id === entry.unique)?.lpcTint : undefined;
    const replaced = REPLACED_Z[slot];
    if (replaced !== null) layers = layers.filter(l => l.z !== replaced);
    if (slot === 'helmet' && base.lpc.hidesHair) {
      layers = layers.filter(l => l.z !== ABOVE_HEAD_HAIR_Z);
    }
    for (const gl of base.lpc.layers) {
      layers.push({
        path: substitute(gl.path, a), z: gl.z,
        tint: tint?.color ?? gl.tint,
        tintMode: tint ? tint.mode : gl.tintMode,
        ...(slot === 'weapon'
          ? { weapon: base.id, weaponRole: gl.weaponRole, weaponNativeAnims: base.lpc.nativeAnims ?? [] }
          : {}),
      });
    }
  }
  return layers.sort((x, y) => x.z - y.z);
}

/** How many unique auras one player may show at once. A character wearing
 * seven uniques would be unreadable, so the loudest win. */
export const MAX_AURAS_PER_PLAYER = 2;

export type ActiveAura = { unique: UniqueItem; aura: UniqueAura };

/** The auras a loadout actually shows: deduplicated (the same unique can sit
 * in both ring slots), sorted by levelReq descending with manifest order as
 * the tiebreak, capped at MAX_AURAS_PER_PLAYER. */
export function aurasForGear(gear: GearVisuals, max = MAX_AURAS_PER_PLAYER): ActiveAura[] {
  const found: UniqueItem[] = [];
  for (const entry of Object.values(gear)) {
    if (!entry?.unique) continue;
    const u = UNIQUE_ITEMS.find(x => x.id === entry.unique);
    if (u?.aura && !found.includes(u)) found.push(u);
  }
  found.sort((x, y) =>
    y.levelReq - x.levelReq || UNIQUE_ITEMS.indexOf(x) - UNIQUE_ITEMS.indexOf(y));
  return found.slice(0, max).map(u => ({ unique: u, aura: u.aura! }));
}
```

Note `tintMode: tint ? tint.mode : gl.tintMode` — a unique tint with no mode must produce a pure multiply, not silently inherit the base's `'fabric'`.

`EquipSlot` must be exported from `shared/src/items.ts` (it already is, line 11).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/gear-visuals.test.ts tests/gear-wire.test.ts`
Expected: PASS, including every pre-existing `layersForLoadout` test in the file (update their gear literals from `{ helmet: 'iron_helm' }` to `{ helmet: { base: 'iron_helm' } }` — the assertions themselves should not change).

- [ ] **Step 5: Follow the type through the client**

Run `npx tsc --noEmit -p client/tsconfig.json` and fix each error. They are all the same mechanical change — a gear literal or lookup that used a bare string now uses `{ base: id }`. Expected sites:
- `client/src/main.ts:142` — `gearVisualsFor(items)` needs no change; any place that reads `activeGear.weapon` as a string does.
- `client/src/items/GearScreen.ts:309` — `gearVisualsFor(equipped)` needs no change.
- `client/src/renderer/CharacterMesh.ts`, `SpriteCharacter.ts`, `SpritePreview.ts`, `SpriteCompositor.ts`, `LobbyUI.ts` — these pass `GearVisuals` through to `layersForLoadout` and should need no change beyond any default-value literals.

- [ ] **Step 6: Verify the full suites and commit**

```bash
npm run test --workspace=server
npm run test --workspace=client
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
git add shared/src/gearVisuals.ts server/tests/gear-visuals.test.ts server/tests/gear-wire.test.ts client/src
git commit -m "feat(gear): carry the equipped unique per slot for tints and auras"
```

---

### Task 6: Persist `unique_id`, and write (do not apply) the migration

**Files:**
- Create: `supabase/migrations/20260802000000_item_unique_id.sql`
- Modify: `shared/src/economy.ts:111` (`DropResult`), `shared/src/economy.ts:117-136` (`rollDropItem`), `server/src/economy/service.ts:40` (`ITEM_ROW_COLUMNS`) and its three insert sites, `client/src/admin/AdminScreen.ts` (grant path), `client/src/supabase.ts` (the `admin_grant_item` caller)
- Test: `server/tests/economy.test.ts`

**Interfaces:**
- Consumes: `uniqueForRow`, `unique_id` (Task 2); the manifest (Task 3).
- Produces: `DropResult` gains `uniqueId?: string`.

- [ ] **Step 1: Write the failing test**

Add to `server/tests/economy.test.ts`:

```ts
  it('reports which unique a unique roll picked', () => {
    const weights = { basic: 0, magic: 0, rare: 0, unique: 1 };
    const result = rollLootboxItem('premium', weights, 10, mulberry32(7));
    expect(result.rarity).toBe('unique');
    expect(result.uniqueId).toBeDefined();
    const manifest = UNIQUE_ITEMS.find(u => u.id === result.uniqueId)!;
    expect(manifest).toBeDefined();
    expect(result.base.id).toBe(manifest.baseId);
    expect(result.affixes).toEqual(manifest.affixes);
    expect(result.levelReq).toBe(manifest.levelReq);
  });
  it('leaves uniqueId unset on a non-unique roll', () => {
    const weights = { basic: 1, magic: 0, rare: 0, unique: 0 };
    expect(rollLootboxItem('basic', weights, 10, mulberry32(3)).uniqueId).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=server -- tests/economy.test.ts`
Expected: FAIL — `expected undefined not to be undefined`.

- [ ] **Step 3: Report the picked unique**

In `shared/src/economy.ts`, change `DropResult`:

```ts
export type DropResult = {
  base: ItemBase; rarity: ItemRarity; affixes: RolledAffix[]; levelReq: number;
  /** Set only on a unique roll — persisted to items.unique_id so the row
   * keeps its identity through future balance tuning. */
  uniqueId?: string;
};
```

and in `rollDropItem`'s unique branch:

```ts
      return { base, rarity: 'unique', affixes: unique.affixes, levelReq: unique.levelReq, uniqueId: unique.id };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=server -- tests/economy.test.ts`
Expected: PASS.

- [ ] **Step 5: Persist it server-side**

In `server/src/economy/service.ts`:

```ts
const ITEM_ROW_COLUMNS = 'id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, unique_id';
```

At the lootbox insert (around line 241) and the match-drop insert (around line 289), add to the inserted object:

```ts
      unique_id: roll.uniqueId ?? null,
```

The vendor-purchase insert (around line 185) stocks only basic/magic rarities (`VendorSlot['rarity']`), so it gets `unique_id: null`.

- [ ] **Step 6: Write the migration (do NOT apply it)**

The live `admin_grant_item` (from `20260731010000_items_fixes.sql`) contains a guard that **blocks every drawback unique**:

```sql
    if not (v_elem ? 'value') or jsonb_typeof(v_elem -> 'value') <> 'number' or (v_elem ->> 'value')::numeric <= 0 then
      raise exception 'affix value must be a positive number';
    end if;
```

Granting Kindling (`max_health: -35`) would raise. The guard's real intent is "a number, and not zero" — a zero-value affix is meaningless, a negative one is now a designed drawback. The migration relaxes it to exactly that and adds the column in the same file.

Create `supabase/migrations/20260802000000_item_unique_id.sql`:

```sql
-- Which manifest unique an items row is. Before this column a unique row was
-- identified by guessing from base_id, which breaks as soon as two uniques
-- share a base (the_quiet_hour and emberheart both sit on moon_amulet).
alter table items add column if not exists unique_id text;

-- Backfill rows granted before the column existed. Unambiguous at this
-- moment: every pre-existing unique sits alone on its base, and the second
-- moon_amulet unique cannot predate this migration.
update items set unique_id = 'emberheart'
  where rarity = 'unique' and base_id = 'moon_amulet' and unique_id is null;
update items set unique_id = 'windrunner_band'
  where rarity = 'unique' and base_id = 'bone_ring' and unique_id is null;

-- admin_grant_item: adds p_unique_id, and relaxes the affix-value guard from
-- "> 0" to "non-zero". Unique items now carry negative affix values as
-- deliberate drawbacks; the old guard made every one of them ungrantable.
-- Body is otherwise verbatim from 20260731010000_items_fixes.sql.
create or replace function admin_grant_item(
  p_user_id uuid,
  p_base_id text,
  p_rarity text,
  p_affixes jsonb,
  p_level_req integer,
  p_slot text,
  p_class_restriction text default null,
  p_unique_id text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item_id uuid;
  v_affixes jsonb := coalesce(p_affixes, '[]'::jsonb);
  v_elem jsonb;
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin) then
    raise exception 'admin only';
  end if;

  if jsonb_typeof(v_affixes) <> 'array' then
    raise exception 'p_affixes must be a jsonb array';
  end if;

  for v_elem in select * from jsonb_array_elements(v_affixes) loop
    if jsonb_typeof(v_elem) <> 'object' then
      raise exception 'each affix must be a jsonb object';
    end if;

    if not (v_elem ? 'id') or (v_elem ->> 'id') not in
      ('max_health', 'max_mana', 'damage_pct', 'cast_speed_pct', 'move_speed_pct', 'mana_regen_pct', 'talent')
    then
      raise exception 'invalid affix id: %', v_elem ->> 'id';
    end if;

    if not (v_elem ? 'value') or jsonb_typeof(v_elem -> 'value') <> 'number' or (v_elem ->> 'value')::numeric = 0 then
      raise exception 'affix value must be a non-zero number';
    end if;

    if (v_elem ->> 'id') = 'talent' and (
      not (v_elem ? 'node') or jsonb_typeof(v_elem -> 'node') <> 'string' or length(trim(v_elem ->> 'node')) = 0
    ) then
      raise exception 'talent affix must include a non-empty node string';
    end if;
  end loop;

  insert into items (user_id, base_id, rarity, affixes, level_req, slot, class_restriction, source, unique_id)
  values (p_user_id, p_base_id, p_rarity, v_affixes, p_level_req, p_slot, p_class_restriction, 'admin', p_unique_id)
  returning id into v_item_id;

  return v_item_id;
end;
$$;
```

Note the return type is `uuid`, not the row — `client/src/supabase.ts` casts the result to `string`.

Do not run the migration. Do not call the Supabase management API. Applying it is a post-review step the user performs.

- [ ] **Step 7: Pass `unique_id` from the admin grant**

In `client/src/supabase.ts`, the `adminGrantItem` wrapper's rpc call (line ~184) gains a parameter. Add `uniqueId?: string | null` as a trailing argument to the exported function's signature and pass it:

```ts
    p_class_restriction: classRestriction ?? null,
    p_unique_id: uniqueId ?? null,
  });
```

In `client/src/admin/AdminScreen.ts`'s `handleGrant` (the `grantRarity === 'unique'` branch, around line 671), the local `unique` is already in scope. Add a `let uniqueId: string | null = null;` beside the other locals, set `uniqueId = unique.id;` in the unique branch, and pass it as the new trailing argument to the `adminGrantItem` call.

While in that file, extend the read-only manifest view's unique table (around line 467-488) with the two new columns — the aura style and whether the item carries an `lpcTint` — so the admin screen still shows a unique's full manifest entry:

```ts
        <td>${u.aura ? esc(u.aura.style) : '—'}</td>
        <td>${u.lpcTint ? esc(u.lpcTint.color) : '—'}</td>
```

with matching `<th>Aura</th><th>Tint</th>` header cells.

- [ ] **Step 8: Verify and commit**

```bash
npm run test --workspace=server
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
npm run test --workspace=client -- tests/AdminScreen.test.ts
git add supabase/migrations/20260802000000_item_unique_id.sql shared/src/economy.ts server/src/economy/service.ts client/src/admin/AdminScreen.ts client/src/supabase.ts server/tests/economy.test.ts
git commit -m "feat(items): persist unique_id on granted and dropped unique rows"
```

---

### Task 7: Band-weighted unique drop pool

`rollDropItem` picks uniformly over every unique the player out-levels, so at level 10 most unique drops would be level-1 items.

**Files:**
- Modify: `shared/src/economy.ts:117-136` (`rollDropItem`)
- Test: `server/tests/economy.test.ts`

**Interfaces:**
- Consumes: `DropResult.uniqueId` (Task 6).
- Produces: `export const UNIQUE_BAND_WEIGHT: { atBand: 8; belowBand: 1 }`

- [ ] **Step 1: Write the failing test**

Add to `server/tests/economy.test.ts`:

```ts
  it('weights unique drops toward the player band while keeping a lower-band tail', () => {
    const weights = { basic: 0, magic: 0, rare: 0, unique: 1 };
    const counts = new Map<number, number>();
    for (let s = 0; s < 400; s++) {
      const r = rollLootboxItem('premium', weights, 10, mulberry32(s));
      const u = UNIQUE_ITEMS.find(x => x.id === r.uniqueId)!;
      counts.set(u.levelReq, (counts.get(u.levelReq) ?? 0) + 1);
    }
    const atBand = counts.get(10) ?? 0;
    const below = 400 - atBand;
    expect(atBand).toBeGreaterThan(below);   // the band dominates
    expect(below).toBeGreaterThan(0);        // but lower bands still appear
  });
  it('still rolls a unique for a low-level account whose band has none above it', () => {
    const weights = { basic: 0, magic: 0, rare: 0, unique: 1 };
    const r = rollLootboxItem('premium', weights, 1, mulberry32(11));
    expect(r.rarity).toBe('unique');
    expect(UNIQUE_ITEMS.find(u => u.id === r.uniqueId)!.levelReq).toBe(1);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=server -- tests/economy.test.ts`
Expected: FAIL — `expected <n> to be greater than <m>` (uniform picking gives the band roughly a fifth of the rolls).

- [ ] **Step 3: Implement the weighting**

In `shared/src/economy.ts`, add above `rollDropItem`:

```ts
/** Relative weight of an at-band unique versus a lower-band one in a unique
 * drop roll. Uniform picking would hand a level-10 player a level-1 ring
 * most of the time, which reads as a bad drop for the rarest outcome in the
 * table; the tail keeps older uniques obtainable. */
export const UNIQUE_BAND_WEIGHT = { atBand: 8, belowBand: 1 } as const;
```

and replace the unique branch of `rollDropItem`:

```ts
  if (rolledRarity === 'unique') {
    const eligibleUniques = UNIQUE_ITEMS.filter(u => u.levelReq <= maxCharLevel);
    if (eligibleUniques.length > 0) {
      const band = levelToBand(maxCharLevel);
      const weightOf = (u: (typeof eligibleUniques)[number]) =>
        u.levelReq === band ? UNIQUE_BAND_WEIGHT.atBand : UNIQUE_BAND_WEIGHT.belowBand;
      const total = eligibleUniques.reduce((sum, u) => sum + weightOf(u), 0);
      let pick = rng() * total;
      let unique = eligibleUniques[eligibleUniques.length - 1];
      for (const u of eligibleUniques) {
        pick -= weightOf(u);
        if (pick < 0) { unique = u; break; }
      }
      const base = ITEM_BASES.find(b => b.id === unique.baseId)!;
      return { base, rarity: 'unique', affixes: unique.affixes, levelReq: unique.levelReq, uniqueId: unique.id };
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/economy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run test --workspace=server
git add shared/src/economy.ts server/tests/economy.test.ts
git commit -m "feat(economy): weight unique drops toward the player's item band"
```

---

### Task 8: `ParticleSystem` gravity scale and `emitAura`

Every particle currently takes the same `-80/s` gravity, so nothing can rise or float.

**Files:**
- Modify: `client/src/renderer/ParticleSystem.ts`
- Create: `client/tests/ParticleSystem.test.ts`

**Interfaces:**
- Consumes: `AuraStyle` (Task 3).
- Produces:
  - `ParticleSystem.emitAura(style: AuraStyle, color: readonly [number, number, number], x: number, y: number, z: number, opts?: { intensity?: number; motes?: number; phase?: number; moving?: boolean }): void`
  - `ParticleSystem.activeParticles(): number` (test seam)
  - `export const AURA_SOFT_CAP: number`

- [ ] **Step 1: Write the failing test**

Create `client/tests/ParticleSystem.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ParticleSystem, AURA_SOFT_CAP } from '../src/renderer/ParticleSystem';

const WHITE: readonly [number, number, number] = [1, 1, 1];

function sys(): ParticleSystem {
  return new ParticleSystem(new THREE.Scene());
}

describe('emitAura', () => {
  it('spawns particles for every style', () => {
    for (const style of ['embers', 'frost', 'orbit', 'drip'] as const) {
      const p = sys();
      p.emitAura(style, WHITE, 0, 20, 0);
      expect(p.activeParticles(), style).toBeGreaterThan(0);
    }
  });
  it('emits a wisp only while the wearer is moving', () => {
    const still = sys();
    still.emitAura('wisp', WHITE, 0, 2, 0, { moving: false });
    expect(still.activeParticles()).toBe(0);

    const running = sys();
    running.emitAura('wisp', WHITE, 0, 2, 0, { moving: true });
    expect(running.activeParticles()).toBeGreaterThan(0);
  });
  it('spawns one particle per mote for orbit', () => {
    const p = sys();
    p.emitAura('orbit', WHITE, 0, 20, 0, { motes: 3 });
    expect(p.activeParticles()).toBe(3);
  });
  it('applies the aura color rather than the default fire color', () => {
    const p = sys();
    p.emitAura('drip', [0.2, 0.4, 0.6], 0, 20, 0);
    p.update(1 / 60);
    const colors = (p as unknown as { colorBuffer: Float32Array }).colorBuffer;
    expect(colors[0]).toBeCloseTo(0.2, 5);
    expect(colors[1]).toBeCloseTo(0.4, 5);
    expect(colors[2]).toBeCloseTo(0.6, 5);
  });
  it('yields to spells: emits nothing once the pool is past the aura cap', () => {
    const p = sys();
    while (p.activeParticles() < AURA_SOFT_CAP) p.emitExplosion(0, 0, 0, 30);
    const before = p.activeParticles();
    p.emitAura('embers', WHITE, 0, 20, 0);
    expect(p.activeParticles()).toBe(before);
  });
  it('lets embers rise while drip falls', () => {
    // Compare each particle against its OWN start height — embers spawn with
    // a vertical jitter, so a fixed 20 is not a valid reference point.
    const y = (p: ParticleSystem) => (p as unknown as { posY: Float32Array }).posY[0];

    const rising = sys();
    rising.emitAura('embers', WHITE, 0, 20, 0);
    const risingStart = y(rising);

    const falling = sys();
    falling.emitAura('drip', WHITE, 0, 20, 0);
    const fallingStart = y(falling);

    for (let i = 0; i < 6; i++) { rising.update(1 / 60); falling.update(1 / 60); }

    expect(y(rising)).toBeGreaterThan(risingStart);
    expect(y(falling)).toBeLessThan(fallingStart);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=client -- tests/ParticleSystem.test.ts`
Expected: FAIL — `emitAura is not a function`.

- [ ] **Step 3: Add the gravity scale**

In `client/src/renderer/ParticleSystem.ts`:

Add the buffer beside the others (after `particleSize`):

```ts
  private gravityScale = new Float32Array(POOL_SIZE);
```

Give `spawn` an optional trailing parameter and record it:

```ts
  private spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    life: number, size: number,
    gravity = 1,
  ): void {
    const i = this.activeCount++;
    this.posX[i] = x; this.posY[i] = y; this.posZ[i] = z;
    this.velX[i] = vx; this.velY[i] = vy; this.velZ[i] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.particleSize[i] = size;
    this.gravityScale[i] = gravity;
    this.colorR[i] = DEFAULT_COLOR_R;
    this.colorG[i] = DEFAULT_COLOR_G;
    this.colorB[i] = DEFAULT_COLOR_B;
  }
```

In `update`, apply it and carry it in the swap-remove (the swap currently copies every parallel array — `gravityScale` must be added or particles inherit a neighbour's gravity):

```ts
        this.particleSize[i] = this.particleSize[last];
        this.gravityScale[i] = this.gravityScale[last];
```

```ts
      this.velY[i] -= 80 * this.gravityScale[i] * delta;
```

Every existing emitter passes nothing and keeps `gravity = 1`, so their behavior is unchanged.

- [ ] **Step 4: Add `emitAura` and the test seam**

Add near the top of the file:

```ts
import type { AuraStyle } from '@arena/shared';

// Auras yield to spells: they stop emitting at half the pool, well below the
// SOFT_CAP the spell emitters respect, so a Meteor and Rain exchange never
// loses particles to jewelry.
export const AURA_SOFT_CAP = Math.floor(POOL_SIZE * 0.5);
```

and these methods to the class:

```ts
  /** Live particle count — a seam for tests, which cannot inspect the GPU
   * buffers meaningfully. */
  activeParticles(): number {
    return this.activeCount;
  }

  /** Continuous ambient emission for a unique item's aura. Called at 30Hz by
   * SpellRenderer, which supplies the world anchor point, an animation phase
   * for the rotating styles, and whether the wearer is moving. */
  emitAura(
    style: AuraStyle,
    color: readonly [number, number, number],
    x: number, y: number, z: number,
    opts: { intensity?: number; motes?: number; phase?: number; moving?: boolean } = {},
  ): void {
    if (this.activeCount >= AURA_SOFT_CAP) return;
    const intensity = opts.intensity ?? 1;
    const phase = opts.phase ?? 0;

    const put = (
      px: number, py: number, pz: number,
      vx: number, vy: number, vz: number,
      life: number, size: number, gravity: number,
    ): void => {
      if (this.activeCount >= POOL_SIZE) return;
      const idx = this.activeCount;
      this.spawn(px, py, pz, vx, vy, vz, life, size, gravity);
      this.colorR[idx] = color[0];
      this.colorG[idx] = color[1];
      this.colorB[idx] = color[2];
    };

    switch (style) {
      case 'embers': {
        const count = intensity >= 1.3 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          put(
            x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 8, z + (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 6, 10 + Math.random() * 10, (Math.random() - 0.5) * 6,
            0.8 + Math.random() * 0.4, (4 + Math.random() * 3) * intensity, -0.05,
          );
        }
        break;
      }
      case 'frost':
        put(
          x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 10, z + (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 10, -3, (Math.random() - 0.5) * 10,
          0.9 + Math.random() * 0.3, (3 + Math.random() * 3) * intensity, 0.08,
        );
        break;
      case 'orbit': {
        const motes = opts.motes ?? 1;
        const radius = 14;
        for (let i = 0; i < motes; i++) {
          const angle = phase * 1.6 + (i * Math.PI * 2) / motes;
          put(
            x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius,
            0, 2, 0,
            0.25, (4 + Math.random() * 2) * intensity, 0,
          );
        }
        break;
      }
      case 'drip':
        put(
          x + (Math.random() - 0.5) * 8, y, z + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4,
          0.5 + Math.random() * 0.2, (3 + Math.random() * 3) * intensity, 1,
        );
        break;
      case 'wisp':
        if (!opts.moving) return;
        put(
          x + (Math.random() - 0.5) * 8, y + Math.random() * 4, z + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4, 4 + Math.random() * 4, (Math.random() - 0.5) * 4,
          0.45 + Math.random() * 0.2, (4 + Math.random() * 3) * intensity, 0.1,
        );
        break;
    }
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace=client -- tests/ParticleSystem.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit -p client/tsconfig.json
git add client/src/renderer/ParticleSystem.ts client/tests/ParticleSystem.test.ts
git commit -m "feat(vfx): per-particle gravity scale and unique-item aura emitters"
```

---

### Task 9: Emit auras from `SpellRenderer`

**Files:**
- Modify: `client/src/renderer/SpellRenderer.ts`, `client/src/renderer/sprites/SpriteCharacter.ts` (export a height helper)
- Test: `client/tests/uniqueAuras.test.ts` (create)

**Interfaces:**
- Consumes: `aurasForGear`, `GearVisuals` (Task 5); `emitAura`, `activeParticles` (Task 8).
- Produces:
  - `export function spriteWorldHeight(): number` from `SpriteCharacter.ts`
  - `export function auraAnchorY(anchor: AuraAnchor, spriteHeight: number): number` from `SpellRenderer.ts`
  - `export function isMoving(prev: Vec2 | undefined, next: Vec2): boolean` from `SpellRenderer.ts`

- [ ] **Step 1: Write the failing test**

Create `client/tests/uniqueAuras.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { auraAnchorY, isMoving } from '../src/renderer/SpellRenderer';
import { aurasForGear } from '@arena/shared';

describe('auraAnchorY', () => {
  it('orders feet below chest below head', () => {
    const h = 100;
    expect(auraAnchorY('feet', h)).toBeLessThan(auraAnchorY('chest', h));
    expect(auraAnchorY('chest', h)).toBeLessThan(auraAnchorY('head', h));
  });
  it('keeps every anchor inside the sprite', () => {
    const h = 100;
    for (const a of ['feet', 'chest', 'head'] as const) {
      expect(auraAnchorY(a, h)).toBeGreaterThanOrEqual(0);
      expect(auraAnchorY(a, h)).toBeLessThanOrEqual(h);
    }
  });
});

describe('isMoving', () => {
  it('is false with no previous sample', () => {
    expect(isMoving(undefined, { x: 10, y: 10 })).toBe(false);
  });
  it('is false for sub-threshold jitter', () => {
    expect(isMoving({ x: 10, y: 10 }, { x: 10.01, y: 10 })).toBe(false);
  });
  it('is true for a real step', () => {
    expect(isMoving({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true);
  });
});

describe('aura selection from gear', () => {
  it('picks the two loudest uniques a player is wearing', () => {
    const auras = aurasForGear({
      weapon: { base: 'gnarled_staff', unique: 'cinderfall' },        // 7
      amulet: { base: 'moon_amulet', unique: 'the_quiet_hour' },      // 10
      ring1: { base: 'bone_ring', unique: 'hunters_eye' },            // 1
    });
    expect(auras.map(a => a.unique.id)).toEqual(['the_quiet_hour', 'cinderfall']);
    expect(auras[0].aura.style).toBe('orbit');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=client -- tests/uniqueAuras.test.ts`
Expected: FAIL — `auraAnchorY is not exported`.

- [ ] **Step 3: Export the sprite height**

In `client/src/renderer/sprites/SpriteCharacter.ts`, extract the size expression already used at line 50 into an exported helper and call it from the constructor:

```ts
/** World-space height of a character sprite — the anchor space unique auras
 * position themselves in. */
export function spriteWorldHeight(): number {
  return FRAME * worldUnitsPerTexel() * SPRITE_SCALE;
}
```

and in the constructor: `const size = spriteWorldHeight();`

- [ ] **Step 4: Implement the pure helpers and the emission pass**

In `client/src/renderer/SpellRenderer.ts`, add imports (`aurasForGear`, `type AuraAnchor`, `type Vec2` from `@arena/shared`; `spriteWorldHeight` from `./sprites/SpriteCharacter`) and:

```ts
/** Where on the body an aura emits. Fractions of the sprite's world height:
 * feet just clear of the ground, chest at the midpoint, head near the top. */
export function auraAnchorY(anchor: AuraAnchor, spriteHeight: number): number {
  const fraction = anchor === 'feet' ? 0.08 : anchor === 'chest' ? 0.5 : 0.82;
  return spriteHeight * fraction;
}

// Below this per-sample step the player is standing still — position noise
// from interpolation should not make a wisp trail flicker on.
const AURA_MOVE_EPSILON = 0.5;

export function isMoving(prev: Vec2 | undefined, next: Vec2): boolean {
  if (!prev) return false;
  return Math.hypot(next.x - prev.x, next.y - prev.y) > AURA_MOVE_EPSILON;
}
```

Add fields to the class:

```ts
  // Auras run at half the continuous cadence — they are ambient, and the
  // pool is shared with every spell effect.
  private auraAccumulator = 0;
  private shouldEmitAura = false;
  private prevAuraPositions = new Map<string, Vec2>();
```

In `update(state)`, alongside the existing `emitAccumulator` block:

```ts
    this.auraAccumulator += delta;
    this.shouldEmitAura = this.auraAccumulator >= 1 / 30;
    if (this.shouldEmitAura) this.auraAccumulator %= 1 / 30;
```

and call `this.syncUniqueAuras(state);` immediately before `this.particles.update(delta);`.

Add the method:

```ts
  /** Ambient emission for the uniques each player is wearing. aurasForGear
   * caps this at MAX_AURAS_PER_PLAYER and picks the highest-levelReq items,
   * and emitAura bails at AURA_SOFT_CAP, so a crowded fight silently drops
   * auras rather than starving spell VFX. */
  private syncUniqueAuras(state: GameState): void {
    if (!this.shouldEmitAura) return;
    const height = spriteWorldHeight();
    const live = new Set<string>();
    for (const player of Object.values(state.players)) {
      live.add(player.id);
      const auras = aurasForGear(player.gear ?? {});
      const prev = this.prevAuraPositions.get(player.id);
      const moving = isMoving(prev, player.position);
      this.prevAuraPositions.set(player.id, { ...player.position });
      for (const { aura } of auras) {
        this.particles.emitAura(
          aura.style, aura.color,
          player.position.x, auraAnchorY(aura.anchor, height), player.position.y,
          { intensity: aura.intensity, motes: aura.motes, phase: this.elapsedTime, moving },
        );
      }
    }
    for (const id of this.prevAuraPositions.keys()) {
      if (!live.has(id)) this.prevAuraPositions.delete(id);
    }
  }
```

Note the axis mapping: `Vec2.y` is the world **z** coordinate, matching every other emitter call in this file (e.g. `emitRainImpact(entry.target.x, 0, entry.target.y, ...)`).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace=client -- tests/uniqueAuras.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck, run the client suite, commit**

```bash
npm run test --workspace=client
npx tsc --noEmit -p client/tsconfig.json
git add client/src/renderer/SpellRenderer.ts client/src/renderer/sprites/SpriteCharacter.ts client/tests/uniqueAuras.test.ts
git commit -m "feat(vfx): emit unique-item auras from the spell renderer"
```

---

### Task 10: Unique-tinted item icons, then eyeball the tints in-game

`buildIcon` composites a base's own LPC layers and already honours `layer.tint`, but only knows about `ItemBase` — so a unique's icon currently looks identical to its base.

**Files:**
- Modify: `client/src/items/itemIcon.ts`, `client/src/items/GearScreen.ts`, `client/src/items/ShopScreen.ts`, `client/src/lobby/LobbyUI.ts`
- Test: `client/tests/itemIcon.test.ts`

**Interfaces:**
- Consumes: `UniqueItem.lpcTint` (Task 3), `uniqueForRow` (Task 2).
- Produces:
  - `iconCellAttrs(base: ItemBase, unique?: UniqueItem): string`
  - `iconFor(base: ItemBase, unique?: UniqueItem): Promise<HTMLCanvasElement | null>`

- [ ] **Step 1: Write the failing test**

Add to `client/tests/itemIcon.test.ts`:

```ts
  it('tags a unique icon cell with its unique id so the tint applies', () => {
    const staff = ITEM_BASES.find(b => b.id === 'gnarled_staff')!;
    const cinderfall = UNIQUE_ITEMS.find(u => u.id === 'cinderfall')!;
    const attrs = iconCellAttrs(staff, cinderfall);
    expect(attrs).toContain('data-icon-base="gnarled_staff"');
    expect(attrs).toContain('data-icon-unique="cinderfall"');
  });
  it('omits the unique attribute for a plain base', () => {
    const staff = ITEM_BASES.find(b => b.id === 'gnarled_staff')!;
    expect(iconCellAttrs(staff)).not.toContain('data-icon-unique');
  });
  it('still emits nothing for a base with no sprite layers', () => {
    const ring = ITEM_BASES.find(b => b.id === 'bone_ring')!;
    expect(iconCellAttrs(ring)).toBe('');
  });
```

Add `UNIQUE_ITEMS` to that file's `@arena/shared` import list. Read the existing test file first and match its import style.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=client -- tests/itemIcon.test.ts`
Expected: FAIL — `Expected substring: "data-icon-unique=\"cinderfall\""`.

- [ ] **Step 3: Thread the unique through the icon builder**

In `client/src/items/itemIcon.ts`:

```ts
import type { ItemBase, UniqueItem } from '@arena/shared';
import { ITEM_BASES, LPC_ANIMATIONS, UNIQUE_ITEMS } from '@arena/shared';
```

Change `buildIcon` to take the unique and prefer its tint. Replace the layer-draw block:

```ts
async function buildIcon(base: ItemBase, unique?: UniqueItem): Promise<HTMLCanvasElement | null> {
```

```ts
    base.lpc.layers.forEach((layer, i) => {
      const img = images[i];
      if (!img) return;
      const tint = unique?.lpcTint?.color ?? layer.tint;
      const tintMode = unique?.lpcTint ? unique.lpcTint.mode : layer.tintMode;
      const source = tint ? tintSheet(img, img.width, img.height, tint, tintMode) : img;
      fctx.drawImage(source, 0, row * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME);
    });
```

Key the cache per (base, unique) and extend the two exported entry points:

```ts
export function iconFor(base: ItemBase, unique?: UniqueItem): Promise<HTMLCanvasElement | null> {
  const key = unique ? `${base.id}:${unique.id}` : base.id;
  let p = cache.get(key);
  if (!p) { p = buildIcon(base, unique); cache.set(key, p); }
  return p;
}

/** The sprite-icon hook for an item cell: only bases with sprite layers get
 * it, so applyItemIcons never scans cells that can't have an icon (rings,
 * amulets), and they keep their Font Awesome glyph permanently. A unique
 * tags its own id so its tint override reaches buildIcon. */
export function iconCellAttrs(base: ItemBase, unique?: UniqueItem): string {
  if (!base.lpc) return '';
  return ` data-icon-base="${base.id}"${unique ? ` data-icon-unique="${unique.id}"` : ''}`;
}

export function applyItemIcons(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-icon-base]').forEach(cell => {
    const base = ITEM_BASES.find(b => b.id === cell.dataset.iconBase);
    if (!base) return;
    const unique = cell.dataset.iconUnique
      ? UNIQUE_ITEMS.find(u => u.id === cell.dataset.iconUnique)
      : undefined;
    void iconFor(base, unique).then(master => {
      if (!master || !cell.isConnected) return;
      const copy = document.createElement('canvas');
      copy.width = master.width; copy.height = master.height;
      copy.getContext('2d')?.drawImage(master, 0, 0);
      copy.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      cell.replaceChildren(copy);
    });
  });
}
```

- [ ] **Step 4: Pass the unique at every call site**

In `client/src/items/GearScreen.ts`, `client/src/items/ShopScreen.ts` (lines ~273, ~311, ~340), and `client/src/lobby/LobbyUI.ts` (line ~491): wherever `iconCellAttrs(base)` is called for a row that could be unique, pass `uniqueForRow(item)`. Vendor slots (`ShopScreen`'s `sh-vslot-icon`) are only ever basic or magic, so they keep the one-argument call.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=client`
Expected: PASS.

- [ ] **Step 6: Eyeball the tints in the running app**

The tint hexes in the manifest are first guesses — `tintSheet` multiplies, so a hex reads darker than it looks, and `mode: 'fabric'` adds a screen pass that lifts it back up. They must be checked against real sprites.

```bash
npm run dev
```

Then in the app: sign in, open the Admin screen, grant yourself each of the nine tinted uniques (`kindling`, `threefold_draw`, `marshstrider_breeches`, `hollowhide_jerkin`, `cinderfall`, `quiverfrost`, `doomsayers_barbute`, `ninefold_ember`, `stormcallers_yew`), and equip them on the Gear screen. Check both the paperdoll and the inventory icon. Adjust the `lpcTint` hex and `mode` in `shared/src/items.ts` until each reads as its intended description (charred, white-hot, pale blue, and so on) and is clearly distinct from the untinted base.

**Note:** the admin grant path needs the migration from Task 6 applied to persist `unique_id`. If it has not been applied yet, the two `moon_amulet` uniques will both resolve to Emberheart — expected, and not a bug to chase. Every other unique still resolves via the base_id fallback.

Also confirm in a live match that auras appear, sit at the right body height, and stop during a heavy Meteor/Rain exchange rather than crowding out the spell VFX.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit -p client/tsconfig.json
git add client/src/items/itemIcon.ts client/src/items/GearScreen.ts client/src/items/ShopScreen.ts client/src/lobby/LobbyUI.ts client/tests/itemIcon.test.ts shared/src/items.ts
git commit -m "feat(items): tint unique item icons and tune the shipped tint hexes"
```

---

## Post-implementation

1. Full suites green: `npm run test --workspace=server && npm run test --workspace=client`, plus both typechecks.
2. `git status` clean — in particular `client/dist/` must be untouched.
3. **Then** apply `supabase/migrations/20260802000000_item_unique_id.sql`, packaged as a script the user runs. Per the project's process rule, a migration is applied only after the change has passed review.
