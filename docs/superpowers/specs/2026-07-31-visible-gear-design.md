# Visible Gear (Itemization Phase 3) — Design

Approved 2026-07-31. Executes the "Visible gear" phase reserved by
`2026-07-30-itemization-economy-design.md`. Equipped items render on the
character sprite itself, and item icons are derived from the same sprite
assets so what an icon shows is exactly what the character wears.

## Decisions (locked in brainstorming)

- **Color source: fixed per base.** Each visible `ItemBase` has one
  canonical look (sheet + optional fixed tint). Icon and worn sprite both
  derive from it. No schema change; rarity is expressed on the icon
  border, never on the item's color.
- **Icons: sprite-derived.** Icons are cropped frames of the item's own
  LPC sheet, tinted identically to the worn layer — the match is
  guaranteed by construction. Font Awesome glyphs remain only as
  loading/failure fallback and for invisible slots.
- **Slot scope: all four visible slots** — helmet, armor, leggings,
  weapon (staves/bows). Rings/amulets stay stat-only per the Phase 1
  spec.
- **Preview scope: arena + Gear-screen paperdoll**, plus equipped gear on
  the character-select renders.
- **Architecture: shared layer resolution + runtime icon crops**
  (Approach 1). Rejected: vendor-time baking (needs an image dependency
  and a second tint implementation that can drift) and a separate gear
  overlay sprite (cannot z-interleave weapon layers with body/hair per
  direction).

## Section 1 — Asset acquisition

`scripts/vendor-lpc.mjs`'s `LAYERS` list grows by one entry (or a bg/fg
pair) per visible base — 13 bases: 2 helmets, 2 armors, 2 leggings,
3 staves, 3 bows.

Candidate upstream mapping (directional, not confirmed — the plan's
**first task live-verifies every path** against the generator repo, per
Workstream S discipline):

| Base | Upstream candidate | Fallback if absent |
|---|---|---|
| Leather Cap | a leather/cloth cap under `hat/` | tinted variant of another cap |
| Iron Helm | a metal helm (barbuta/norman style) | — |
| Padded Tunic | `torso/armour/` leather or padded jacket | tinted longsleeve variant |
| Scale Mail | `torso/armour/` scale or chain | — |
| Cloth Pants | existing `legs/pants` sheet, fixed tint | already vendored |
| Mail Leggings | `legs/armour/` chain leggings | — |
| 3 staves | distinct staff models where upstream has them | same model, 3 fixed tints |
| 3 bows | normal / recurve / great bow | same model, 3 fixed tints |

Rules:

- Distinct model per base where upstream has one; otherwise the same
  model differentiated by fixed tint (icon↔character match still holds —
  both derive from the same sheet + tint).
- Weapon sheets are verified per-animation. An animation with no sheet
  renders without the weapon via the compositor's existing missing-sheet
  skip — acceptable degradation, recorded per-base during the manifest
  task.
- The CREDITS licensing gate in `vendor-lpc.mjs` runs unchanged and
  fails the vendor run on any unattributed sheet.

## Section 2 — Manifest & layer resolution (shared)

`ItemBase` gains an optional visual field:

```ts
lpc?: {
  layers: { path: string; z: number; tint?: string; tintMode?: 'fabric' }[];
  // multiple entries model bg/fg splits (weapon behind body on some
  // rows) — same pattern as ponytail hair
  hidesHair?: boolean; // full helms that would clip badly with hair
}
```

New pure function (in `shared/src/appearance.ts` or a sibling
`gearVisuals.ts`):

```ts
type GearVisuals = Partial<Record<'helmet' | 'armor' | 'leggings' | 'weapon', string /* base_id */>>;
function layersForLoadout(a: Appearance, gear: GearVisuals): LpcLayer[];
```

Semantics: start from `layersFor(a)`, then

- **helmet** → drop the hat layer and draw the helmet at the same z
  (above hair, exactly how the wizard hat renders today — no hair
  suppression by default). Bases flagged `hidesHair` additionally drop
  the above-head hair layers; whether a given helm needs the flag is
  decided visually during the asset-verification task;
- **armor** → replace the torso layer;
- **leggings** → replace the legs layer;
- **weapon** → append its layers at their manifest z values;
- unknown or invisible base ids are ignored (defensive manifest lookup,
  same posture as `validateItemRow`).

DOM-free and unit-testable in node like the rest of the shared layer
math.

## Section 3 — Server → client flow

No schema changes — everything derives from `base_id`.

- On room join the server already fetches equipped items for the stat
  loadout; from that same result it extracts the visible slots into a
  `GearVisuals` (≤4 base ids), stores it beside the appearance in
  `Room`, and ships it in the same join/state payload
  (`PlayerState.gear?` next to `appearance?`).
- Gear is snapshotted at join, like appearance — re-equipping mid-match
  is impossible, so no live updates.
- Client: `CharacterMesh`/`SpriteCharacter` pass `(appearance, gear)`
  through; `compositeAppearance` composites the `layersForLoadout`
  result instead of calling `layersFor` internally.
- Remote players render identically since gear rides the same payload
  as appearance.

## Section 4 — Icons & paperdoll

**Icons.** New client module `items/itemIcon.ts` exposing
`iconFor(base): Promise<HTMLCanvasElement>`, cached per base id:

1. Load the base's own sheet — prefer `idle.png`, fall back to the
   first available animation (some weapons may lack idle).
2. Take the down-facing first frame.
3. Apply the base's tint via the same tint routine the compositor uses,
   extracted into a shared helper so the two implementations cannot
   drift.
4. Auto-crop to the opaque bounding box; scale nearest-neighbor into
   the icon tile.

Gear and Shop screens swap the FA glyph for this canvas; FA remains
only as the loading/failure fallback and for rings/amulets. **Rarity
color moves from the glyph fill to the icon tile's border** (both
screens plus the details panel).

**Paperdoll.** The Gear screen gains an animated character preview
(reusing the appearance picker's `SpritePreview`) rendering
`layersForLoadout(appearance, equippedGear)`, re-composited on every
equip/unequip. Character select renders equipped gear too: one
`fetchItems` of equipped rows covers all of the account's characters,
fed into the same pipeline.

## Section 5 — Error handling & testing

- Unknown base id in a gear payload → layer ignored.
- Missing sheet for an animation → compositor's existing null-image
  skip; the character renders without that piece for that animation
  only.
- Icon sheet fails to load → FA glyph fallback, never a broken tile.
- Tests: node-side unit tests for `layersForLoadout`
  (override/replace/append/suppress-hair semantics, unknown ids); a
  server test that the join payload carries `gear` matching equipped
  rows; the vendor run's attribution gate as the licensing check.
- Binding constraints from the Phase 1 spec carry over: server
  authority, defensive validation at DB read boundaries, pixel theme
  kit for UI, suites stay green and grow.
