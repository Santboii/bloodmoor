# Frost Talent Tree — Design

Approved 2026-08-02. Adds a third mage tree (`frost`) with thirteen nodes and
three new spells, alongside the existing `fire` and `utility` trees. A mage
specs freely into fire, frost, or any mix; point scarcity, not gating, forces
the choice.

Depends on [2026-08-02-spell-loadout-slots-design.md](2026-08-02-spell-loadout-slots-design.md),
which must land first — the mage reaches seven castable spells here and today
has four keys.

## Design intent

Frost is **standalone cold artillery**, not a support tree. It deals its own
damage in a shape fire cannot: a cheap fast opener, a persistent field, and a
capstone that saturates an area with shards. Chill is a flavorful rider on
frost hits, not a resource the tree is built to spend.

Two rejected alternatives, recorded so they are not re-litigated:

- **Frost as setup for fire** (chill/shatter combo, frost amplifies fire
  damage). Rejected: it makes frost feel obligatory rather than chosen, and a
  pure-frost build becomes strictly worse than a hybrid.
- **Frost as defense/attrition** (cold armors, mana burn). Rejected: furthest
  from the D2 frost sorceress fantasy and poorly suited to a fast duel.

**Crowd control is deliberately constrained.** Hard CC is the most frustrating
thing to be on the receiving end of in a duel, and the codebase already has a
proven-safe envelope: the ranger's Deep Freeze roots for 0.4s with a per-target
6s internal cooldown (`types.ts:202-203`). Every root in this tree reuses those
exact constants. Slows are the default tool; roots are rare, brief, and gated.

## Node table

Tiers mirror the fire tree's rhythm — spells at 1/4/6, modifiers between —
so the column reads at the same cadence as the one beside it.

| Tier | Node | Cost | Effect | Soft cap × base | Keystone |
|---|---|---|---|---|---|
| 1 | **Ice Bolt** | 1 | Spell. Fast projectile, 60–85 damage, chills on hit. | — | — |
| 2 | **Bitter Chill** | 1 | Ice Bolt's chill is stronger and lasts longer per rank. | 5 × 0.05 | **Flash Freeze** |
| 2 | **Ice Lance** | 1 | Ice Bolt pierces one additional enemy per rank. | 3 × 1 | **Impaler** |
| 3 | **Frostbite** | 2 | Ice Bolt deals more damage the more slowed the target is. | 3 × 0.10 | **Rimeheart** |
| 3 | **Splintering Ice** | 2 | Ice Bolt shatters into shards on impact, +1 shard per rank. | 3 × 1 | **Flechette** |
| 4 | **Blizzard** | 2 | Spell. Persistent circular field, 45 dmg/s, chills anyone inside. | — | — |
| 5 | **Lingering Winter** | 1 | +10% Blizzard duration per rank. | 5 × 0.10 | **Permafrost** |
| 5 | **Deepening Cold** | 2 | +8% Blizzard damage per rank. | 5 × 0.08 | **Absolute Zero** |
| 5 | **Whiteout** | 1 | +20% Blizzard radius per rank. | 5 × 0.20 | **Blinding Squall** |
| 6 | **Frozen Orb** | 3 | Spell. Drifts forward spraying shards radially, then expires. | — | — |
| 7 | **Shard Storm** | 2 | Frozen Orb fires more shards per volley per rank. | 3 × 2 | **Cataclysmic Orb** |
| 7 | **Glacial Drift** | 1 | Frozen Orb travels slower and lives longer per rank. | 5 × 0.12 | — |
| 7 | **Cold Mastery** | 2 | +6% damage to all frost spells per rank. | 5 × 0.06 | **Absolute Cold** |

Gates mirror fire exactly (`skills.ts:40-51`): tier 2 requires Ice Bolt; Blizzard
requires Ice Bolt plus any tier-2 node; tier 5 requires Blizzard; Frozen Orb
requires Blizzard plus any tier-5 node; tier 7 requires Frozen Orb. No
mutually-exclusive gates — the tree is not internally branching.

### Keystones

Unlocked by the first rank past soft cap, using the existing `hasKeystone`
mechanism (`skills.ts:203-207`) on **merged** tree + item-affix ranks, so gear
can complete a build.

| Keystone | Effect |
|---|---|
| **Flash Freeze** | An Ice Bolt hitting a target that is not already chilled roots them for 0.4s. Per-target 6s internal cooldown. Reuses `DEEP_FREEZE_ROOT_TICKS` / `DEEP_FREEZE_COOLDOWN_TICKS` and the existing `rootUntil` / `freezeRootReadyAt` fields. |
| **Impaler** | Pierce is unlimited, and each enemy pierced adds +8% damage to the bolt's subsequent hits. Rides the same momentum pattern as Guided's `redirectCount`. |
| **Rimeheart** | Frostbite's bonus applies to *all* your frost damage against that target, not just Ice Bolt. |
| **Flechette** | Shards home toward the nearest enemy instead of scattering. |
| **Permafrost** | When a Blizzard expires it leaves chilled ground for 2s: no damage, but the chill continues to apply. |
| **Absolute Zero** | A target standing in your Blizzard continuously for 1.5s is rooted for 0.4s. Per-target 6s internal cooldown; the dwell timer resets on leaving the field. |
| **Blinding Squall** | Enemies inside your Blizzard cannot see your Meteor and Blizzard impact indicators. Mirrors Blind Strike (`skills.ts:94`). |
| **Cataclysmic Orb** | The Frozen Orb detonates when it expires: 120 damage in a 100-unit radius. |
| **Absolute Cold** | Your chill lasts 50% longer. *(Originally specified as removing area-damage edge falloff. No frost area damage has falloff, so that described a no-op; repointed at `chillTicks`, which Ice Bolt and Blizzard already read, and which feeds Frostbite and Rimeheart.)* |

Glacial Drift is intentionally keystone-free, matching how fire leaves
Cataclysm and Inferno Expanse as pure numbers.

## Spells

New `SpellId`s: **9** Ice Bolt, **10** Blizzard, **11** Frozen Orb.

`SPELL_CONFIG` entries (`shared/src/types.ts:207`, the only exhaustive
`Record<SpellId, …>` in the codebase and therefore the one compile error that
will flag a missed id):

| Spell | Mana | Cooldown |
|---|---|---|
| 9 Ice Bolt | 20 | 24 ticks (0.4s) |
| 10 Blizzard | 65 | 180 ticks (3s) |
| 11 Frozen Orb | 100 | 300 ticks (5s) |

### Ice Bolt

Cheaper and faster than Fireball (25 mana / 30 ticks / 80–120), and weaker per
hit. Speed 480 against Fireball's 400, radius 8 against 10. Chill applies
`slowFactor` 0.85 for 90 ticks via the existing `slowUntil` / `slowFactor`
fields on `PlayerState` — the ranger's freeze arrows already established this
plumbing, so no new status effect is introduced.

Pierce is worth noting honestly: in 1v1 it does nothing. It is live in 2v2 and
FFA, two of the game's three modes (`GameModeType`, `types.ts:226`), and Ice
Lance is costed at 1 point per rank accordingly. If 1v1 becomes the only mode
anyone plays, Ice Lance is the first node to revisit.

### Blizzard

A persistent circular zone: radius 90, 4s duration, 45 damage/sec, chilling
anyone inside. Structurally this is the cheapest of the three — Rain of Arrows
already converts into a circle zone and `fireWallDamagesPlayer`
(`spells/FireWall.ts:115-124`) already branches on `shape === 'circle'`.

### Frozen Orb

Travels at 140 u/s, lives 2.5s (150 ticks), and emits a radial volley of 4
shards every 15 ticks — ten volleys, 40 shards, each 25–40 damage at speed 320
with a 30-tick lifetime.

Total theoretical output is far above Meteor's 200–280, but a single target
realistically eats three to five shards for roughly 100–160. The orb trades
Meteor's burst for area saturation and near-undodgeability at close range.
**These numbers are a starting point and need playtesting**; shard count and
per-shard damage are the tuning levers, in that order.

## Engine changes

Following the spell-addition contract:

**New entity type.** `FrozenOrbState { id, ownerId, position, velocity,
expiresAt, nextVolleyAt, shardsPerVolley, damageMin, damageMax, detonateOnExpiry }`
as a new `frozenOrbs` array on `GameState`. That means threading it through
`makeInitialState` (`StateAdvancer.ts:115`), the tick-local copies (`:218-222`),
the return literal (`:687`), and — easily missed — the reconnect owner remap
(`Room.ts:292-308`), without which a reconnecting player's in-flight orb loses
its damage multipliers.

**New projectile types.** `ProjectileType` gains `'icebolt' | 'iceshard'`
(`types.ts:8`).

**New spell modules** in `server/src/spells/`, following the existing
convention of free functions rather than a base class: `IceBolt.ts`
(`spawnIceBolt` / `advanceIceBolt` / `isIceBoltExpired` / `iceBoltHitsPlayer` /
`iceBoltDamage`), `Blizzard.ts`, `FrozenOrb.ts`.

**Modifiers.** `SpellModifiers` gains `iceBolt`, `blizzard`, `frozenOrb` keys
and their branches (`skills/SpellModifiers.ts:36-41`, `:68-94`). Note the
builder takes `Map<string, number>`, so a typo'd node id compiles silently —
the unit tests below are the only guard.

**Client.** A `syncIceBolts` / `syncFrozenOrbs` pair in `SpellRenderer.ts`
modeled on `syncArrows` (`:239-282`), registry entries at `:96-101`, dispatch
in `update()` (`:168-188`), and disposal branches in `dispose()` (`:469-496`).
Blizzard reuses the circle-zone rendering path at `:303-358` with a cold tint.
Audio entries in `sfx.ts:50-59`; a missing one silently falls back to
`cast_fire`, so this is worth an explicit check.

**Bounds.** `server/src/index.ts:48` validates `castSpell <= 8` and must become
`<= 11`. This is a plain number, not a type, so nothing will flag it.

### Third tree column

`SkillTreeUI` renders exactly two columns (`:349-356`, markup `:374-392`).
Frost needs a `FROST_POSITIONS` map plus `FROST_ROWS = 7`, a third column
`<div>` and `<svg>`, a matching `drawConnections('st-frost-svg', …)` call, and
CSS width adjustments — `.st-columns{max-width}` at `:133` and
`.st-col-main{min-width:480px}` at `:134` — or the third column wraps.

`renderNode` returns `''` for any node missing from the positions map
(`:417`), so an omitted position silently deletes the node rather than
erroring. `NODE_ICONS` (`:10`) is `Record<NodeId, string>` and *will* fail the
build until all thirteen are added — the useful compile error here.

The mage column layout becomes fire | frost | utility+details. At three
columns the tree screen needs a horizontal-scroll or wrap fallback below
roughly 1100px, which today's two-column layout has never needed.

### Refactor: explicit zone kind

`FireWallState` is already overloaded as a generic persistent ground zone, and
the code distinguishes zone types by **string-matching id prefixes**. The
`rain_zone_` prefix is load-bearing in five places: `StateAdvancer.ts:62`
(Exposed lookup), `:449` (Stormcall drift), `:606` (damage-rate selection),
`:617-620` (which modifier set applies), and `SpellRenderer.ts:303` (tint and
falling-arrow visuals).

Adding Blizzard as a third zone type through that mechanism would compound a
latent bug — any future id scheme that happens to start with `rain_zone_`
silently inherits ranger damage rates. Replace the prefix sniffing with an
explicit `kind: 'firewall' | 'crater' | 'rain' | 'blizzard'` field on
`FireWallState`, set at every construction site, and switch the five read sites
onto it.

This is scoped to what the frost work touches and is a prerequisite for
Blizzard being clean rather than fragile. It is not an invitation to refactor
the zone system further.

## Point economy

No changes. Characters earn 1 point per level
(`supabase/migrations/20260731040000_economy.sql:196`).

| Tree | Points to soft-cap everything |
|---|---|
| Fire | ~57 |
| Utility | ~16 |
| Frost | ~67 |

A fully-invested mage would need roughly 140 points. Specialization is
therefore forced by arithmetic rather than by gates, which is exactly the
intent: a hybrid spends into two trees knowing both stay shallow, and the
interesting builds are the ones that find a shallow combination worth more
than a deep single tree.

Worth watching after release: Cold Mastery boosts all frost damage for 2
points per rank, which is the most likely candidate to be either mandatory or
ignored. If every frost build takes it first, it is priced wrong.

## Testing

- **Gates.** `canUnlock` for every frost node: prerequisites enforced,
  tier-5 `requiresAny` satisfied by each of the three tier-5 nodes
  independently.
- **Costs.** `totalSpentForRanks` matches the table above for each node,
  including over-cap premiums.
- **Modifiers.** `buildSpellModifiers` returns expected values at ranks 0, 1,
  soft cap, and soft cap + 1 for all ten stackable frost nodes. Because the
  builder's parameter is `Map<string, number>`, add an explicit test that every
  node id the builder reads exists in `SKILL_NODES` — this is the only defense
  against a silent typo.
- **Keystones.** `hasKeystone` true only past soft cap; Flash Freeze and
  Absolute Zero respect the 6s per-target ICD and do not stack with the
  ranger's Deep Freeze on the same target.
- **Spells.** Per-module predicate tests mirroring the existing Fireball and
  FireWall suites: expiry, owner self-immunity, circle-zone containment for
  Blizzard, volley cadence and shard count for Frozen Orb.
- **Reconnect.** A `frozenOrbs` entry has its `ownerId` remapped by
  `remapPlayer`.
- **Zone kind.** After the refactor, each of the four zone kinds takes its
  intended damage rate and modifier set.

## Risks

- **Frozen Orb performance.** 40 shards per cast, in a game that broadcasts
  full state snapshots at 60Hz. Two orbs plus a multishot ranger is a
  plausible worst case in 2v2. Shard count is the first tuning lever and the
  snapshot size should be measured before the numbers are locked.
- **Chill stacking with ranger freeze.** `slowFactor` is a single field, so
  the last writer wins rather than the strongest. Frost's chill and the
  ranger's freeze can currently overwrite each other in 2v2. Existing
  behavior, but frost makes it common enough to notice — resolve as
  `min(existing, incoming)` while Blizzard and freeze arrows overlap.
- **Three-column layout.** The skill tree has only ever rendered two columns.
  Narrow viewports need a fallback that today's layout has never exercised.
