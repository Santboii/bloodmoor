# Unique Roll Ranges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `UNIQUE_ITEMS` from fixed affix values to Diablo II-style roll ranges, so two copies of the same unique differ and a lucky copy is worth hunting.

**Architecture:** `UniqueItem.affixes` becomes `UniqueAffixSpec[]` (`{id, min, max, node?}`) and a new pure `rollUnique(unique, rng)` produces the `RolledAffix[]` that gets stored. Bounds are stored numerically so that `max` is *always* the lucky roll — for a grant `+4→+7`, and for a drawback `-60→-35` where `-35` is the smaller penalty — which lets one formula compute roll quality for both. No schema change: rows already store affixes per-row, and `unique_id` already decouples a row's identity from its values.

**Tech Stack:** TypeScript monorepo (`shared` / `server` / `client` npm workspaces), Vitest.

Spec: [`docs/superpowers/specs/2026-08-02-unique-roll-ranges-design.md`](../specs/2026-08-02-unique-roll-ranges-design.md)

## Global Constraints

- `@arena/shared` resolves straight to `shared/src/index.ts` via a vitest/vite alias in both workspaces. **There is no build step for shared** — edits are live in both test suites.
- Server + shared tests: `npm run test --workspace=server -- tests/<file>`. Client tests: `npm run test --workspace=client -- tests/<file>`.
- Typecheck: `npx tsc --noEmit -p server/tsconfig.json` and `npx tsc --noEmit -p client/tsconfig.json`.
- **Never run `npm run build --workspace=client`** — `vite build` writes into the tracked `client/dist/` directory and dirties the checkout.
- Client tests run in the **node** environment (no jsdom). Only test pure functions and code that guards its own DOM access.
- Tests anchor items by **id**, never by array position in `ITEM_BASES` / `UNIQUE_ITEMS`.
- **`max` is always the lucky roll.** Grants and drawbacks alike. Nothing may special-case by sign.
- **Binary nodes do not roll.** A talent affix on a node with no `stackable` entry in `SKILL_NODES` must have `min === max`. Fixed at `+1`: `fire.meteor`, `archer.multishot`, `utility.ethereal_form`, `archer_utility.shadowstep`, `utility.phantom_step`, `archer_utility.combat_roll`.
- **A talent's `max` may never exceed its node's `stackable.softCap`.** This is what keeps an item from granting a keystone on its own.
- **No database migration.** Rows granted before this change keep their values and must still resolve and display correctly.
- `affixLabel`'s exact output strings are asserted by existing tests (`'+40 Max Health'`, `'-35 Max Health'`, `'+8% Damage'`, `'+2 Talent Rank'`). Refactors must preserve them byte-for-byte, including the ASCII hyphen.
- Do not use `--no-verify`. Do not apply any database migration.

---

### Task 1: The spec type, `rollUnique`, and a behavior-identical manifest

This task changes the *shape* of the manifest without changing any value: every affix becomes `min === max`, so every roll returns exactly what ships today. That makes the diff verifiable as behavior-preserving, and leaves the balance change to Task 2.

**Files:**
- Modify: `shared/src/items.ts` (types, label helpers, manifest, `rollUnique`)
- Modify: `shared/src/economy.ts` (`rollDropItem`)
- Modify: `client/src/admin/AdminScreen.ts` (preview, grant, manifest table)
- Test: `server/tests/items.test.ts`, `server/tests/economy.test.ts`

**Interfaces:**
- Consumes: `RolledAffix`, `AffixId`, `NodeId`, `rollInRange` (private, `shared/src/items.ts:491`), `UNIQUE_ITEMS`, `uniqueForRow`.
- Produces:
  - `export type UniqueAffixSpec = { id: AffixId; min: number; max: number; node?: NodeId }`
  - `UniqueItem.affixes` is now `UniqueAffixSpec[]`
  - `export function rollUnique(unique: UniqueItem, rng?: () => number): RolledAffix[]`
  - `export function affixValueText(id: AffixId, value: number): string` — `'+8%'`, `'-35'`, `'+2'`
  - `export function affixRangeText(spec: UniqueAffixSpec): string | null` — `null` when fixed
  - `DropResult.affixes` is unchanged (`RolledAffix[]`) — drops now carry a rolled array

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/items.test.ts` (add `rollUnique`, `affixValueText`, `affixRangeText`, `mulberry32` to the file's `@arena/shared` import list — `mulberry32` may already be imported):

```ts
describe('rollUnique', () => {
  const kindling = () => UNIQUE_ITEMS.find(u => u.id === 'kindling')!;

  it('produces one RolledAffix per spec, in order, carrying node through', () => {
    const u = kindling();
    const rolled = rollUnique(u, mulberry32(1));
    expect(rolled).toHaveLength(u.affixes.length);
    rolled.forEach((a, i) => {
      expect(a.id).toBe(u.affixes[i].id);
      expect(a.node).toBe(u.affixes[i].node);
    });
  });

  it('rolls every affix inside its own [min, max], across many seeds', () => {
    for (const u of UNIQUE_ITEMS) {
      for (let s = 0; s < 60; s++) {
        const rolled = rollUnique(u, mulberry32(s));
        rolled.forEach((a, i) => {
          const spec = u.affixes[i];
          expect(a.value, `${u.id} ${spec.id}`).toBeGreaterThanOrEqual(spec.min);
          expect(a.value, `${u.id} ${spec.id}`).toBeLessThanOrEqual(spec.max);
          expect(Number.isInteger(a.value), `${u.id} ${spec.id}`).toBe(true);
        });
      }
    }
  });

  it('is deterministic under an injected rng', () => {
    expect(rollUnique(kindling(), mulberry32(42))).toEqual(rollUnique(kindling(), mulberry32(42)));
  });

  it('always returns the single value for a fixed (min === max) affix', () => {
    const fixed = { id: 'cinderfall', spec: 0 };
    const u = UNIQUE_ITEMS.find(x => x.id === fixed.id)!;
    const spec = u.affixes.find(a => a.id === 'talent')!;
    expect(spec.min).toBe(spec.max);
    for (let s = 0; s < 30; s++) {
      const rolled = rollUnique(u, mulberry32(s));
      const got = rolled.find(a => a.node === spec.node)!;
      expect(got.value).toBe(spec.min);
    }
  });

  it('never emits a node key on a non-talent affix', () => {
    const rolled = rollUnique(kindling(), mulberry32(3));
    const dmg = rolled.find(a => a.id === 'damage_pct')!;
    expect(Object.prototype.hasOwnProperty.call(dmg, 'node')).toBe(false);
  });
});

describe('affix range text', () => {
  it('formats a signed value with its unit', () => {
    expect(affixValueText('max_health', 40)).toBe('+40');
    expect(affixValueText('max_health', -35)).toBe('-35');
    expect(affixValueText('damage_pct', 8)).toBe('+8%');
    expect(affixValueText('talent', 2)).toBe('+2');
  });
  it('returns null for a fixed spec', () => {
    expect(affixRangeText({ id: 'talent', min: 1, max: 1, node: 'fire.meteor' })).toBeNull();
  });
  it('renders a grant range with an en dash', () => {
    expect(affixRangeText({ id: 'damage_pct', min: 4, max: 8 })).toBe('+4%–+8%');
  });
  it('renders a drawback range worst-to-best with an arrow', () => {
    expect(affixRangeText({ id: 'max_health', min: -95, max: -55 })).toBe('-95 → -55');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL — `rollUnique is not a function`.

- [ ] **Step 3: Add the spec type and the roll/format helpers**

In `shared/src/items.ts`, add beside `RolledAffix` (line 17):

```ts
/** A unique's affix as authored: a range to roll within. Stored numerically,
 * so `max` is ALWAYS the lucky end — for a grant (+4→+7) and equally for a
 * drawback (-60→-35, where -35 is the smaller penalty). That invariant is what
 * lets roll quality use one formula for both. A fixed affix has min === max. */
export type UniqueAffixSpec = { id: AffixId; min: number; max: number; node?: NodeId };
```

Replace the `AFFIX_LABELS` / `affixLabel` block (currently `shared/src/items.ts:20-41`) with a version that composes from a shared value formatter, so ranges and labels cannot drift on which affixes carry a `%`:

```ts
const PCT_AFFIX_IDS = new Set<AffixId>([
  'damage_pct', 'cast_speed_pct', 'move_speed_pct', 'mana_regen_pct',
]);

const AFFIX_NAMES: Record<Exclude<AffixId, 'talent'>, string> = {
  max_health: 'Max Health',
  max_mana: 'Max Mana',
  damage_pct: 'Damage',
  cast_speed_pct: 'Cast Speed',
  move_speed_pct: 'Move Speed',
  mana_regen_pct: 'Mana Regen',
};

/** An affix's signed value with its unit and no stat name — '+8%', '-35'. */
export function affixValueText(id: AffixId, value: number): string {
  return `${value < 0 ? '-' : '+'}${Math.abs(value)}${PCT_AFFIX_IDS.has(id) ? '%' : ''}`;
}

/** Human-readable affix text, shared by the Gear, Shop, and Admin screens —
 * they each had a private copy that hardcoded '+', which renders a drawback
 * as '+-35 Max Health'. */
export function affixLabel(a: RolledAffix): string {
  if (a.id === 'talent') return `+${a.value} Talent Rank`;
  return `${affixValueText(a.id, a.value)} ${AFFIX_NAMES[a.id]}`;
}

/** True for a negative (drawback) affix — the UI renders these in a muted
 * red so the tradeoff is legible at a glance. Talent ranks are never
 * drawbacks. */
export function isDrawback(a: RolledAffix): boolean {
  return a.id !== 'talent' && a.value < 0;
}

/** The roll window as display text, or null when the affix is fixed.
 * Drawbacks read worst-to-best so the arrow points at the lucky end. */
export function affixRangeText(spec: UniqueAffixSpec): string | null {
  if (spec.min === spec.max) return null;
  const lo = affixValueText(spec.id, spec.min);
  const hi = affixValueText(spec.id, spec.max);
  return spec.max < 0 ? `${lo} → ${hi}` : `${lo}–${hi}`;
}
```

Change `UniqueItem`'s affixes field (currently `shared/src/items.ts:87`) to `affixes: UniqueAffixSpec[];` and update its doc comment to say the values are ranges.

Add `rollUnique` immediately after `rollItem`:

```ts
/** Roll a unique's affixes from its authored ranges. Pure and deterministic
 * given an rng — drops call this off the same seeded stream that picked the
 * item, so a seed still reproduces a whole drop. */
export function rollUnique(unique: UniqueItem, rng: () => number = Math.random): RolledAffix[] {
  return unique.affixes.map(spec => ({
    id: spec.id,
    value: rollInRange([spec.min, spec.max], rng),
    // Spread rather than assign: a `node: undefined` key would survive into
    // the stored JSON and break strict equality against manifest fixtures.
    ...(spec.node === undefined ? {} : { node: spec.node }),
  }));
}
```

`rollInRange` already handles negative bounds correctly (`lo + floor(r * (hi - lo + 1))`).

- [ ] **Step 4: Convert the manifest to fixed ranges**

In `UNIQUE_ITEMS`, rewrite every affix from `{ id, value: N }` to `{ id, min: N, max: N }`, keeping `node` where present and leaving every comment, id, name, flavor, `levelReq`, `lpcTint`, and `aura` untouched. Example, for `kindling`:

```ts
    affixes: [
      { id: 'damage_pct', min: 5, max: 5 },
      { id: 'talent', min: 1, max: 1, node: 'fire.volatile_ember' },
      { id: 'max_health', min: -35, max: -35 },
    ],
```

Apply the same mechanical transform to all fourteen entries. Values must not change in this task — Task 2 widens them.

- [ ] **Step 5: Update the shared consumers**

`shared/src/economy.ts` — import `rollUnique` alongside the existing imports, and in `rollDropItem`'s unique branch replace `affixes: unique.affixes` with `affixes: rollUnique(unique, rng)`. Everything else in that branch (base lookup, `levelReq`, `uniqueId`) is unchanged.

- [ ] **Step 6: Update the admin screen**

`client/src/admin/AdminScreen.ts` currently reads `unique.affixes` as if they were rolled values in three places.

Import `rollUnique`, `affixRangeText`, and the `UniqueAffixSpec` type from `@arena/shared`, then:

1. First export the stat name on its own, so the admin table can pair a range with a stat without reconstructing a label. Add to `shared/src/items.ts` beside the other label helpers:

```ts
/** An affix's stat name with no value — 'Max Health'. Talent affixes name
 * their node instead, which only the caller knows how to resolve. */
export function affixStatName(id: Exclude<AffixId, 'talent'>): string {
  return AFFIX_NAMES[id];
}
```

Then add a spec-label helper next to the existing `adminAffixLabel` in `AdminScreen.ts`:

```ts
/** Manifest tables show the authored window, not a roll. */
function adminSpecLabel(spec: UniqueAffixSpec): string {
  const value = affixRangeText(spec) ?? affixValueText(spec.id, spec.min);
  if (spec.id === 'talent') {
    const nodeName = SKILL_NODES.find(n => n.id === spec.node)?.name ?? spec.node ?? 'Talent';
    return `${value} ${nodeName}`;
  }
  return `${value} ${affixStatName(spec.id)}`;
}
```

2. **Manifest table** (around line 475): change `u.affixes.map(a => esc(adminAffixLabel(a)))` to `u.affixes.map(a => esc(adminSpecLabel(a)))`. It renders fixed values now and ranges automatically once Task 2 widens them.

3. **Grant preview** (around line 537): the unique branch currently maps `unique.affixes` through `adminAffixLabel`. Change it to render `this.grantPreviewAffixes` — the same rolled array the non-unique branch already previews — so what you see is what gets granted.

4. **`regeneratePreview`** (around line 671): handle uniques.

```ts
  private regeneratePreview(): void {
    if (this.grantRarity === 'unique') {
      const unique = UNIQUE_ITEMS.find(u => u.id === this.grantUniqueId);
      this.grantPreviewAffixes = unique ? rollUnique(unique, Math.random) : [];
      return;
    }
    const base = ITEM_BASES.find(b => b.id === this.grantBaseId);
    this.grantPreviewAffixes = base ? rollItem(base, this.grantRarity, Math.random) : [];
  }
```

5. Around line 620, `if (this.grantRarity !== 'unique') this.regeneratePreview();` becomes an unconditional `this.regeneratePreview();`, and the unique-picker change handler must also call it so switching item re-rolls. The reroll button's guard (`this.grantRarity !== 'basic'`, around line 563) already covers uniques once the preview exists — verify it renders in the unique branch too, and if that branch builds its own markup without the button, add it there.

6. **`handleGrant`** (around line 706): `affixes = unique.affixes` becomes `affixes = this.grantPreviewAffixes`, so the grant matches the preview exactly. Keep `uniqueId = unique.id`.

- [ ] **Step 7: Update the tests that assumed fixed manifest values**

In `server/tests/items.test.ts`:

- The drift-guard test (`unique upside stays within 1.5x its band top, drawbacks within 2.5x`) reads `a.value`. Change it to read `a.max` for the magnitude, keeping the same bounds for now — Task 2 replaces this test wholesale:

```ts
        const [, hi] = AFFIX_TIERS[a.id][bandIndex];
        const magnitude = Math.max(Math.abs(a.min), Math.abs(a.max));
        const ceiling = hi * (a.max < 0 ? 2.5 : 1.5);
        expect(magnitude, `${u.id} ${a.id}`).toBeLessThanOrEqual(ceiling);
```

- The `every shipped unique drawback renders without a doubled sign` test calls `affixLabel(a)` on manifest entries, which are specs now. Change it to check both ends of each range:

```ts
  it('every shipped unique range renders without a doubled sign at either end', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) {
        expect(affixLabel({ id: a.id, value: a.min, node: a.node }), u.id).not.toContain('+-');
        expect(affixLabel({ id: a.id, value: a.max, node: a.node }), u.id).not.toContain('+-');
      }
    }
  });
```

In `server/tests/economy.test.ts`, two tests assert a dropped unique's affixes equal the manifest's. Both become within-range assertions:

```ts
  it('rolls an eligible unique deterministically when maxCharLevel qualifies', () => {
    // A constant 0.9999 lands rollRarity on 'unique' and then selects the
    // last eligible entry — the_quiet_hour, the final manifest item. This is
    // one of the few places manifest order is load-bearing: re-sorting
    // UNIQUE_ITEMS means updating this id.
    const expected = UNIQUE_ITEMS.find(u => u.id === 'the_quiet_hour')!;
    const result = rollMatchDropItem(weights, 10, () => 0.9999);
    expect(result.rarity).toBe('unique');
    expect(result.base.id).toBe(expected.baseId);
    expect(result.levelReq).toBe(expected.levelReq);
    result.affixes.forEach((a, i) => {
      const spec = expected.affixes[i];
      expect(a.id).toBe(spec.id);
      expect(a.value).toBeGreaterThanOrEqual(spec.min);
      expect(a.value).toBeLessThanOrEqual(spec.max);
    });
  });
```

and the Task 6 test that did `expect(result.affixes).toEqual(manifest.affixes)`:

```ts
    const manifest = UNIQUE_ITEMS.find(u => u.id === result.uniqueId)!;
    expect(manifest).toBeDefined();
    expect(result.base.id).toBe(manifest.baseId);
    expect(result.levelReq).toBe(manifest.levelReq);
    result.affixes.forEach((a, i) => {
      expect(a.value).toBeGreaterThanOrEqual(manifest.affixes[i].min);
      expect(a.value).toBeLessThanOrEqual(manifest.affixes[i].max);
    });
```

- [ ] **Step 8: Run everything**

```bash
npm run test --workspace=server
npm run test --workspace=client
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
```
Expected: PASS. Because every range is `min === max`, all rolled values are identical to what shipped before — any behavioral test that breaks indicates a real mistake in the conversion, not an expected change.

- [ ] **Step 9: Commit**

```bash
git add shared/src/items.ts shared/src/economy.ts client/src/admin/AdminScreen.ts server/tests/items.test.ts server/tests/economy.test.ts
git commit -m "refactor(items): unique affixes become roll specs, values unchanged"
```

---

### Task 2: Widen the ranges, and guard them

**Files:**
- Modify: `shared/src/items.ts` (`UNIQUE_ITEMS` values only)
- Test: `server/tests/items.test.ts`

**Interfaces:**
- Consumes: `UniqueAffixSpec`, `rollUnique` (Task 1); `SKILL_NODES`, `AFFIX_TIERS`, `ITEM_LEVEL_BANDS`.
- Produces: no new exports — this task is manifest data plus its invariant tests.

- [ ] **Step 1: Write the failing invariant tests**

Add to `server/tests/items.test.ts`, inside the existing `describe('manifests')` block. Add `SKILL_NODES` to the file's import list if it is not already there.

```ts
  it('a talent affix on a non-stackable node never rolls', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) {
        if (a.id !== 'talent') continue;
        const node = SKILL_NODES.find(n => n.id === a.node)!;
        if (node.stackable) continue;
        expect(a.min, `${u.id} -> ${a.node}`).toBe(a.max);
      }
    }
  });

  // The set's rule is that an item shortens the tree investment a keystone
  // needs, never replaces it. A max roll above the soft cap would hand the
  // keystone over for free.
  it('no talent max roll exceeds its node soft cap', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) {
        if (a.id !== 'talent') continue;
        const node = SKILL_NODES.find(n => n.id === a.node)!;
        if (!node.stackable) continue;
        expect(a.max, `${u.id} -> ${a.node}`).toBeLessThanOrEqual(node.stackable.softCap);
      }
    }
  });

  it('every affix range is ordered min <= max', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) {
        expect(a.min, `${u.id} ${a.id}`).toBeLessThanOrEqual(a.max);
      }
    }
  });

  it('every unique has at least one rolling affix', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(u.affixes.some(a => a.max > a.min), u.id).toBe(true);
    }
  });
```

Replace the existing drift-guard test entirely with the two-bound version:

```ts
  // Drift guard. With ranges, guarding the max is the wrong test: Widow's Vow
  // already sits AT the old 1.5x ceiling, so centring a range on it puts the
  // max above. Guard the midpoint (what an average copy is worth) and give the
  // extreme its own, looser stop — a lucky roll beating the normal ceiling is
  // the point of the feature. Drawbacks carry a looser midpoint bound already,
  // so their hard stop is widened by the same proportion; a stop tighter than
  // the bound it backstops would reject rolls the bound permits.
  it('unique midpoints and extremes stay inside their band bounds', () => {
    for (const u of UNIQUE_ITEMS) {
      const bandIndex = ITEM_LEVEL_BANDS.indexOf(u.levelReq as (typeof ITEM_LEVEL_BANDS)[number]);
      expect(bandIndex, u.id).toBeGreaterThanOrEqual(0);
      for (const a of u.affixes) {
        if (a.id === 'talent') continue;
        const [, hi] = AFFIX_TIERS[a.id][bandIndex];
        const isDrawbackSpec = a.max < 0;
        const midpoint = Math.abs((a.min + a.max) / 2);
        const extreme = Math.max(Math.abs(a.min), Math.abs(a.max));
        expect(midpoint, `${u.id} ${a.id} midpoint`).toBeLessThanOrEqual(hi * (isDrawbackSpec ? 2.5 : 1.5));
        expect(extreme, `${u.id} ${a.id} extreme`).toBeLessThanOrEqual(hi * (isDrawbackSpec ? 3.5 : 2));
      }
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL on `every unique has at least one rolling affix` — after Task 1 every affix is fixed, so `a.max > a.min` is false everywhere. The other three invariants pass trivially against fixed values, which is correct; they become load-bearing in Step 3.

- [ ] **Step 3: Widen the ranges**

Replace each item's `affixes` array in `UNIQUE_ITEMS` with the values below. Everything else about each entry — id, name, flavor, comments, `levelReq`, `lpcTint`, `aura` — is unchanged.

```ts
// kindling
    affixes: [
      { id: 'damage_pct', min: 4, max: 6 },
      { id: 'talent', min: 1, max: 2, node: 'fire.volatile_ember' },
      { id: 'max_health', min: -45, max: -25 },
    ],

// threefold_draw — Multi-shot is a spell: binary, never rolls.
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'archer.multishot' },
      { id: 'cast_speed_pct', min: 2, max: 4 },
      { id: 'max_mana', min: -35, max: -18 },
    ],

// hunters_eye
    affixes: [
      { id: 'talent', min: 1, max: 2, node: 'fire.seeking_flame' },
      { id: 'talent', min: 1, max: 2, node: 'archer.guided' },
      { id: 'max_mana', min: 15, max: 26 },
      { id: 'damage_pct', min: -7, max: -3 },
    ],

// widows_vow
    affixes: [
      { id: 'max_mana', min: 60, max: 90 },
      { id: 'mana_regen_pct', min: 14, max: 22 },
      { id: 'cast_speed_pct', min: 3, max: 5 },
      { id: 'max_health', min: -115, max: -75 },
    ],

// marshstrider_breeches
    affixes: [
      { id: 'move_speed_pct', min: 5, max: 7 },
      { id: 'max_health', min: 35, max: 55 },
      { id: 'cast_speed_pct', min: -8, max: -4 },
    ],

// hollowhide_jerkin — both talents are binary nodes.
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'utility.ethereal_form' },
      { id: 'talent', min: 1, max: 1, node: 'archer_utility.shadowstep' },
      { id: 'max_health', min: 40, max: 60 },
      { id: 'mana_regen_pct', min: -45, max: -25 },
      { id: 'damage_pct', min: -8, max: -4 },
    ],

// cinderfall — Meteor is a spell: binary, never rolls.
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'fire.meteor' },
      { id: 'damage_pct', min: 4, max: 8 },
      { id: 'max_mana', min: -135, max: -85 },
      { id: 'cast_speed_pct', min: -11, max: -5 },
    ],

// quiverfrost — Freeze soft cap 3: a +1 copy needs three tree ranks to reach
// Deep Freeze, a +3 copy needs one.
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'archer.freeze' },
      { id: 'damage_pct', min: 6, max: 11 },
      { id: 'max_health', min: -95, max: -55 },
      { id: 'mana_regen_pct', min: -28, max: -12 },
    ],

// doomsayers_barbute
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'fire.cataclysm' },
      { id: 'talent', min: 1, max: 3, node: 'archer.wide_rain' },
      { id: 'max_health', min: 70, max: 100 },
      { id: 'move_speed_pct', min: -8, max: -4 },
    ],

// emberheart
    affixes: [
      { id: 'max_mana', min: 48, max: 72 },
      { id: 'damage_pct', min: 6, max: 10 },
      { id: 'talent', min: 1, max: 3, node: 'fire.volatile_ember' },
      { id: 'talent', min: 1, max: 2, node: 'fire.searing_heat' },
    ],

// windrunner_band
    affixes: [
      { id: 'move_speed_pct', min: 5, max: 8 },
      { id: 'cast_speed_pct', min: 4, max: 7 },
      { id: 'talent', min: 1, max: 3, node: 'archer.barrage' },
    ],

// ninefold_ember — Pyroclasm soft cap is 3, so max is 3, not 4. Midpoint 2.5
// against the old fixed 3 is a deliberate, slight downward move: the item
// keeps its ceiling and gains a chance of being worse.
    affixes: [
      { id: 'talent', min: 2, max: 3, node: 'fire.pyroclasm' },
      { id: 'damage_pct', min: 9, max: 15 },
      { id: 'max_health', min: -185, max: -115 },
      { id: 'cast_speed_pct', min: -11, max: -5 },
    ],

// stormcallers_yew — Piercing Rain soft cap is 3.
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'archer.sustained_rain' },
      { id: 'talent', min: 1, max: 3, node: 'archer.piercing_rain' },
      { id: 'cast_speed_pct', min: 4, max: 8 },
      { id: 'max_mana', min: -150, max: -90 },
      { id: 'move_speed_pct', min: -7, max: -3 },
    ],

// the_quiet_hour — both talents are binary nodes.
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'utility.phantom_step' },
      { id: 'talent', min: 1, max: 1, node: 'archer_utility.combat_roll' },
      { id: 'cast_speed_pct', min: 7, max: 12 },
      { id: 'max_health', min: -135, max: -85 },
      { id: 'max_mana', min: -90, max: -50 },
    ],
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: PASS, including `rollUnique`'s in-range checks from Task 1 and the pre-existing 2-talent cap test.

- [ ] **Step 5: Run the full suites**

```bash
npm run test --workspace=server
npm run test --workspace=client
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/items.ts server/tests/items.test.ts
git commit -m "feat(items): D2-style roll ranges on every unique"
```

---

### Task 3: Roll quality, and the Gear screen display

**Files:**
- Modify: `shared/src/items.ts` (`rollQuality`)
- Modify: `client/src/items/GearScreen.ts` (details panel + styles)
- Test: `server/tests/items.test.ts`

**Interfaces:**
- Consumes: `UniqueAffixSpec`, `rollUnique`, `affixRangeText`, `affixLabel`, `isDrawback` (Task 1); `uniqueForRow`.
- Produces: `export function rollQuality(unique: UniqueItem, affixes: RolledAffix[]): number | null`

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/items.test.ts`. Add `rollQuality` to the value import list, and `UniqueItem` and `RolledAffix` to the file's existing `import type { ... } from '@arena/shared'` line.

```ts
describe('rollQuality', () => {
  const byId = (id: string): UniqueItem => UNIQUE_ITEMS.find(u => u.id === id)!;

  const atEnd = (u: UniqueItem, end: 'min' | 'max'): RolledAffix[] =>
    u.affixes.map(s => ({ id: s.id, value: s[end], ...(s.node === undefined ? {} : { node: s.node }) }));

  it('is 1 for an all-max roll and 0 for an all-min roll', () => {
    const u = byId('quiverfrost');
    expect(rollQuality(u, atEnd(u, 'max'))).toBe(1);
    expect(rollQuality(u, atEnd(u, 'min'))).toBe(0);
  });

  // max is the lucky end for a drawback too (-55 beats -95), so the drawback
  // affixes must not drag an all-max roll below 1.
  it('treats a drawback max as the lucky end, not the unlucky one', () => {
    const u = byId('quiverfrost');
    expect(u.affixes.some(a => a.max < 0)).toBe(true);
    expect(rollQuality(u, atEnd(u, 'max'))).toBe(1);
  });

  it('averages partial rolls', () => {
    // move 5-7, health 35-55, cast -8..-4 — all three at their midpoint.
    const u = byId('marshstrider_breeches');
    const mid: RolledAffix[] = u.affixes.map(s => ({ id: s.id, value: (s.min + s.max) / 2 }));
    expect(rollQuality(u, mid)).toBeCloseTo(0.5, 5);
  });

  it('ignores fixed affixes rather than counting them as perfect', () => {
    // Meteor is fixed; the three numeric affixes roll. An all-min roll must be
    // 0, not pulled up by the fixed talent.
    const u = byId('cinderfall');
    expect(rollQuality(u, atEnd(u, 'min'))).toBe(0);
  });

  it('returns null when nothing about the item rolls', () => {
    const frozen: UniqueItem = {
      ...byId('kindling'),
      affixes: [{ id: 'damage_pct', min: 5, max: 5 }],
    };
    expect(rollQuality(frozen, [{ id: 'damage_pct', value: 5 }])).toBeNull();
  });

  it('every shipped unique yields a quality between 0 and 1 for real rolls', () => {
    for (const u of UNIQUE_ITEMS) {
      for (let s = 0; s < 20; s++) {
        const q = rollQuality(u, rollUnique(u, mulberry32(s)));
        expect(q, u.id).not.toBeNull();
        expect(q!, u.id).toBeGreaterThanOrEqual(0);
        expect(q!, u.id).toBeLessThanOrEqual(1);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: FAIL — `rollQuality is not a function`.

- [ ] **Step 3: Implement `rollQuality`**

Add to `shared/src/items.ts`, after `rollUnique`:

```ts
/** How lucky a rolled copy is: the unweighted mean of each rolling affix's
 * position in its window, 0 (all minimum) to 1 (all maximum). Because `max` is
 * the lucky end for grants AND drawbacks alike, one formula covers both with
 * no sign special-casing. Fixed affixes are skipped rather than counted as
 * perfect, so a mostly-binary item is judged only on what actually varied.
 * Returns null when nothing on the item rolls. */
export function rollQuality(unique: UniqueItem, affixes: RolledAffix[]): number | null {
  let sum = 0;
  let count = 0;
  for (const spec of unique.affixes) {
    if (spec.max === spec.min) continue;
    const rolled = affixes.find(a => a.id === spec.id && a.node === spec.node);
    if (!rolled) continue;
    sum += (rolled.value - spec.min) / (spec.max - spec.min);
    count++;
  }
  return count === 0 ? null : sum / count;
}
```

Matching by `id` plus `node` rather than by index keeps this correct for rows whose affix order differs from the manifest's.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=server -- tests/items.test.ts`
Expected: PASS.

- [ ] **Step 5: Show the range and quality on the Gear screen**

In `client/src/items/GearScreen.ts`, add `rollQuality` and `affixRangeText` to the `@arena/shared` import list.

Replace the `affixHtml` block in the details panel (currently `client/src/items/GearScreen.ts:455-465`) with a version that appends each affix's window:

```ts
    const affixHtml = item.affixes.map(a => {
      const spec = unique?.affixes.find(s => s.id === a.id && s.node === a.node);
      const range = spec ? affixRangeText(spec) : null;
      const rangeHtml = range ? ` <span class="gr-range">(${esc(range)})</span>` : '';
      if (a.id === 'talent' && a.node) {
        const node = SKILL_NODES.find(n => n.id === a.node);
        const nodeName = node?.name ?? a.node;
        const owned = classOwnsTree(this.charClass, a.node);
        const label = `+${a.value} ${nodeName}${owned ? '' : ' (inert for this class)'}`;
        return `<div class="gr-details-row${owned ? '' : ' gr-dim'}">${esc(label)}${rangeHtml}</div>`;
      }
      return `<div class="gr-details-row${isDrawback(a) ? ' gr-bad' : ''}">${esc(affixLabel(a))}${rangeHtml}</div>`;
    }).join('');
```

Directly below that, build the quality row:

```ts
    const quality = unique ? rollQuality(unique, item.affixes) : null;
    const qualityHtml = quality === null ? '' : (quality === 1
      ? `<div class="gr-details-row gr-perfect">PERFECT ROLL</div>`
      : `<div class="gr-details-row gr-quality">Roll quality ${Math.round(quality * 100)}%</div>`);
```

Insert `${qualityHtml}` into the panel template immediately after `${flavorHtml}`, so it reads under the item's name before the stat list. Find the template literal that already interpolates `flavorHtml` and add it there.

Add to the `STYLES` template, beside the existing `.gr-details-row` and `.gr-bad` rules:

```css
.gr-range{color:var(--px-text-dim,#8a8f9c);font-size:14px;}
.gr-quality{color:var(--px-text-dim,#8a8f9c);letter-spacing:1px;}
.gr-perfect{color:var(--px-accent);letter-spacing:1px;}
```

- [ ] **Step 6: Verify and commit**

```bash
npm run test --workspace=server
npm run test --workspace=client
npx tsc --noEmit -p client/tsconfig.json
npx tsc --noEmit -p server/tsconfig.json
git add shared/src/items.ts client/src/items/GearScreen.ts server/tests/items.test.ts
git commit -m "feat(items): show roll ranges and roll quality on the gear screen"
```

---

## Post-implementation

1. Both suites green and both typechecks clean; `git status` clean with `client/dist/` untouched.
2. No migration is involved in this plan. The migration written by the previous plan (`supabase/migrations/20260802000000_item_unique_id.sql`) is still unapplied and still must be applied before or with the code deploy.
3. Items granted before this change keep their fixed values. On the Gear screen they render with a range beside each affix and a quality figure computed against the new window — an old fixed-value copy will therefore usually read as a middling roll, which is accurate.
