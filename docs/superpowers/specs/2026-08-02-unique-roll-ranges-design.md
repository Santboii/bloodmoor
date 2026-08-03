# Unique Item Roll Ranges — Design

Approved 2026-08-02. Converts `UNIQUE_ITEMS` from fixed affix values to
Diablo II-style **roll ranges**: two copies of the same unique differ, and a
lucky copy is worth hunting. Includes a modest power bump — today's shipped
value becomes the midpoint of each new range.

Builds directly on [2026-08-02-more-unique-items-design.md](2026-08-02-more-unique-items-design.md),
whose `unique_id` work is what makes this cheap.

## Why this is nearly free

Before `unique_id`, a stored row identified its unique by matching its affix
array against the manifest. Variable rolls would have broken identification
outright — every rolled copy would have failed to resolve. Rows now carry
their identity explicitly, and the `items.affixes` column has always stored
per-row values.

**No migration. No schema change. No new column.** Items already granted keep
their fixed values and still resolve, display, and function correctly — they
simply read as one particular roll.

## Design intent

A unique should be a thing you re-examine every time it drops. Fixed values
make the second copy worthless the moment you own the first. Ranges make
"is this one better than mine?" a real question, which is the loop D2
itemization is built on.

Three decisions define the shape:

1. **Talent ranks roll.** This is the strongest form of the feature. Keystones
   fire on *merged* rank past a soft cap, so a high-roll copy reaches its
   keystone with fewer tree points than a low-roll one. The roll changes what
   the build costs, not just its numbers. Quiverfrost is the clearest case: a
   `+1` copy needs three tree ranks to reach Deep Freeze, a `+3` copy needs one.
2. **Drawbacks roll too, and a lucky copy rolls low on its cost.** Both halves
   of the ledger vary, so a perfect copy is perfect on both axes.
3. **Today's value becomes the midpoint.** An average copy matches what ships
   today; a good copy beats it. Everything already balance-checked stays near
   the center of its range.

### Rejected alternatives

- **Numbers roll, talents stay fixed.** Safer, but the affix players care most
  about would be the one that never varies, which blunts the entire chase.
- **Today's value becomes the floor** (ranges extend upward only). A clean
  across-the-board buff, but a larger power increase than intended and it
  pushes most items past their drift ceiling.
- **Re-rolling an existing item.** Out of scope. Rows keep the values they were
  granted with, forever.

## The roll model

### Manifest format

`UniqueItem.affixes` becomes a specification rather than a rolled value:

```ts
export type UniqueAffixSpec = {
  id: AffixId;
  min: number;
  max: number;
  node?: NodeId;   // talent only
};
```

Bounds are stored **numerically**, which yields the model's one load-bearing
invariant:

> **`max` is always the lucky roll.**

For a grant, `+4 → +7`: max is best. For a drawback, `-60 → -35`: max is
*still* best, because −35 is the smaller penalty. Roll quality is therefore
`(rolled − min) / (max − min)` for every affix, grant and cost alike, with no
special-casing by sign. A fixed affix is expressed as `min === max`.

### Rolling

```ts
export function rollUnique(unique: UniqueItem, rng: () => number = Math.random): RolledAffix[];
```

Pure and deterministic, living beside the existing `rollItem` in
`shared/src/items.ts` and reusing its `rollInRange` helper. Each affix rolls an
integer uniformly in `[min, max]` inclusive; `node` is carried through
unchanged.

Call sites:

- **`rollDropItem`** (`shared/src/economy.ts`) currently returns
  `unique.affixes` verbatim. It calls `rollUnique(unique, rng)` off the same
  seeded stream, so drops stay reproducible for a given seed. Note this
  consumes one additional rng value per affix, which shifts the sequence for
  any downstream roll in the same stream — acceptable, since each call site
  rolls a single item.
- **Admin grant** previews a roll and grants exactly what was previewed, which
  mirrors the existing non-unique admin flow ("granted exactly as previewed,
  never re-rolled server-side"). The preview gains a re-roll button matching
  that flow.

### Two structural invariants

**1. Binary nodes do not roll.** `+1–2 Meteor` is meaningless — you either have
the spell or you do not. Only nodes with a `stackable` entry in `SKILL_NODES`
may carry a rank range. Fixed at `+1`: `fire.meteor`, `archer.multishot`,
`utility.ethereal_form`, `archer_utility.shadowstep`, `utility.phantom_step`,
`archer_utility.combat_roll`.

**2. A talent's `max` may not exceed the node's soft cap.** This preserves the
set's existing rule that *no item trips a keystone on its own* — a high roll
only shortens the tree investment required. Concretely, Ninefold Ember rolls
`+2–3` Pyroclasm rather than `+2–4`, because Pyroclasm's soft cap is 3.

The second invariant is not currently observable: fire nodes have no keystones
today, so a `+4` Pyroclasm would be harmless. It becomes a free Perpetual Flame
the moment the concurrent fire-talent rework lands. Encoding it now is cheaper
than rediscovering it as a balance bug.

## Balance guard

The existing drift guard caps a unique's numeric affix at 1.5× its band's top
rare roll (2.5× for drawbacks). Widow's Vow already sits *at* that ceiling
(75 mana = 1.5 × 50), so centering a range on 75 necessarily puts its max above
it. Guarding the max is the wrong test once values vary.

The guard changes to two bounds:

| Bound | Grants | Drawbacks |
|---|---|---|
| **Midpoint** — what an average copy is worth | ≤ 1.5× band top | ≤ 2.5× band top |
| **Extreme roll** — hard stop on the largest magnitude | ≤ 2× band top | ≤ 3.5× band top |

A lucky roll exceeding the normal ceiling is the point of the feature; running
away from it is not.

The two columns differ because drawbacks already carry a looser midpoint bound
— a cost that hurts is the whole reason the upside is allowed. Each column's
hard stop is its own midpoint bound widened by the same proportion, so neither
stop is tighter than the bound it backstops. (An earlier draft applied 2× to
both, which would have rejected Hollowhide Jerkin's `-45` regen roll against a
`2.5×` midpoint bound that permits `-37.5` — a hard stop stricter than the
soft one.)

The bound applies to the affix's largest magnitude: `max` for a grant, `min`
for a drawback.

## The ranges

Today's shipped value sits at the midpoint of each range, or within rounding
of it — an integer range around an odd value cannot center exactly, so several
midpoints land half a point high (Kindling's Volatile Ember `+1–2` centers on
1.5 against today's 1). Those are all small upward nudges, consistent with the
intended bump.

**One deliberate exception:** Ninefold Ember's Pyroclasm rolls `+2–3`, a
midpoint of 2.5 against today's fixed 3 — a slight *downward* move. The
soft-cap invariant forbids a `max` above 3, and a `+3–3` range would not roll
at all. The item keeps its ceiling and gains a chance of being worse, which is
the correct trade for a level-10 chase staff.

Talent ranges are constrained by both structural invariants above.

### Level 1

| Item | Rolls |
|---|---|
| **Kindling** | Damage `+4–6` · Volatile Ember `+1–2` · Max Health `-45 → -25` |
| **Threefold Draw** | Multi-shot `+1` *(binary)* · Cast Speed `+2–4` · Max Mana `-33 → -18` |
| **Hunter's Eye** | Seeking Flame `+1–2` · Guided `+1–2` · Max Mana `+15–26` · Damage `-7 → -3` |

### Level 4

| Item | Rolls |
|---|---|
| **Widow's Vow** | Max Mana `+60–90` · Mana Regen `+14–22` · Cast Speed `+3–5` · Max Health `-115 → -75` |
| **Marshstrider Breeches** | Move Speed `+5–7` · Max Health `+40–55` · Cast Speed `-6 → -4` |
| **Hollowhide Jerkin** | Ethereal Form `+1` · Shadowstep `+1` *(both binary)* · Max Health `+40–60` · Mana Regen `-45 → -25` · Damage `-8 → -4` |

### Level 7

| Item | Rolls |
|---|---|
| **Cinderfall** | Meteor `+1` *(binary)* · Damage `+4–8` · Max Mana `-135 → -85` · Cast Speed `-11 → -5` |
| **Quiverfrost** | Freeze `+1–3` *(soft cap 3)* · Damage `+6–11` · Max Health `-95 → -55` · Mana Regen `-28 → -12` |
| **Doomsayer's Barbute** | Cataclysm `+1–3` · Wide Rain `+1–3` · Max Health `+70–100` · Move Speed `-8 → -4` |
| **Emberheart** | Max Mana `+48–72` · Damage `+6–10` · Volatile Ember `+1–3` · Searing Heat `+1–2` |
| **Windrunner Band** | Move Speed `+5–8` · Cast Speed `+4–7` · Barrage `+1–3` |

### Level 10

| Item | Rolls |
|---|---|
| **Ninefold Ember** | Pyroclasm `+2–3` *(soft cap 3)* · Damage `+9–15` · Max Health `-185 → -115` · Cast Speed `-11 → -5` |
| **Stormcaller's Yew** | Sustained Rain `+1–3` · Piercing Rain `+1–3` *(soft cap 3)* · Cast Speed `+4–8` · Max Mana `-150 → -90` · Move Speed `-7 → -3` |
| **The Quiet Hour** | Phantom Step `+1` · Combat Roll `+1` *(both binary)* · Cast Speed `+7–12` · Max Health `-135 → -85` · Max Mana `-90 → -50` |

## Display

### Roll quality

```ts
export function rollQuality(unique: UniqueItem, affixes: RolledAffix[]): number | null;
```

The unweighted mean of `(rolled − min) / (max − min)` across every affix where
`max > min`, returning `null` when an item has no rolling affix (none today,
but the manifest permits it). Fixed affixes are excluded rather than counted as
perfect, so a mostly-binary item is judged only on what actually varied.
Because `max` is always the lucky end, one formula covers grants and costs.

The returned value is a 0–1 fraction; the UI rounds it to the nearest whole
percent for display.

### Gear screen

The item details panel shows each rolled value with its range dimmed beside
it, and an item-level quality figure:

```
Quiverfrost                        Roll quality 86%
  +2 Freeze            (1–3)
  +11% Damage          (6–11)
  −72 Max Health       (−95 → −55)
  −14% Mana Regen      (−28 → −12)
```

A roll of 100% earns a **PERFECT** marker. Drawback rows keep the muted-red
`gr-bad` treatment already in place; the range text uses the existing dim
token, not a new color.

### Admin screen

The read-only manifest table shows ranges rather than fixed values. The grant
preview rolls via `rollUnique` and gains a re-roll button, matching the
existing non-unique preview flow.

Vendor stock never contains uniques, and the lootbox reveal and match-drop
cards show only the item name, so neither needs changing.

## Testing

- **Manifest invariants:** every binary node has `min === max`; every stackable
  talent's `max` is ≤ that node's `softCap`; `min <= max` on every affix;
  midpoints within the drift bounds; `max` within 2× band top.
- **`rollUnique`:** deterministic under an injected rng; every rolled value an
  integer within `[min, max]`; `node` carried through; a fixed affix
  (`min === max`) always produces that value.
- **`rollQuality`:** an all-max roll is 1, an all-min roll is 0, and a
  fixed-only item returns `null`. Verified for an item with drawbacks, to
  confirm sign is not special-cased.
- **Economy:** the two tests asserting `toEqual(manifest.affixes)` change to
  within-range assertions. A seeded drop remains reproducible.
- **Keystone safety:** over many rolls, no single item's talent rank exceeds
  its node's soft cap — the invariant that keeps items from self-granting a
  keystone.

## Out of scope

- Re-rolling or upgrading an item already granted.
- Any change to how non-unique (magic/rare) items roll.
- Showing roll quality anywhere other than the Gear screen details panel.
