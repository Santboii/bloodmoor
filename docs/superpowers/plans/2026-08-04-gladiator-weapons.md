# Gladiator Weapons & Uniques Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new gladiator spear bases (Boar Spear L1, Bronze Spear L4, Serpent Pike L7) and the gladiator's first four unique items, one per item-level band.

**Architecture:** Pure catalog extension of `shared/src/items.ts` (typed manifests consumed by server roll authority and client UI) plus asset vendoring for three new spear recolors. No engine changes: item talent ranks already merge into tree ranks at match start, the cast gate already grants spells from talent affixes, and `hasKeystone` already fires on merged ranks. Spec: `docs/superpowers/specs/2026-08-04-gladiator-weapons-design.md`.

**Tech Stack:** TypeScript monorepo (npm workspaces `client`/`server`/`shared`, imported as `@arena/shared`), vitest, Node scripts for LPC asset vendoring/anchor derivation.

## Global Constraints

- In `UniqueAffixSpec` ranges, `max` is ALWAYS the lucky end — for grants (+1→+3) and drawbacks (−30→−16, where −16 is the smaller penalty) alike.
- No talent affix max roll may exceed its node's soft cap (both `arms.heavy_thrust` and `bulwark.bracing` cap at 5; `arms.crushing_landing` and `bulwark.mobile_guard` at 3). An item must never trip a keystone alone.
- Talent affixes on non-stackable nodes (`arms.spear_throw`, `arms.leap`) must be fixed: `min === max`.
- No affix range may span or touch zero.
- Every unique needs `flavor`, `lpcTint`, and an `aura` (colors are 0–1 rgb triples).
- New ids are snake_case: `boar_spear`, `bronze_spear`, `serpent_pike`, `crowd_pleaser`, `the_short_road`, `headsmans_reach`, `the_patient_wall`.
- All new bases: `slot: 'weapon'`, `classRestriction: 'gladiator'`, icon `fa-location-arrow` (FA free has no spear glyph), `nativeAnims: ['thrust']`, background layer `z: 5` / `weaponRole: 'behind'`, foreground layer `z: 70` / `weaponRole: 'front'`.
- Run tests from the repo root: `npm test` runs the server workspace; client tests via `npm run test --workspace=client`.
- Commit after every task. Never commit code you haven't run.

---

### Task 1: Vendor the three new spear color sheets

Upstream (`liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator`) ships 12 spear colors in the same 64px walk/thrust/hurt layout as the iron/steel/gold sheets already vendored. We add `dark`, `bronze`, `silver`. The vendor script's PNG-dimension gate validates every downloaded sheet, so a successful run IS the test.

**Files:**
- Modify: `scripts/vendor-lpc.mjs` (the `LAYERS` array, right after the existing gold spear entries around line 80–85)
- Create (generated): `client/public/assets/lpc/weapon/polearm/spear/{background,foreground}/{dark,bronze,silver}/{walk,thrust,hurt}.png` — 18 PNGs

**Interfaces:**
- Produces: on-disk sheets at the layer paths Task 3's `ItemBase.lpc.layers` reference and Task 2's anchor derivation reads.

- [ ] **Step 1: Add the six new layer entries to `LAYERS`**

In `scripts/vendor-lpc.mjs`, find the gladiator spear block at the end of the `LAYERS` array:

```js
  'weapon/polearm/spear/background/iron',
  'weapon/polearm/spear/foreground/iron',
  'weapon/polearm/spear/background/steel',
  'weapon/polearm/spear/foreground/steel',
  'weapon/polearm/spear/background/gold',
  'weapon/polearm/spear/foreground/gold',
```

Append after the gold entries (same colored-layout convention — upstream path is `<dir>/<anim>/<color>.png`):

```js
  'weapon/polearm/spear/background/dark',
  'weapon/polearm/spear/foreground/dark',
  'weapon/polearm/spear/background/bronze',
  'weapon/polearm/spear/foreground/bronze',
  'weapon/polearm/spear/background/silver',
  'weapon/polearm/spear/foreground/silver',
```

- [ ] **Step 2: Run the vendor script**

Run: `node scripts/vendor-lpc.mjs`

Expected: the script reports downloaded sheets with no dimension-gate failures. Spears only ship `walk`, `thrust`, `hurt` upstream — the other animations in the script's `ANIMS` list will be reported missing for these layers. That is the same expected degradation as the existing iron/steel/gold spears (compare their directories: three PNGs each).

- [ ] **Step 3: Verify the 18 new files exist**

Run: `ls client/public/assets/lpc/weapon/polearm/spear/background/dark client/public/assets/lpc/weapon/polearm/spear/foreground/dark client/public/assets/lpc/weapon/polearm/spear/background/bronze client/public/assets/lpc/weapon/polearm/spear/foreground/bronze client/public/assets/lpc/weapon/polearm/spear/background/silver client/public/assets/lpc/weapon/polearm/spear/foreground/silver`

Expected: each of the six directories contains exactly `hurt.png  thrust.png  walk.png`.

- [ ] **Step 4: Commit**

```bash
git add scripts/vendor-lpc.mjs client/public/assets/lpc/weapon/polearm/spear
git commit -m "feat(assets): vendor dark/bronze/silver spear sheets for new gladiator bases"
```

---

### Task 2: Anchor-table entries for the new bases

The sprite compositor attaches a weapon's resting sprite to the character's hand using `client/src/renderer/sprites/weaponAnchors.generated.ts`, keyed by base id. The derivation script reads vendored sheets directly (it does not read `items.ts`), so this task only needs Task 1.

**Files:**
- Modify: `scripts/derive-weapon-anchors.mjs` (the `WEAPONS` table, around line 212–222)
- Regenerate: `client/src/renderer/sprites/weaponAnchors.generated.ts`

**Interfaces:**
- Consumes: the 18 sheets vendored in Task 1.
- Produces: `weaponAnchors.generated.ts` entries keyed `boar_spear`, `bronze_spear`, `serpent_pike` — the exact base ids Task 3 declares, which `client/src/renderer/sprites/weaponAttach.ts` looks up at render time.

- [ ] **Step 1: Add the three new entries to `WEAPONS`**

In `scripts/derive-weapon-anchors.mjs`, after the existing spear entries:

```js
  iron_spear: { ref: ['weapon/polearm/spear/background/iron', 'weapon/polearm/spear/foreground/iron'], anim: 'walk' },
  war_spear: { ref: ['weapon/polearm/spear/background/steel', 'weapon/polearm/spear/foreground/steel'], anim: 'walk' },
  champion_spear: { ref: ['weapon/polearm/spear/background/gold', 'weapon/polearm/spear/foreground/gold'], anim: 'walk' },
```

append:

```js
  boar_spear: { ref: ['weapon/polearm/spear/background/dark', 'weapon/polearm/spear/foreground/dark'], anim: 'walk' },
  bronze_spear: { ref: ['weapon/polearm/spear/background/bronze', 'weapon/polearm/spear/foreground/bronze'], anim: 'walk' },
  serpent_pike: { ref: ['weapon/polearm/spear/background/silver', 'weapon/polearm/spear/foreground/silver'], anim: 'walk' },
```

- [ ] **Step 2: Regenerate the anchor table**

Run: `node scripts/derive-weapon-anchors.mjs`

Expected: script completes and rewrites `client/src/renderer/sprites/weaponAnchors.generated.ts`.

- [ ] **Step 3: Verify the new keys exist and existing keys survived**

Run: `grep -c '"boar_spear"\|"bronze_spear"\|"serpent_pike"\|"iron_spear"\|"war_spear"\|"champion_spear"' client/src/renderer/sprites/weaponAnchors.generated.ts`

Expected: `6`. The recolors share the iron spear's silhouette, so the new grip rects should match the existing spear entries — spot-check by diffing the `boar_spear` block against `iron_spear` (`git diff` should show additions only, no changes to existing entries).

- [ ] **Step 4: Run the client test suite (guards the generated file's shape)**

Run: `npm run test --workspace=client`

Expected: PASS (no regressions).

- [ ] **Step 5: Commit**

```bash
git add scripts/derive-weapon-anchors.mjs client/src/renderer/sprites/weaponAnchors.generated.ts
git commit -m "feat(render): derive hand anchors for the three new spear recolors"
```

---

### Task 3: Three new weapon bases in the catalog

Today every weapon in the game has a `damage_pct` implicit. Boar Spear (`max_health`) and Serpent Pike (`cast_speed_pct`) deliberately break that so base choice is a decision; Bronze Spear fills the level-4 band (the first L4 weapon in the game) continuing the 2/·/6/9 damage curve.

**Files:**
- Modify: `shared/src/items.ts` (the `ITEM_BASES` array — insert into the existing spear group after `champion_spear`)
- Test: `server/tests/items.test.ts` (the `manifests` describe block)

**Interfaces:**
- Consumes: sheet paths from Task 1, anchor keys from Task 2.
- Produces: `ItemBase` entries with ids `boar_spear` (itemLevel 1, implicit `{ id: 'max_health', value: 20 }`), `bronze_spear` (itemLevel 4, implicit `{ id: 'damage_pct', value: 4 }`), `serpent_pike` (itemLevel 7, implicit `{ id: 'cast_speed_pct', value: 4 }`). Task 4's uniques reference `iron_spear`/`bronze_spear`/`war_spear`/`champion_spear` as carriers.

- [ ] **Step 1: Write the failing test**

Add to the `manifests` describe block in `server/tests/items.test.ts`:

```ts
  it('gladiator has a weapon base in every band, with varied implicits', () => {
    const spears = ITEM_BASES.filter(b => b.slot === 'weapon' && b.classRestriction === 'gladiator');
    for (const band of ITEM_LEVEL_BANDS) {
      expect(spears.some(b => b.itemLevel === band), `band ${band}`).toBe(true);
    }
    expect(ITEM_BASES.find(b => b.id === 'boar_spear')!.implicit).toEqual({ id: 'max_health', value: 20 });
    expect(ITEM_BASES.find(b => b.id === 'bronze_spear')!.implicit).toEqual({ id: 'damage_pct', value: 4 });
    expect(ITEM_BASES.find(b => b.id === 'serpent_pike')!.implicit).toEqual({ id: 'cast_speed_pct', value: 4 });
  });
```

(`ITEM_BASES` and `ITEM_LEVEL_BANDS` are already imported at the top of the file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- items.test.ts -t 'gladiator has a weapon base in every band'`

Expected: FAIL — `boar_spear` lookup returns `undefined` (`Cannot read properties of undefined`or band-4 `some` is false).

- [ ] **Step 3: Add the three bases to `ITEM_BASES`**

In `shared/src/items.ts`, directly after the `champion_spear` entry (keeping the spear group together), add:

```ts
  {
    id: 'boar_spear', slot: 'weapon', name: 'Boar Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 1, implicit: { id: 'max_health', value: 20 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/dark', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/dark', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  // The game's first level-4 weapon (all classes previously jumped 1 -> 7).
  // Band 4 therefore gains its first class-restricted drop — a sellable
  // dead drop for mage/ranger accounts, accepted in the 2026-08-04 spec.
  {
    id: 'bronze_spear', slot: 'weapon', name: 'Bronze Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 4, implicit: { id: 'damage_pct', value: 4 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/bronze', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/bronze', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  {
    id: 'serpent_pike', slot: 'weapon', name: 'Serpent Pike', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 7, implicit: { id: 'cast_speed_pct', value: 4 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/silver', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/silver', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
```

Also update the stale sentence in the catalog's doc comment above `ITEM_BASES` — it claims every band has "one weapon per class", which has never been true (weapons sat at 1/7/10 only). Replace that sentence with:

```
 * Weapons sit at bands 1, 7 and 10 for every class; gladiator additionally
 * has bands 1 (boar_spear), 4 (bronze_spear) and 7 (serpent_pike) variants —
 * the only L4 weapon in the game so far.
```

- [ ] **Step 4: Run the test to verify it passes, then the full server suite**

Run: `npm test -- items.test.ts -t 'gladiator has a weapon base in every band'`
Expected: PASS

Run: `npm test`
Expected: PASS. If any economy/vendor test anchors on per-band base counts, it will surface here — fix the count, not the catalog.

- [ ] **Step 5: Commit**

```bash
git add shared/src/items.ts server/tests/items.test.ts
git commit -m "feat(items): boar spear, bronze spear and serpent pike gladiator bases"
```

---

### Task 4: The four gladiator uniques

One per band, each a distinct archetype. Both gladiator keystones (Executioner's Thrust on `arms.heavy_thrust`, Riposte on `bulwark.bracing`) become item-reachable but only with 3 invested tree ranks at a max roll — the suite's existing `no talent max roll exceeds its node soft cap` invariant enforces the "never free" half automatically.

**Files:**
- Modify: `shared/src/items.ts` (the `UNIQUE_ITEMS` array — one insertion per band section)
- Test: `server/tests/items.test.ts` (count test + one new manifest test + one new rollQuality test)

**Interfaces:**
- Consumes: base ids from Task 3 (`bronze_spear`) and the pre-existing `iron_spear`/`war_spear`/`champion_spear`.
- Produces: `UniqueItem` entries with ids `crowd_pleaser`, `the_short_road`, `headsmans_reach`, `the_patient_wall` — Task 5's combat tests reference these ids and their exact ranges.

- [ ] **Step 1: Update the count test and add the two new tests (failing first)**

In `server/tests/items.test.ts`, replace the body of `it('ships fourteen uniques, three new per band', ...)`:

```ts
  it('ships eighteen uniques', () => {
    expect(UNIQUE_ITEMS).toHaveLength(18);
    const byBand = (lvl: number) => UNIQUE_ITEMS.filter(u => u.levelReq === lvl).length;
    expect(byBand(1)).toBe(4);   // 2026-08-02 set's 3 + crowd_pleaser
    expect(byBand(4)).toBe(4);   // + the_short_road
    expect(byBand(7)).toBe(6);   // 3 + emberheart + windrunner_band + headsmans_reach
    expect(byBand(10)).toBe(4);  // + the_patient_wall
  });
```

Add to the `manifests` describe block:

```ts
  it('every gladiator unique sits on a gladiator weapon base at its own band', () => {
    for (const id of ['crowd_pleaser', 'the_short_road', 'headsmans_reach', 'the_patient_wall']) {
      const u = UNIQUE_ITEMS.find(x => x.id === id)!;
      const base = ITEM_BASES.find(b => b.id === u.baseId)!;
      expect(base.classRestriction, id).toBe('gladiator');
      expect(u.levelReq, id).toBe(base.itemLevel);
    }
  });
```

Add to the `rollQuality` describe block (its `byId` helper already exists there). Unlike `doomsayers_barbute`, The Patient Wall's two talent specs have different ranges (1–3 vs 1–2), and one of its numeric affixes is a drawback:

```ts
  it('averages the patient wall\'s two talent rolls and its drawback independently', () => {
    const u = byId('the_patient_wall');
    const bracing = u.affixes.find(a => a.node === 'bulwark.bracing')!;
    const guard = u.affixes.find(a => a.node === 'bulwark.mobile_guard')!;
    const health = u.affixes.find(a => a.id === 'max_health')!;
    const dmg = u.affixes.find(a => a.id === 'damage_pct')!;
    const rolled: RolledAffix[] = [
      { id: 'talent', value: bracing.max, node: 'bulwark.bracing' },    // 1
      { id: 'talent', value: guard.min, node: 'bulwark.mobile_guard' }, // 0
      { id: 'max_health', value: health.max },                          // 1
      { id: 'damage_pct', value: dmg.min },                             // 0 (min is the unlucky end of a drawback too)
    ];
    expect(rollQuality(u, rolled)).toBeCloseTo(0.5, 5);
  });
```

- [ ] **Step 2: Run to verify the three fail**

Run: `npm test -- items.test.ts`

Expected: FAIL — `ships eighteen uniques` (length is 14), `every gladiator unique...` (find returns undefined), `averages the patient wall...` (byId throws on undefined).

- [ ] **Step 3: Add the four uniques to `UNIQUE_ITEMS`**

In `shared/src/items.ts`, the array is grouped by band with `// --- Level N ---` comments. Insert each item at the END of its band section:

End of the `--- Level 1 ---` section (after `hunters_eye`):

```ts
  {
    // The stun-thrower starter: grants Spear Throw — a tier-2, 2-point
    // spell — at level 1 (the Threefold Draw pattern). The mana cut makes
    // each throw a commitment rather than a freebie.
    id: 'crowd_pleaser', baseId: 'iron_spear', name: 'Crowd-Pleaser',
    flavor: 'The crowd knows what it came for.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'arms.spear_throw' },
      { id: 'cast_speed_pct', min: 2, max: 4 },
      { id: 'max_mana', min: -30, max: -16 },
    ],
    levelReq: 1,
    lpcTint: { color: '#d9b96a' },
    aura: { style: 'orbit', color: [0.9, 0.78, 0.45], anchor: 'chest', intensity: 0.6, motes: 1 },
  },
```

End of the `--- Level 4 ---` section (after `hollowhide_jerkin`):

```ts
  {
    // The leaper: grants Leap (tier-4, 2-point) a full progression stage
    // early, with Crushing Landing synergy. The move-speed drawback is the
    // thesis — you leap because you no longer run.
    id: 'the_short_road', baseId: 'bronze_spear', name: 'The Short Road',
    flavor: 'Between you and them: a straight line, and the sky.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'arms.leap' },
      { id: 'talent', min: 1, max: 2, node: 'arms.crushing_landing' },
      { id: 'move_speed_pct', min: -5, max: -3 },
    ],
    levelReq: 4,
    lpcTint: { color: '#a9744a' },
    aura: { style: 'wisp', color: [0.75, 0.6, 0.4], anchor: 'feet', intensity: 0.8 },
  },
```

End of the `--- Level 7 ---` section (after `windrunner_band`):

```ts
  {
    // The executioner: a max roll (+3) plus 3 invested Heavy Thrust ranks
    // passes the soft cap of 5 and unlocks Executioner's Thrust (+50% Jab
    // vs stunned/slowed) — rewarding a tree that already bought Spear
    // Throw stuns or Leap slows. The mana cut pushes toward jab-range
    // brutality.
    id: 'headsmans_reach', baseId: 'war_spear', name: "Headsman's Reach",
    flavor: 'It asks once.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'arms.heavy_thrust' },
      { id: 'damage_pct', min: 6, max: 11 },
      { id: 'max_mana', min: -120, max: -75 },
    ],
    levelReq: 7,
    lpcTint: { color: '#8a2f2f' },
    aura: { style: 'drip', color: [0.6, 0.15, 0.1], anchor: 'chest', intensity: 0.8 },
  },
```

End of the `--- Level 10 ---` section (after `the_quiet_hour`, closing out the array):

```ts
  {
    // The riposte fortress: a max roll (+3) plus 3 invested Bracing ranks
    // passes the cap of 5 and unlocks Riposte (blocked hits charge a free
    // stunning Jab). Mobile Guard ranks let the wall advance while
    // blocking. It hits softer — the keystone's free Jabs are the damage.
    id: 'the_patient_wall', baseId: 'champion_spear', name: 'The Patient Wall',
    flavor: 'It has never struck first.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'bulwark.bracing' },
      { id: 'talent', min: 1, max: 2, node: 'bulwark.mobile_guard' },
      { id: 'max_health', min: 90, max: 130 },
      { id: 'damage_pct', min: -12, max: -6 },
    ],
    levelReq: 10,
    lpcTint: { color: '#8d98a8' },
    aura: { style: 'orbit', color: [0.7, 0.75, 0.85], anchor: 'chest', intensity: 0.7, motes: 2 },
  },
```

- [ ] **Step 4: Run the full server suite**

Run: `npm test`

Expected: PASS. The suite's generic invariants now also cover the new items — notably `no talent max roll exceeds its node soft cap`, `a talent affix on a non-stackable node never rolls`, `no affix range spans or touches zero`, `unique midpoints and extremes stay inside their band bounds`, and the aura/tint shape tests. A failure in any of those means a manifest typo — fix the manifest, not the invariant.

- [ ] **Step 5: Commit**

```bash
git add shared/src/items.ts server/tests/items.test.ts
git commit -m "feat(items): gladiator unique set — one archetype per band"
```

---

### Task 5: Combat-level archetype tests and visual verification

Prove the payloads at the loadout/keystone layer: spell grants land in `talentRanks` for a gladiator, are inert off-class, and each keystone-forcer needs exactly 3 invested tree ranks at max roll. Then render the contact sheet to eyeball the new recolors.

**Files:**
- Test: `server/tests/items-combat.test.ts` (new describe block + expanded imports)

**Interfaces:**
- Consumes: unique ids/ranges from Task 4; `computeLoadout`, `hasKeystone`, `UNIQUE_ITEMS`, `ITEM_BASES` from `@arena/shared`.

- [ ] **Step 1: Expand the shared import**

In `server/tests/items-combat.test.ts`, line 6 currently reads:

```ts
import { MAX_HP, MAX_MANA, computeLoadout, deriveElement } from '@arena/shared';
```

Change to:

```ts
import { MAX_HP, MAX_MANA, computeLoadout, deriveElement, hasKeystone, UNIQUE_ITEMS, ITEM_BASES } from '@arena/shared';
```

- [ ] **Step 2: Write the failing tests**

Append a new describe block at the end of the file:

```ts
describe('gladiator uniques — archetype payloads', () => {
  // A shipped unique as an equipped ItemRow with every affix at one end of
  // its range ('max' = the lucky end, for grants and drawbacks alike).
  const uniqueRow = (id: string, end: 'min' | 'max'): ItemRow => {
    const u = UNIQUE_ITEMS.find(x => x.id === id)!;
    const base = ITEM_BASES.find(b => b.id === u.baseId)!;
    return {
      id: `u_${id}`, base_id: u.baseId, rarity: 'unique',
      affixes: u.affixes.map(s => ({ id: s.id, value: s[end], ...(s.node === undefined ? {} : { node: s.node }) })),
      level_req: u.levelReq, equipped_by: 'char1', equipped_slot: 'weapon', slot: base.slot,
      unique_id: u.id,
    };
  };

  it('Crowd-Pleaser grants arms.spear_throw to a gladiator with an empty tree (oskill)', () => {
    const { talentRanks } = computeLoadout([uniqueRow('crowd_pleaser', 'max')], 'gladiator');
    expect(talentRanks.get('arms.spear_throw')).toBe(1);
  });

  it('The Short Road grants arms.leap plus crushing-landing ranks', () => {
    const { talentRanks } = computeLoadout([uniqueRow('the_short_road', 'max')], 'gladiator');
    expect(talentRanks.get('arms.leap')).toBe(1);
    expect(talentRanks.get('arms.crushing_landing')).toBe(2);
  });

  it('gladiator weapon talent affixes are inert for other classes', () => {
    expect(computeLoadout([uniqueRow('crowd_pleaser', 'max')], 'mage').talentRanks.size).toBe(0);
    expect(computeLoadout([uniqueRow('the_patient_wall', 'max')], 'ranger').talentRanks.size).toBe(0);
  });

  it("max-roll Headsman's Reach + 3 invested Heavy Thrust ranks trips Executioner's Thrust; 2 do not", () => {
    const { talentRanks } = computeLoadout([uniqueRow('headsmans_reach', 'max')], 'gladiator');
    const itemRanks = talentRanks.get('arms.heavy_thrust') ?? 0;
    expect(itemRanks).toBe(3);
    expect(hasKeystone('arms.heavy_thrust', 3 + itemRanks)).toBe(true);
    expect(hasKeystone('arms.heavy_thrust', 2 + itemRanks)).toBe(false);
  });

  it('max-roll Patient Wall + 3 invested Bracing ranks trips Riposte; the item alone never does', () => {
    const { talentRanks } = computeLoadout([uniqueRow('the_patient_wall', 'max')], 'gladiator');
    const itemRanks = talentRanks.get('bulwark.bracing') ?? 0;
    expect(itemRanks).toBe(3);
    expect(hasKeystone('bulwark.bracing', 3 + itemRanks)).toBe(true);
    expect(hasKeystone('bulwark.bracing', itemRanks)).toBe(false);
  });

  it('drawback floors hold: min-roll Headsman\'s Reach alone cannot sink maxMana below the floor', () => {
    // -120 mana (the worst roll) against the 500 base stays well above the
    // 50 floor; the assertion pins the clamp path, not the exact number.
    const { statBlock } = computeLoadout([uniqueRow('headsmans_reach', 'min')], 'gladiator');
    expect(statBlock.maxMana).toBeGreaterThanOrEqual(50);
    expect(statBlock.maxMana).toBe(MAX_MANA - 120);
  });
});
```

- [ ] **Step 3: Run to verify current behavior**

Run: `npm test -- items-combat.test.ts`

Expected: PASS immediately IF Task 4 landed first (these tests exercise shipped manifests). If run before Task 4, every test fails on `find` returning `undefined` — that ordering check is the point of writing them as a separate task: they gate on the manifests being real. If anything fails after Task 4, the manifest and the spec disagree — fix the manifest to match the spec tables.

- [ ] **Step 4: Run both full suites**

Run: `npm test && npm run test --workspace=client`

Expected: PASS, all suites.

- [ ] **Step 5: Render the weapon contact sheet and eyeball the recolors**

Run: `node scripts/render-weapon-contact-sheet.mjs`

Expected: script completes; it composites every `ITEM_BASES` weapon (now including the three new spears) and prints its output path. Open the sheet and confirm the dark/bronze/silver spears sit in the hand identically to the iron/steel/gold ones (same silhouette, so any offset means an anchor-table mistake in Task 2).

- [ ] **Step 6: Commit**

```bash
git add server/tests/items-combat.test.ts
git commit -m "test(items): gladiator unique archetype payloads and keystone gates"
```

---

## Verification checklist (post-plan)

- `npm test` and `npm run test --workspace=client` both green.
- Contact sheet shows the three recolors correctly attached.
- Not in scope, deliberately: no DB migration (starter weapon stays `iron_spear`; drops/vendor/lootbox pick bases and uniques from the manifests at runtime), no engine changes, no `CLASS_TREES` frost fix for mage (parked follow-up in the spec), no L4 weapons for mage/ranger (parked).
