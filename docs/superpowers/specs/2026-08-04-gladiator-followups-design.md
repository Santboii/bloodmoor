# Gladiator Follow-ups — Design

**Date:** 2026-08-04
**Status:** Approved
**Builds on:** the shipped gladiator expansion (main@`764622c`; spells 13–16 core, 20–23 expansion).

## 1. Kick Up Dust: longer, bigger, smokier

- `DUST_DURATION_TICKS`: 2.5s → **5s** (300 ticks). `DUST_RADIUS`: 120 → **150**.
- Sandstorm (+15%/rank) still multiplies on top: rank 3 ≈ 7.1s / ~213u. Balance accepted deliberately; counterplay is entering the cloud.
- Visual: dust sprite count ~12 → **28** per cloud; sprite scale ~1.6×; higher base opacity with more per-sprite variance; slower drift. Radius comes from zone data (no separate visual constant).
- Tests: existing dust duration/radius assertions update to the new constants (deliberate widening); a density assertion is not required (no renderer harness).

## 2. Spear Flurry: spear-jab visual

Replace the single ring-sector flash in `SpellRenderer` with **jab meshes**:

- On each flurry hit tick (client detects via `flurryNextHitAt`/elapsed pattern or per-frame while `flurryUntil` active at the hit cadence), spawn **3 spear thrusts** at uniformly-random angles within the 90° arc toward `p.facing`.
- Each thrust: reuses the spear shaft+tip geometries at ~0.7× scale, animates a fast out-and-back poke over ~10 frames — extends from 40u to ~90u from the caster along its angle, then retracts and is disposed.
- Across a 5-hit burst: ~15 staggered jabs in varied directions.
- Small pooled entries keyed per caster; disposed on burst end/dispose(); same concealment (`isConcealedFromViewer`) and corpse guards as other per-player visuals.

## 3. Leap → "Footwork" utility tree

Gladiator becomes a three-column class matching the mage/ranger layout: **Arms (main) | Bulwark (third) | Footwork (utility)**.

New tree `'gladiator_utility'`, label **"Footwork"**:

| Node | Id | Tier/Cost | Effect | Keystone |
|---|---|---|---|---|
| Leap (starter spell) | `arms.leap` (unchanged id) | 1 / 1 | mechanics unchanged; cost 2→1 | — |
| Crushing Landing (moved) | `arms.crushing_landing` (unchanged id) | 2 / 2 | unchanged (stackable 3, landing slow) | Seismic Slam (unchanged) |
| Soaring Reach (new) | `gladiator_utility.soaring_reach` | 2 / 2 | +8% Leap range per rank (stackable 3, `effectAtRank`) | — |
| Momentum (new) | `gladiator_utility.momentum` | 3 / 3 | −10% Leap cooldown per rank (stackable 3) | **Skirmisher**: landing a Leap instantly clears Block's re-raise cooldown |

**Id-stability rule (load-bearing):** `arms.leap` and `arms.crushing_landing` keep their ids; only the node's `tree`, `tier`, and `cost` fields change. Ids are opaque; tree membership is data. Zero DB migration, zero breakage for `skill_unlocks` rows and for item talent affixes storing node ids in `items.affixes`. The prefix/tree mismatch is documented with a code comment on both nodes.

Consequences:
- `SkillTree` union gains `'gladiator_utility'`; `CLASS_TREES.gladiator` becomes `['arms', 'bulwark', 'gladiator_utility']` (item talent affix weighting follows automatically).
- Gates: `arms.crushing_landing` requires `arms.leap` (unchanged relation, new tiers). `gladiator_utility.soaring_reach` requires `arms.leap`. `gladiator_utility.momentum` requires `arms.leap` + any of [`arms.crushing_landing`, `gladiator_utility.soaring_reach`] (Acrobatics-shaped). `arms.spear_flurry`'s gate becomes `requiresAll: ['arms.spear_throw'], requiresAny: ['arms.stunning_blow', 'arms.serrated_edge']`.
- Arms drops to 9 nodes; Flurry moves up to tier 4, Extended Flurry/Harpoon tier 5, Quick Reel tier 6 → `ARMS_ROWS` 7→6. `FOOTWORK_ROWS` = 3.
- `TREE_CONFIG.gladiator`: main Arms (6 rows), `third` Bulwark (5 rows), util Footwork (`utilRows` 3), labels accordingly.
- `MOBILITY_SPELLS.gladiator` stays 16; no spell-id, wire, or `sanitizeInput` changes.
- Modifiers: `gladMods.leap.range` gains the Soaring Reach multiplier; cooldown multiplier for spell 16 from Momentum (folded like Quick Reel's); `leap.skirmisher: boolean` keystone flag.
- Skirmisher server logic: in the §0 leap-landing `done` block, if the leaper's keystone is live, set `blockCooldownUntil: undefined` on the leaper.
- No point refunds for existing characters (Leap cost 2→1 keeps prior spends, consistent with every prior rebalance). Existing builds (incl. Scipio's) load unchanged.

## Tests

- Constants assertions for dust; modifier tests for Soaring Reach/Momentum/Skirmisher formulas; gate tests for the new tree + flurry's rewired gate; a Skirmisher integration test (leap-land clears the re-raise gate mid-cooldown); regression: pre-cap Crushing Landing behavior identical; tree-count assertions update: filtering `SKILL_NODES` by `tree` yields arms 9, bulwark 9, gladiator_utility 4 (the two moved nodes count under their new tree despite their `arms.` id prefix).
- Client: tsc + suite; visuals verified by eye (no renderer harness).
