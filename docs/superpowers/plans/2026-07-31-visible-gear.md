# Visible Gear (Itemization Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equipped weapon/helmet/armor/leggings render as LPC sprite layers on the character (arena, gear-screen paperdoll, lobby hero), and item icons become crops of those same sheets so icon and character always match.

**Architecture:** Each visible `ItemBase` gains an `lpc` manifest field (layer paths + fixed tint). A shared pure function `layersForLoadout(appearance, gear)` merges gear into the appearance layer list; the server stamps a tiny `gear` object (≤4 base ids) onto `PlayerState` from the equipped items it already loads; the client compositor consumes the merged layers. Icons are runtime canvas crops of the vendored sheets, tinted by the same routine the compositor uses.

**Tech Stack:** TypeScript monorepo (`@arena/shared` workspace consumed by `client/` and `server/`), Three.js + canvas 2D on the client, Vitest (server tests in `server/tests`, client tests in `client/tests`, both run with `npm test` inside each workspace). Assets vendored from the Universal LPC Spritesheet Generator by `scripts/vendor-lpc.mjs` (`node scripts/vendor-lpc.mjs` from repo root).

## Global Constraints

(From `docs/superpowers/specs/2026-07-31-visible-gear-design.md` and the Phase 1 spec it extends.)

- **No DB schema changes** — every visual derives from `base_id`.
- Server authority: the client never tells the server what gear looks like; the server derives `gear` from its own validated item rows.
- Defensive validation at every boundary: unknown base ids in a gear payload are ignored, never thrown on (the `validateItemRow` posture).
- Color is **fixed per base**; rarity is expressed only on borders/name colors, never on the item's sprite color.
- Rings/amulets stay stat-only: no sprite layers, they keep their Font Awesome glyphs.
- Missing sheet for an animation → layer skipped for that animation only (existing compositor behavior). Exception added by this plan: a missing `idle` sheet falls back to the layer's `walk` sheet frame 0.
- Licensing: `scripts/vendor-lpc.mjs` must exit non-zero if any vendored sheet lacks a `CREDITS.csv` row. Never bypass it. Commit `CREDITS.filtered.csv` alongside the sheets.
- XSS discipline: player-controlled strings through `esc()`/`textContent`. Base ids are manifest constants, safe to interpolate.
- Pixel theme kit for all UI (`px-*` classes, `image-rendering: pixelated` for sprite canvases).
- Both suites stay green and grow: `cd server && npm test`, `cd client && npm test`. TypeScript must compile: `cd client && npx tsc --noEmit`, `cd server && npx tsc --noEmit`.
- Spec correction discovered during planning: character select has **no** per-card sprite preview (only the Edit Look `AppearancePicker`, which must keep showing base appearance, not gear — it edits the under-gear look). The menu surface that shows the character is the **lobby hero** preview; Task 6 targets that instead.

## Verified upstream asset map

All paths below were verified against the live GitHub tree of
`LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator` (master) on
2026-07-31, including the matching `CREDITS.csv` filename keys. Upstream file
layouts encountered:

- **plain**: `<dir>/<anim>.png` (barbuta, armour/leather, chainmail, leggings)
- **colored**: `<dir>/<anim>/<color>.png` (leather_cap, staves, bows)
- **bows only**: `walk` lives in a different subtree than `shoot`/`hurt`
  (`bow/<model>/walk/{background,foreground}/<color>.png` vs
  `bow/<model>/universal/{background,foreground}/{shoot,hurt}/<color>.png`)

| Base id | Layer path(s) (local, manifest) | Upstream coverage of our 6 anims | Notes |
|---|---|---|---|
| `leather_cap` | `hat/cloth/leather_cap/adult/leather` | all 6 | colored layout, color `leather` |
| `iron_helm` | `hat/helmet/barbuta/{body}` | all 6 | plain layout; `hidesHair` |
| `padded_tunic` | `torso/armour/leather/{body}` | all 6 | plain layout |
| `scale_mail` | `torso/chainmail/{body}` | all 6 | plain layout |
| `cloth_pants` | `legs/pants/{legs}` (already vendored) | all 6 | tint `#c9a86a`, fabric |
| `mail_leggings` | `legs/leggings/{legs}` | all 6 | plain layout, tint `#9a9aa2`, fabric |
| `apprentice_staff` | `weapon/magic/simple/background/simple` + `.../foreground/simple` | walk, spellcast, hurt | colored layout, color `simple` |
| `gnarled_staff` | `weapon/magic/gnarled/universal/background/gnarled` + `.../foreground/gnarled` | walk, hurt | colored layout |
| `archmage_staff` | `weapon/magic/crystal/universal/background/purple` + `.../foreground/purple` | walk, hurt | colored layout |
| `short_bow` | `weapon/ranged/bow/normal/universal/background/normal` + `.../foreground/normal` | walk, shoot, hurt | walk needs src override |
| `war_bow` | `weapon/ranged/bow/recurve/universal/background/recurve` + `.../foreground/recurve` | walk, shoot, hurt | walk needs src override |
| `great_bow` | `weapon/ranged/bow/great/universal/background/great` + `.../foreground/great` | walk, shoot, hurt | walk needs src override |

Accepted degradation (per spec): weapons have no `run` or (except the simple
staff) `spellcast` sheets, and no weapon has an `idle` sheet — Task 4's
idle-from-walk fallback covers idle; during `run` and non-covered casts the
weapon is simply not drawn. Note in-game locomotion is `walk` below 220
units/s and base speed is 200, so weapons ARE visible during normal movement.

`{body}` substitutes the appearance's `male`/`female`; `{legs}` substitutes
`male`/`thin` (the female pants fit — same rule `layersFor` uses today).

---

### Task 1: Vendor the gear sheets (with licensing gate)

**Files:**
- Modify: `scripts/vendor-lpc.mjs` (LAYERS list + per-anim source overrides)
- Create (generated): `client/public/assets/lpc/**` new sheet dirs, updated `client/public/assets/lpc/CREDITS.filtered.csv`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: vendored sheets at exactly the local layer paths in the table above (each dir containing `<anim>.png` files), which Task 2's manifest paths and Task 4's compositor loads rely on verbatim.

- [ ] **Step 1: Extend the LAYERS list and add override support**

In `scripts/vendor-lpc.mjs`, allow entries to be either a string (existing
behavior) or `{ dest, srcByAnim }` where `dest` is the local layer path (and
default fetch source) and `srcByAnim` maps an animation to a different
upstream layer path. Replace the `LAYERS` array tail and the fetch loop:

```js
// Append to LAYERS (after the existing entries):
  // ── Phase 3 visible gear (see docs/superpowers/specs/2026-07-31-visible-gear-design.md) ──
  'hat/cloth/leather_cap/adult/leather',
  'hat/helmet/barbuta/male',
  'hat/helmet/barbuta/female',
  'torso/armour/leather/male',
  'torso/armour/leather/female',
  'torso/chainmail/male',
  'torso/chainmail/female',
  'legs/leggings/male',
  'legs/leggings/thin',
  'weapon/magic/simple/background/simple',
  'weapon/magic/simple/foreground/simple',
  'weapon/magic/gnarled/universal/background/gnarled',
  'weapon/magic/gnarled/universal/foreground/gnarled',
  'weapon/magic/crystal/universal/background/purple',
  'weapon/magic/crystal/universal/foreground/purple',
  // Bows keep their walk sheets in a sibling subtree (walk/{background,
  // foreground}/<color>.png) instead of under universal/ — srcByAnim points
  // the walk fetch there while shoot/hurt use the dest path as usual.
  { dest: 'weapon/ranged/bow/normal/universal/background/normal',
    srcByAnim: { walk: 'weapon/ranged/bow/normal/walk/background/normal' } },
  { dest: 'weapon/ranged/bow/normal/universal/foreground/normal',
    srcByAnim: { walk: 'weapon/ranged/bow/normal/walk/foreground/normal' } },
  { dest: 'weapon/ranged/bow/recurve/universal/background/recurve',
    srcByAnim: { walk: 'weapon/ranged/bow/recurve/walk/background/recurve' } },
  { dest: 'weapon/ranged/bow/recurve/universal/foreground/recurve',
    srcByAnim: { walk: 'weapon/ranged/bow/recurve/walk/foreground/recurve' } },
  { dest: 'weapon/ranged/bow/great/universal/background/great',
    srcByAnim: { walk: 'weapon/ranged/bow/great/walk/background/great' } },
  { dest: 'weapon/ranged/bow/great/universal/foreground/great',
    srcByAnim: { walk: 'weapon/ranged/bow/great/walk/foreground/great' } },
```

```js
// Replace the fetch loop with a normalized-entry version. The `saved` set
// must record the SOURCE layer path (what was fetched) — filterCredits
// matches upstream CSV keys, and for overridden anims those differ from dest.
const entries = LAYERS.map(l => typeof l === 'string' ? { dest: l, srcByAnim: {} } : l);
const seen = new Set();
for (const entry of entries) {
  if (seen.has(entry.dest)) continue;
  seen.add(entry.dest);
  for (const anim of ANIMS) {
    const srcLayer = entry.srcByAnim[anim] ?? entry.dest;
    const dest = join(OUT, entry.dest, `${anim}.png`);
    let wasSaved = false;
    for (const url of candidates(srcLayer, anim)) {
      const res = await fetch(url);
      if (res.ok) {
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(await res.arrayBuffer()));
        ok++; wasSaved = true;
        saved.add(`${srcLayer}/${anim}`);
        break;
      }
    }
    if (!wasSaved) missing.push(`${srcLayer}/${anim}`);
  }
}
```

(`candidates()` and `filterCredits()` need no changes: for a colored-layout
source layer `.../background/normal` + anim `shoot`, the credits fallback
`parentDir/anim.png` → `.../background/shoot.png` is exactly the CSV key —
verified for every asset in the map above.)

- [ ] **Step 2: Run the vendor script**

Run from repo root: `node scripts/vendor-lpc.mjs`

Expected: `saved N sheets` where the new sheets cover the table above; a
MISSING list containing ONLY expected gaps — for the weapon layers: `idle`,
`run`, `shoot`, `spellcast` for staves (except `spellcast` present for
`magic/simple`), and `idle`, `run`, `spellcast` for bows. Any MISSING line
for a helmet/torso/legs sheet, or a `filterCredits` non-zero exit, is a stop
condition: re-check the path against the upstream repo before proceeding.

- [ ] **Step 3: Spot-verify the files and credits**

```bash
ls client/public/assets/lpc/torso/chainmail/male   # expect idle.png run.png walk.png spellcast.png shoot.png hurt.png
ls client/public/assets/lpc/weapon/ranged/bow/normal/universal/foreground/normal  # expect walk.png shoot.png hurt.png
grep -c "" client/public/assets/lpc/CREDITS.filtered.csv  # row count grew vs git HEAD
```

- [ ] **Step 4: Commit**

```bash
git add scripts/vendor-lpc.mjs client/public/assets/lpc
git commit -m "feat(assets): vendor LPC sheets for visible gear (13 bases)"
```

---

### Task 2: Shared gear-visuals manifest + `layersForLoadout` (TDD)

**Files:**
- Modify: `shared/src/items.ts` (add `GearLayer`/`ItemBaseLpc` types, `lpc` field on `ItemBase`, lpc data on the 13 visible bases)
- Create: `shared/src/gearVisuals.ts`
- Modify: `shared/src/index.ts` (re-export the new module — mirror how `items.js` is exported)
- Test: `server/tests/gear-visuals.test.ts`

**Interfaces:**
- Consumes: `layersFor(a)`, `LpcLayer`, `Appearance` from `shared/src/appearance.ts`; `ITEM_BASES`, `ItemRow` from `shared/src/items.ts`.
- Produces (relied on by Tasks 3–6):
  - `type GearVisualSlot = 'helmet' | 'armor' | 'leggings' | 'weapon'`
  - `type GearVisuals = Partial<Record<GearVisualSlot, string>>` (values are base ids)
  - `function gearVisualsFor(items: ItemRow[]): GearVisuals`
  - `function layersForLoadout(a: Appearance, gear: GearVisuals): LpcLayer[]`
  - `ItemBase.lpc?: ItemBaseLpc` where `type GearLayer = { path: string; z: number; tint?: string; tintMode?: 'fabric' }` and `type ItemBaseLpc = { layers: GearLayer[]; hidesHair?: boolean }`

- [ ] **Step 1: Write the failing tests**

Create `server/tests/gear-visuals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  layersForLoadout, gearVisualsFor, layersFor,
  CLASS_DEFAULT_APPEARANCE, ITEM_BASES, APPEARANCE_OPTIONS,
} from '@arena/shared';
import type { Appearance, GearVisuals, ItemRow } from '@arena/shared';

function row(base_id: string, equipped_slot: ItemRow['equipped_slot']): ItemRow {
  const base = ITEM_BASES.find(b => b.id === base_id)!;
  return {
    id: `row-${base_id}`, base_id, rarity: 'basic', affixes: [],
    level_req: base.itemLevel, equipped_by: 'char1', equipped_slot,
    slot: base.slot,
  };
}

const MAGE: Appearance = CLASS_DEFAULT_APPEARANCE.mage;      // male, wizard hat
const RANGER: Appearance = CLASS_DEFAULT_APPEARANCE.ranger;  // female, ponytail, no hat

describe('gearVisualsFor', () => {
  it('maps equipped visible slots to base ids', () => {
    const gear = gearVisualsFor([
      row('iron_helm', 'helmet'), row('padded_tunic', 'armor'),
      row('mail_leggings', 'leggings'), row('gnarled_staff', 'weapon'),
    ]);
    expect(gear).toEqual({
      helmet: 'iron_helm', armor: 'padded_tunic',
      leggings: 'mail_leggings', weapon: 'gnarled_staff',
    });
  });
  it('ignores rings, amulets, and unequipped rows', () => {
    const stashRow = { ...row('iron_helm', 'helmet'), equipped_by: null, equipped_slot: null };
    expect(gearVisualsFor([row('bone_ring', 'ring1'), row('moon_amulet', 'amulet'), stashRow]))
      .toEqual({});
  });
});

describe('layersForLoadout', () => {
  it('returns plain appearance layers for empty gear', () => {
    expect(layersForLoadout(MAGE, {})).toEqual(layersFor(MAGE));
  });
  it('helmet replaces the hat layer', () => {
    const layers = layersForLoadout(MAGE, { helmet: 'leather_cap' });
    expect(layers.some(l => l.path.startsWith('hat/magic/wizard'))).toBe(false);
    expect(layers.some(l => l.path === 'hat/cloth/leather_cap/adult/leather')).toBe(true);
  });
  it('hidesHair helmets also drop above-head hair; plain helmets keep it', () => {
    const capped = layersForLoadout(RANGER, { helmet: 'leather_cap' });
    expect(capped.some(l => l.path === 'hair/ponytail/adult/fg')).toBe(true);
    const helmed = layersForLoadout(RANGER, { helmet: 'iron_helm' });
    expect(helmed.some(l => l.path === 'hair/ponytail/adult/fg')).toBe(false);
    // behind-body hair (bg, z0) survives — it reads as back hair below the helm
    expect(helmed.some(l => l.path === 'hair/ponytail/adult/bg')).toBe(true);
    expect(helmed.some(l => l.path === 'hat/helmet/barbuta/female')).toBe(true);
  });
  it('armor replaces torso and substitutes {body}', () => {
    const layers = layersForLoadout(RANGER, { armor: 'scale_mail' });
    expect(layers.some(l => l.path.startsWith('torso/clothes/'))).toBe(false);
    expect(layers.some(l => l.path === 'torso/chainmail/female')).toBe(true);
  });
  it('leggings replace legs and use the thin fit for female', () => {
    const layers = layersForLoadout(RANGER, { leggings: 'mail_leggings' });
    expect(layers.some(l => l.path === 'legs/pants/thin')).toBe(false);
    const legs = layers.find(l => l.path === 'legs/leggings/thin');
    expect(legs).toBeDefined();
    expect(legs!.tint).toBe('#9a9aa2');
    expect(legs!.tintMode).toBe('fabric');
  });
  it('weapon appends background below the body and foreground on top', () => {
    const layers = layersForLoadout(MAGE, { weapon: 'gnarled_staff' });
    const paths = layers.map(l => l.path);
    const bg = paths.indexOf('weapon/magic/gnarled/universal/background/gnarled');
    const body = paths.indexOf('body/bodies/male');
    const fg = paths.indexOf('weapon/magic/gnarled/universal/foreground/gnarled');
    expect(bg).toBeGreaterThanOrEqual(0);
    expect(bg).toBeLessThan(body);
    expect(fg).toBe(paths.length - 1);
  });
  it('ignores unknown and non-visual base ids', () => {
    expect(layersForLoadout(MAGE, { helmet: 'nope', weapon: 'bone_ring' }))
      .toEqual(layersFor(MAGE));
  });
  it('never leaves an unsubstituted token for any body/base combination', () => {
    const visible = ITEM_BASES.filter(b => b.lpc);
    expect(visible.length).toBe(13);
    for (const body of APPEARANCE_OPTIONS.body) {
      const a: Appearance = { ...MAGE, body };
      for (const base of visible) {
        const slot = base.slot === 'weapon' ? 'weapon' : base.slot as 'helmet' | 'armor' | 'leggings';
        for (const layer of layersForLoadout(a, { [slot]: base.id } as GearVisuals)) {
          expect(layer.path).not.toContain('{');
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/gear-visuals.test.ts`
Expected: FAIL — `gearVisualsFor`/`layersForLoadout` are not exported.

- [ ] **Step 3: Add the manifest data and implementation**

In `shared/src/items.ts`, add above `ItemBase`:

```ts
/** One LPC sheet layer a visible base contributes. Paths may contain the
 * tokens '{body}' (male|female) and '{legs}' (male|thin pants fit) which
 * layersForLoadout substitutes from the wearer's appearance. */
export type GearLayer = { path: string; z: number; tint?: string; tintMode?: 'fabric' };
export type ItemBaseLpc = {
  layers: GearLayer[];
  /** Full helms that would clip badly with above-head hair. */
  hidesHair?: boolean;
};
```

Add `lpc?: ItemBaseLpc;` to the `ItemBase` type, then attach to the catalog
entries (weapon background sits below the body at z 5; foreground above the
hat slot at z 70; helmet/armor/leggings reuse the slot z they replace):

```ts
// leather_cap:
lpc: { layers: [{ path: 'hat/cloth/leather_cap/adult/leather', z: 60 }] },
// iron_helm:
lpc: { layers: [{ path: 'hat/helmet/barbuta/{body}', z: 60 }], hidesHair: true },
// padded_tunic:
lpc: { layers: [{ path: 'torso/armour/leather/{body}', z: 40 }] },
// scale_mail:
lpc: { layers: [{ path: 'torso/chainmail/{body}', z: 40 }] },
// cloth_pants:
lpc: { layers: [{ path: 'legs/pants/{legs}', z: 50, tint: '#c9a86a', tintMode: 'fabric' }] },
// mail_leggings:
lpc: { layers: [{ path: 'legs/leggings/{legs}', z: 50, tint: '#9a9aa2', tintMode: 'fabric' }] },
// apprentice_staff:
lpc: { layers: [
  { path: 'weapon/magic/simple/background/simple', z: 5 },
  { path: 'weapon/magic/simple/foreground/simple', z: 70 },
] },
// gnarled_staff:
lpc: { layers: [
  { path: 'weapon/magic/gnarled/universal/background/gnarled', z: 5 },
  { path: 'weapon/magic/gnarled/universal/foreground/gnarled', z: 70 },
] },
// archmage_staff:
lpc: { layers: [
  { path: 'weapon/magic/crystal/universal/background/purple', z: 5 },
  { path: 'weapon/magic/crystal/universal/foreground/purple', z: 70 },
] },
// short_bow:
lpc: { layers: [
  { path: 'weapon/ranged/bow/normal/universal/background/normal', z: 5 },
  { path: 'weapon/ranged/bow/normal/universal/foreground/normal', z: 70 },
] },
// war_bow:
lpc: { layers: [
  { path: 'weapon/ranged/bow/recurve/universal/background/recurve', z: 5 },
  { path: 'weapon/ranged/bow/recurve/universal/foreground/recurve', z: 70 },
] },
// great_bow:
lpc: { layers: [
  { path: 'weapon/ranged/bow/great/universal/background/great', z: 5 },
  { path: 'weapon/ranged/bow/great/universal/foreground/great', z: 70 },
] },
```

Create `shared/src/gearVisuals.ts`:

```ts
// Equipped-gear → LPC layer resolution. Pure and DOM-free like appearance.ts;
// consumed by the server (PlayerState stamping) and client (compositor,
// paperdoll, icons).
import type { Appearance, LpcLayer } from './appearance.js';
import { layersFor } from './appearance.js';
import type { ItemRow } from './items.js';
import { ITEM_BASES } from './items.js';

export type GearVisualSlot = 'helmet' | 'armor' | 'leggings' | 'weapon';
export type GearVisuals = Partial<Record<GearVisualSlot, string>>;

const VISUAL_SLOTS: GearVisualSlot[] = ['helmet', 'armor', 'leggings', 'weapon'];

// z bands layersFor assigns to the appearance layers each slot replaces —
// keep in sync with layersFor (hair fg 30, torso 40, legs 50, hat 60).
const REPLACED_Z: Record<GearVisualSlot, number | null> = {
  helmet: 60, armor: 40, leggings: 50, weapon: null,
};
const ABOVE_HEAD_HAIR_Z = 30;

/** Visible equipped items → slot→base_id map. Rows in non-visual slots or
 * with no lpc manifest entry contribute nothing. */
export function gearVisualsFor(items: ItemRow[]): GearVisuals {
  const gear: GearVisuals = {};
  for (const item of items) {
    const slot = item.equipped_slot;
    if (item.equipped_by === null || slot === null) continue;
    if (!(VISUAL_SLOTS as string[]).includes(slot)) continue;
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    if (!base?.lpc) continue;
    gear[slot as GearVisualSlot] = base.id;
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
 * ignored (defensive — same posture as validateItemRow). */
export function layersForLoadout(a: Appearance, gear: GearVisuals): LpcLayer[] {
  let layers = layersFor(a);
  for (const slot of VISUAL_SLOTS) {
    const baseId = gear[slot];
    if (!baseId) continue;
    const base = ITEM_BASES.find(b => b.id === baseId);
    if (!base?.lpc || (slot !== 'weapon' && base.slot !== slot)) continue;
    if (slot === 'weapon' && base.slot !== 'weapon') continue;
    const replaced = REPLACED_Z[slot];
    if (replaced !== null) layers = layers.filter(l => l.z !== replaced);
    if (slot === 'helmet' && base.lpc.hidesHair) {
      layers = layers.filter(l => l.z !== ABOVE_HEAD_HAIR_Z);
    }
    for (const gl of base.lpc.layers) {
      layers.push({ path: substitute(gl.path, a), z: gl.z, tint: gl.tint, tintMode: gl.tintMode });
    }
  }
  return layers.sort((x, y) => x.z - y.z);
}
```

In `shared/src/index.ts`, add the re-export next to the existing ones:

```ts
export * from './gearVisuals.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/gear-visuals.test.ts`
Expected: PASS (all cases). Then the full suite + types:
`cd server && npm test && npx tsc --noEmit` — no regressions.

- [ ] **Step 5: Commit**

```bash
git add shared/src/items.ts shared/src/gearVisuals.ts shared/src/index.ts server/tests/gear-visuals.test.ts
git commit -m "feat(shared): gear visuals manifest and layersForLoadout"
```

---

### Task 3: Server stamps `gear` onto PlayerState (TDD)

**Files:**
- Modify: `shared/src/types.ts` (~line 54, next to `appearance?`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (`makeInitialState`, ~line 73)
- Test: `server/tests/gear-wire.test.ts`

**Interfaces:**
- Consumes: `gearVisualsFor` (Task 2); `PlayerInit.items` (already exists — Room already loads and passes equipped items).
- Produces: `PlayerState.gear?: GearVisuals` — always stamped (`{}` for guests/no visible gear). Task 4's `main.ts` render path reads `player.gear`.

- [ ] **Step 1: Write the failing test**

Create `server/tests/gear-wire.test.ts` (mirrors `appearance-wire.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import type { ItemRow } from '@arena/shared';

const helm: ItemRow = {
  id: 'i1', base_id: 'iron_helm', rarity: 'basic', affixes: [],
  level_req: 7, equipped_by: 'char1', equipped_slot: 'helmet', slot: 'helmet',
};
const ring: ItemRow = {
  id: 'i2', base_id: 'bone_ring', rarity: 'basic', affixes: [],
  level_req: 1, equipped_by: 'char1', equipped_slot: 'ring1', slot: 'ring',
};

describe('gear stamping', () => {
  it('stamps visible equipped gear into PlayerState', () => {
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [helm, ring] }],
      undefined, undefined,
    );
    expect(state.players.a.gear).toEqual({ helmet: 'iron_helm' });
  });
  it('stamps an empty gear object for guests (no items)', () => {
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } }],
      undefined, undefined,
    );
    expect(state.players.a.gear).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/gear-wire.test.ts`
Expected: FAIL — `gear` is `undefined`.

- [ ] **Step 3: Implement**

`shared/src/types.ts` — import and field:

```ts
import type { GearVisuals } from './gearVisuals.js';
// ...in PlayerState, directly under `appearance?: Appearance;`:
  gear?: GearVisuals;
```

`server/src/gameloop/StateAdvancer.ts` — add `gearVisualsFor` to the existing
`@arena/shared` import, and in `makeInitialState` directly under the
`appearance:` line:

```ts
      gear: gearVisualsFor(p.items ?? []),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test && npx tsc --noEmit`
Expected: new test PASSES, all existing tests stay green (`appearance-wire`,
`stateadvancer-modes`, etc. don't assert exhaustive PlayerState shape).

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/gameloop/StateAdvancer.ts server/tests/gear-wire.test.ts
git commit -m "feat(server): stamp equipped gear visuals onto PlayerState"
```

---

### Task 4: Compositor consumes gear; arena characters wear it

**Files:**
- Create: `client/src/renderer/sprites/tint.ts` (tint routine extracted from the compositor)
- Modify: `client/src/renderer/sprites/SpriteCompositor.ts` (gear param, tint extraction, idle-from-walk fallback)
- Modify: `client/src/renderer/sprites/SpriteCharacter.ts` (constructor gains `gear`)
- Modify: `client/src/renderer/CharacterMesh.ts` (constructor gains `gear`)
- Modify: `client/src/main.ts:795` (pass `player.gear`)

**Interfaces:**
- Consumes: `layersForLoadout`, `GearVisuals` (Task 2); vendored sheets (Task 1).
- Produces:
  - `compositeAppearance(a: Appearance, gear: GearVisuals = {}): Promise<Record<LpcAnimation, THREE.CanvasTexture | null>>`
  - `tintSheet(img: HTMLImageElement, width: number, height: number, tint: string, tintMode?: 'skin' | 'fabric'): HTMLCanvasElement` (Task 5's icon module reuses this)
  - `new SpriteCharacter(appearance, charClass, gear?)`, `new CharacterMesh(charClass, appearance, gear, color, displayName, labelContainer)`

- [ ] **Step 1: Extract the tint routine**

Create `client/src/renderer/sprites/tint.ts` with the exact logic currently
inlined in `SpriteCompositor.ts` lines 51–65 (multiply + fabric screen pass +
destination-in alpha mask), signature as above, returning the tinted temp
canvas. Replace the inline block in `compositeAppearance` with:

```ts
      ctx.drawImage(tintSheet(img, canvas.width, canvas.height, tint, layers[i].tintMode), 0, 0);
```

(The comment block explaining skin-vs-fabric moves to `tint.ts` with the code.)

- [ ] **Step 2: Thread gear through the compositor**

In `SpriteCompositor.ts`:

```ts
import { Appearance, GearVisuals, layersForLoadout, LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';

export async function compositeAppearance(
  a: Appearance,
  gear: GearVisuals = {},
): Promise<Record<LpcAnimation, THREE.CanvasTexture | null>> {
  const layers = layersForLoadout(a, gear);
  // ...rest unchanged except the idle fallback below
```

(`layersForLoadout(a, {})` equals `layersFor(a)` — Task 2's first test — so
existing callers are unaffected.)

- [ ] **Step 3: Add the idle-from-walk fallback**

Weapons ship no idle sheets; without this the weapon vanishes whenever the
character stands still (including the paperdoll). In `compositeAppearance`,
when building the `idle` animation, retry missing layers against their walk
sheet and draw walk frame 0 into every idle frame column:

```ts
    const images = await Promise.all(
      layers.map(l => loadImage(`/assets/lpc/${l.path}/${anim}.png`)),
    );
    // Idle fallback: a layer with no idle sheet (weapons) borrows its walk
    // sheet's frame 0 — the LPC standing pose — for both idle frames.
    const idleFallback: (HTMLImageElement | null)[] = await Promise.all(
      layers.map((l, i) => (anim === 'idle' && images[i] === null)
        ? loadImage(`/assets/lpc/${l.path}/walk.png`)
        : Promise.resolve(null)),
    );
```

Then in the per-layer draw loop, where `img` is null but `idleFallback[i]`
isn't, build the frame-0 stand-in before tinting/drawing:

```ts
    images.forEach((img, i) => {
      let source: HTMLImageElement | HTMLCanvasElement | null = img;
      if (!source && idleFallback[i]) {
        const stand = document.createElement('canvas');
        stand.width = canvas.width; stand.height = canvas.height;
        const sctx = stand.getContext('2d')!;
        for (let f = 0; f < meta.frames; f++) {
          // walk frame 0 of each direction row → every idle frame column
          sctx.drawImage(idleFallback[i]!, 0, 0, FRAME, rows * FRAME, f * FRAME, 0, FRAME, rows * FRAME);
        }
        source = stand;
      }
      if (!source) return;
      // ...existing tint-or-draw path, using `source` instead of `img`
    });
```

(`tintSheet` must accept `HTMLImageElement | HTMLCanvasElement` — widen the
parameter type accordingly.)

- [ ] **Step 4: Thread gear to the arena**

`SpriteCharacter.ts` constructor:

```ts
constructor(appearance: Appearance, charClass: CharacterClass, gear: GearVisuals = {}) {
  // ...
  compositeAppearance(appearance, gear).then(tex => {
```

`CharacterMesh.ts` constructor — add `gear: GearVisuals | undefined` as the
third parameter (after `appearance`), pass through:

```ts
this.sprite = new SpriteCharacter(appearance ?? CLASS_DEFAULT_APPEARANCE[charClass], charClass, gear ?? {});
```

`client/src/main.ts:795`:

```ts
const mesh = new CharacterMesh(player.charClass, player.appearance, player.gear, PLAYER_COLORS[colorIndex], player.displayName, uiOverlay);
```

- [ ] **Step 5: Verify — suites, types, and a live look**

Run: `cd client && npm test && npx tsc --noEmit` (and `cd server && npm test`)
Expected: green (client tests don't construct SpriteCharacter with gear yet;
defaults keep them valid).

Manual check (server + client dev processes per README): sign in, equip a
helmet/armor/leggings/staff on a character, start a duel, and confirm the
character wears them in-arena (helmet visible, staff visible while
walking/standing, no `{body}` 404s in the network tab). Confirm a guest
(no character) still renders with default appearance.

- [ ] **Step 6: Commit**

```bash
git add client/src/renderer/sprites/tint.ts client/src/renderer/sprites/SpriteCompositor.ts client/src/renderer/sprites/SpriteCharacter.ts client/src/renderer/CharacterMesh.ts client/src/main.ts
git commit -m "feat(client): render equipped gear on arena characters"
```

---

### Task 5: Sprite-derived item icons (TDD)

**Files:**
- Create: `client/src/items/itemIcon.ts`
- Modify: `client/src/items/GearScreen.ts` (`renderDollSlot` ~line 303, `renderCard` ~line 315, `renderDetails` icon ~line 471, call `applyItemIcons` after DOM writes)
- Modify: `client/src/items/ShopScreen.ts` (vendor slot ~line 263, reveal ~line 300, details ~line 326, same `applyItemIcons` calls)
- Test: `client/tests/itemIcon.test.ts`, extend `client/tests/GearScreen.test.ts`

**Interfaces:**
- Consumes: `tintSheet` (Task 4), `ItemBase.lpc` (Task 2), vendored sheets (Task 1).
- Produces:
  - `iconFor(base: ItemBase): Promise<HTMLCanvasElement | null>` — null for bases without `lpc` or on any load/canvas failure (caller keeps the FA glyph).
  - `applyItemIcons(root: HTMLElement): void` — finds `[data-icon-base]` elements and swaps in a copy of the cached icon canvas.
  - Markup contract: icon cells render as `<div class="..." data-icon-base="<baseId>" ...><i class="fa <base.icon>"></i></div>` — FA glyph is the loading/failure fallback.

- [ ] **Step 1: Write the failing tests**

Create `client/tests/itemIcon.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ITEM_BASES } from '@arena/shared';
import { iconFor, applyItemIcons } from '../src/items/itemIcon';

describe('iconFor', () => {
  it('resolves null for bases without sprite layers (rings/amulets)', async () => {
    const ring = ITEM_BASES.find(b => b.id === 'bone_ring')!;
    expect(await iconFor(ring)).toBeNull();
  });
  it('caches one promise per base id', () => {
    // NOTE: never await iconFor on a sheet-bearing base in jsdom — jsdom
    // fires neither onload nor onerror for Image, so the promise never
    // settles. Assert the synchronous cache contract instead.
    const helm = ITEM_BASES.find(b => b.id === 'iron_helm')!;
    const first = iconFor(helm);
    expect(iconFor(helm)).toBe(first);
  });
});

describe('applyItemIcons', () => {
  it('leaves the FA fallback in place when no icon resolves', async () => {
    const root = document.createElement('div');
    root.innerHTML = `<div data-icon-base="iron_helm"><i class="fa fa-helmet-safety"></i></div>`;
    applyItemIcons(root);
    await new Promise(r => setTimeout(r, 0));
    expect(root.querySelector('i.fa')).not.toBeNull();
  });
});
```

Extend `client/tests/GearScreen.test.ts` with one markup assertion in its
existing render-path style: an equipped/stash item's icon cell carries
`data-icon-base="<base_id>"` and still contains the `<i class="fa ...">`
fallback.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run tests/itemIcon.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `itemIcon.ts`**

```ts
// Sprite-derived item icons: crop the down-facing frame of a base's own LPC
// sheet(s) so the icon IS what the character wears. Rings/amulets have no
// lpc entry and keep their Font Awesome glyphs (as does any load failure).
import type { ItemBase } from '@arena/shared';
import { ITEM_BASES, CLASS_DEFAULT_APPEARANCE, LPC_ANIMATIONS } from '@arena/shared';
import type { LpcAnimation } from '@arena/shared';
import { FRAME } from '../renderer/sprites/lpc';
import { tintSheet } from '../renderer/sprites/tint';

const ICON_SIZE = 40;      // px, matches .gr-details-icon; slot cells scale via CSS
// Sheets to try, in order — weapons lack idle (staves show walk, bows shoot).
const ANIM_PREFERENCE: LpcAnimation[] = ['idle', 'walk', 'shoot', 'spellcast', 'hurt'];

const cache = new Map<string, Promise<HTMLCanvasElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Substitute layer-path tokens with the male defaults — icons are
 * body-agnostic, and every gear sheet ships a male variant. */
function iconPath(path: string): string {
  return path.replace('{body}', 'male').replace('{legs}', 'male');
}

async function buildIcon(base: ItemBase): Promise<HTMLCanvasElement | null> {
  if (!base.lpc) return null;
  try {
    // Composite all of the base's layers (bow bg+fg) at the down-facing
    // first frame of the first animation available for its first layer.
    let anim: LpcAnimation | null = null;
    let images: (HTMLImageElement | null)[] = [];
    for (const candidate of ANIM_PREFERENCE) {
      images = await Promise.all(
        base.lpc.layers.map(l => loadImage(`/assets/lpc/${iconPath(l.path)}/${candidate}.png`)),
      );
      if (images.some(i => i !== null)) { anim = candidate; break; }
    }
    if (!anim) return null;

    const row = LPC_ANIMATIONS[anim].singleRow ? 0 : 2; // down-facing
    const frame = document.createElement('canvas');
    frame.width = FRAME; frame.height = FRAME;
    const fctx = frame.getContext('2d');
    if (!fctx) return null;
    base.lpc.layers.forEach((layer, i) => {
      const img = images[i];
      if (!img) return;
      const source = layer.tint
        ? tintSheet(img, img.width, img.height, layer.tint, layer.tintMode)
        : img;
      fctx.drawImage(source, 0, row * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME);
    });

    // Crop to the opaque bounding box, then contain-fit into the tile.
    const data = fctx.getImageData(0, 0, FRAME, FRAME).data;
    let minX = FRAME, minY = FRAME, maxX = -1, maxY = -1;
    for (let y = 0; y < FRAME; y++) {
      for (let x = 0; x < FRAME; x++) {
        if (data[(y * FRAME + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const icon = document.createElement('canvas');
    icon.width = ICON_SIZE; icon.height = ICON_SIZE;
    const ictx = icon.getContext('2d');
    if (!ictx) return null;
    ictx.imageSmoothingEnabled = false;
    const scale = Math.min(ICON_SIZE / w, ICON_SIZE / h);
    const dw = Math.max(1, Math.floor(w * scale)), dh = Math.max(1, Math.floor(h * scale));
    ictx.drawImage(frame, minX, minY, w, h, Math.floor((ICON_SIZE - dw) / 2), Math.floor((ICON_SIZE - dh) / 2), dw, dh);
    return icon;
  } catch {
    return null; // jsdom (no canvas 2d) or any decode failure → FA fallback
  }
}

export function iconFor(base: ItemBase): Promise<HTMLCanvasElement | null> {
  let p = cache.get(base.id);
  if (!p) { p = buildIcon(base); cache.set(base.id, p); }
  return p;
}

/** Swap `[data-icon-base]` cells' contents for a copy of the sprite icon.
 * Async and idempotent; cells whose icon fails keep their FA glyph. */
export function applyItemIcons(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-icon-base]').forEach(cell => {
    const base = ITEM_BASES.find(b => b.id === cell.dataset.iconBase);
    if (!base) return;
    void iconFor(base).then(master => {
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

(`CLASS_DEFAULT_APPEARANCE` ends up unused — drop it from the import.)

- [ ] **Step 4: Integrate into GearScreen and ShopScreen**

`GearScreen.ts` — the three icon sites gain `data-icon-base` (equipped slot
~line 304, stash card ~line 316, details head ~line 471), e.g.:

```ts
<div class="gr-slot-icon" data-icon-base="${base.id}" style="color:${color}"><i class="fa ${base.icon}"></i></div>
```

Add fixed cell sizing so a canvas swap can't reflow the grid — append to
`STYLES`:

```css
.gr-slot-icon,.gr-details-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;}
```

Call `applyItemIcons(this.el)` at the end of `render()` (after
`attachItemListeners()`) and `applyItemIcons(panel)` at the end of
`renderDetails()`. Empty doll slots keep their plain `SLOT_ICONS` glyphs
(no `data-icon-base`). Rarity color continues to drive the cell border
(`box-shadow` inset — already the case) and the name text; the glyph
`color:` style stays purely as the fallback's tint.

`ShopScreen.ts` — same attribute on the vendor-slot (~line 263), lootbox
reveal (~line 300), and details (~line 326) icons; call
`applyItemIcons(...)` after each of its DOM-writing render methods.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd client && npm test && npx tsc --noEmit`
Expected: new tests PASS (jsdom exercises the null-fallback paths), existing
GearScreen/ShopScreen tests green with the added attribute assertion.

Manual check: Gear and Shop screens show pixel-art icons for the 13 visible
bases (browser has real canvas); rings/amulets keep glyphs; borders still
reflect rarity.

- [ ] **Step 6: Commit**

```bash
git add client/src/items/itemIcon.ts client/src/items/GearScreen.ts client/src/items/ShopScreen.ts client/tests/itemIcon.test.ts client/tests/GearScreen.test.ts
git commit -m "feat(client): sprite-derived item icons with FA fallback"
```

---

### Task 6: Gear-screen paperdoll + lobby hero wear gear

**Files:**
- Modify: `client/src/renderer/sprites/SpritePreview.ts` (`setAppearance` gains gear)
- Modify: `client/src/items/GearScreen.ts` (`show()` gains appearance; animated paperdoll above the doll grid)
- Modify: `client/src/lobby/LobbyUI.ts` (`showHome` gains gear; `updateHeroGear`)
- Modify: `client/src/main.ts` (pass appearance to GearScreen at line 241; maintain `activeGear` in `refreshLoadout`; pass gear at the three `showHome` sites — lines ~216–226, ~466–477, ~660–673)
- Test: extend `client/tests/GearScreen.test.ts`, `client/tests/LobbyUI.test.ts` for the new signatures

**Interfaces:**
- Consumes: `SpritePreview`, `compositeAppearance(a, gear)` (Task 4), `gearVisualsFor` (Task 2).
- Produces:
  - `SpritePreview.setAppearance(a: Appearance, gear: GearVisuals = {}): Promise<boolean>`
  - `GearScreen.show(characterId, charClass, charLevel, appearance: Appearance): Promise<NavKey>`
  - `LobbyUI.showHome(username?, points?, charClass?, level?, appearance?, gear?: GearVisuals)`
  - `LobbyUI.updateHeroGear(gear: GearVisuals): void` (no-op unless the home hero preview is live)

- [ ] **Step 1: Extend SpritePreview**

```ts
setAppearance(a: Appearance, gear: GearVisuals = {}): Promise<boolean> {
  // ...unchanged except:
  return compositeAppearance(a, gear).then(
```

- [ ] **Step 2: GearScreen paperdoll**

- `show(characterId, charClass, charLevel, appearance: Appearance)` stores
  `this.appearance = appearance`; update the call site
  (`client/src/main.ts:241`) to pass
  `appearanceFromRow(activeCharacter.appearance, activeCharacter.class)`
  (the pattern used at main.ts:222).
- Add to the doll column markup in `render()`, above the doll grid:

```html
<div class="gr-paperdoll"><canvas id="gr-paperdoll-canvas"></canvas></div>
```

with styles appended to `STYLES`:

```css
.gr-paperdoll{display:flex;justify-content:center;margin-bottom:10px;}
.gr-paperdoll canvas{width:128px;height:128px;image-rendering:pixelated;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
```

- `render()` rebuilds `this.el.innerHTML`, so the preview is recreated per
  render (composites are cheap — the image cache persists). After
  `attachItemListeners()`:

```ts
this.paperdoll?.dispose();
this.paperdoll = null;
const pdCanvas = this.el.querySelector('#gr-paperdoll-canvas') as HTMLCanvasElement | null;
if (pdCanvas) {
  this.paperdoll = new SpritePreview(pdCanvas, 2, 'walk');
  const equipped = this.items.filter(i => i.equipped_by === this.characterId);
  void this.paperdoll.setAppearance(this.appearance, gearVisualsFor(equipped));
}
```

with `private paperdoll: SpritePreview | null = null;` and
`private appearance: Appearance = CLASS_DEFAULT_APPEARANCE['mage'];` fields;
`hide()` disposes and nulls it (stops the rAF loop). Because equip/unequip/
sell already call `render()`, the paperdoll updates live with every change —
including optimistic ones.

- [ ] **Step 3: Lobby hero gear**

`LobbyUI.ts`:
- `showHome(..., appearance?: Appearance | null, gear: GearVisuals = {})` —
  store `this.heroAppearance = appearance ?? null; this.heroGear = gear;`
  and pass both to `preview.setAppearance(appearance!, gear)` at ~line 345.
- Add:

```ts
/** Re-dress the home hero when equipped gear changes; no-op off-home. */
updateHeroGear(gear: GearVisuals): void {
  this.heroGear = gear;
  if (this.heroPreview && this.heroAppearance) {
    void this.heroPreview.setAppearance(this.heroAppearance, gear);
  }
}
```

`main.ts`:
- Module-level `let activeGear: GearVisuals = {};` (cleared to `{}` wherever
  `activeCharacter` is cleared/switched — the sign-out and character-switch
  paths that already reset `pendingLoadoutSync` at lines ~207/~323).
- `refreshLoadout` already fetches equipped items (line ~100); after the
  `activeCharacter?.id !== characterId` staleness guard, add:

```ts
activeGear = gearVisualsFor(items);
lobby.updateHeroGear(activeGear);
```

- The three `showHome(...)` call sites pass `activeGear` as the sixth
  argument. (They are exact duplicates of `renderLobbyHome` — collapsing the
  two inline copies into `renderLobbyHome()` + `void refreshGold()` is in
  scope for these lines; nothing else.)

- [ ] **Step 4: Update tests and run**

Adjust `client/tests/GearScreen.test.ts` calls to the new `show(...)`
signature (pass `CLASS_DEFAULT_APPEARANCE.mage`) and assert the rendered
markup contains `gr-paperdoll`. Adjust any `LobbyUI.test.ts` `showHome`
signature usages.

Run: `cd client && npm test && npx tsc --noEmit && cd ../server && npm test`
Expected: all green.

Manual check: Gear screen shows the walking paperdoll; equipping/unequipping
updates it instantly; the AppearancePicker (Edit Look) still shows base
appearance without gear; the lobby hero wears equipped gear after visiting
the gear screen (loadout sync runs on section exit).

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/sprites/SpritePreview.ts client/src/items/GearScreen.ts client/src/lobby/LobbyUI.ts client/src/main.ts client/tests/GearScreen.test.ts client/tests/LobbyUI.test.ts
git commit -m "feat(client): gear paperdoll and geared lobby hero"
```

---

### Task 7: Final verification pass

**Files:**
- Modify (only if drift found): none expected.

- [ ] **Step 1: Full suites and types**

Run from repo root:

```bash
(cd server && npm test && npx tsc --noEmit)
(cd client && npm test && npx tsc --noEmit)
```

Expected: all green. Suite counts grew vs the baseline (server 235+, client 43+).

- [ ] **Step 2: End-to-end manual run-through**

With `cd server && npm run dev` and `cd client && npm run dev`:

1. Character with full gear equipped → arena: helmet/armor/leggings visible in
   all animations; staff/bow visible in walk, idle (fallback), and — bows —
   the shoot cast; nothing renders as a missing-texture artifact.
2. Two-player duel (second browser/incognito): the OPPONENT's gear renders
   from the snapshot payload (this is the wire test in the real world).
3. Guest player: default appearance, no errors.
4. Gear screen: sprite icons, rarity borders, live paperdoll; rings keep glyphs.
5. Shop: vendor stock and lootbox reveals show sprite icons.
6. Lobby home: hero wears gear; Edit Look picker shows base appearance only.
7. Browser network tab: no 404s under `/assets/lpc/` beyond the documented
   missing weapon animations (`run`/`spellcast`/`shoot` per the coverage table).
8. `iron_helm` visual check: if the barbuta clips ranger hair styles badly
   even with `hidesHair`, that's expected-fixed; if it looks wrong the OTHER
   way (bald forehead with cap-style hair), remove `hidesHair` from the
   manifest entry and re-run the Task 2 tests (flip the hidesHair test
   expectations accordingly).

- [ ] **Step 3: Commit any fixups**

```bash
git add -A && git commit -m "fix(gear): final verification fixups"
```

(Skip if nothing changed.)
