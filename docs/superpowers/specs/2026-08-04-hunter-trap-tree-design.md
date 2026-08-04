# Hunter Talent Tree — Design

**Date:** 2026-08-04
**Status:** Approved

Adds a third ranger tree (`hunter`) with thirteen nodes and three new spells,
alongside the existing `archer` and `archer_utility` trees. Structurally this is
the ranger's version of what
[2026-08-02-frost-talent-tree-design.md](2026-08-02-frost-talent-tree-design.md)
did for the mage: a standalone third column, chosen freely, with point scarcity
rather than gating forcing the specialization.

## Design intent

**You don't hit people with traps — you herd them into traps.**

The ranger already owns aimed damage. Power Shot is aim, Multi-shot is aim under
pressure, and Rain of Arrows is a timer placed where the target *will be*. A
trap cannot be aimed: it is planted, it is visible to both players, and a
competent opponent will walk around it. So this tree is not built to land traps
directly. It is built to make walking around them expensive — a slow field that
funnels movement, shrapnel that punishes the detour, and a capstone that springs
the whole board at once. A trap that is never triggered has still done its job
by shrinking the arena.

That framing is what keeps the tree off Rain of Arrows' turf, and it is the
assumption the whole design rests on. If it turns out to be false in play, see
Risks.

Alternatives considered and rejected, recorded so they are not re-litigated:

- **Javelin & Spear (lightning).** D2's actual Amazon second tree, and the
  cheapest to build — projectiles and statuses the codebase already does. Not
  chosen.
- **Passive & Magic (Valkyrie, decoy, dodge).** Needs a whole new engine system:
  AI-driven owned entities that move, target, and are themselves targetable.
  Much larger than frost was.
- **Auto-firing turret traps** (D2 Assassin style: deployed devices that fire on
  a cadence at whoever is nearest). Rejected in favour of dormant snares —
  turrets are summon-lite and drift toward the Valkyrie problem, and a device
  that fires regardless of position does not create the ground-control decision
  this tree is about.
- **Hidden traps.** The strongest ambush fantasy and the truest "trap", but in a
  1v1 with no detection counterplay, dying to an invisible root you could not
  have known about is the most tilting outcome available. Rejected; see the
  visibility decision below.

## The trap contract

A new `TrapState` entity. Planting is a spell cast at a target point.

```
PLANT ──▶ arms 0.5s ──▶ [ dormant, visible to both players, 12s life ]
                                │
                                │  a non-owner enters the trigger radius
                                ▼
                        fires once, then despawns
```

- **Visible to everyone.** Both players see every trap. The trap's power is that
  it denies ground; every death to one is avoidable by definition, which is what
  lets the payloads be genuinely strong. It also means no per-viewer state
  filtering, which nothing in the codebase does today.
- **One-shot.** A trap fires once and is removed. It is not a persistent zone.
- **Capped, not cooldown-gated.** Two armed traps by default, up to five with
  Trap Cache. Planting past the cap removes your oldest. The cap is the real
  limiter and the thing that stops map-carpeting; cooldowns are secondary.
- **Owner-immune.** Your own traps never trigger on you.

## Node table

Tiers follow the fire/frost cadence — spells at 1/4/6, modifiers between — so
the column reads at the same rhythm as the two beside it.

| Tier | Node | Cost | Effect | Soft cap × base | Keystone |
|---|---|---|---|---|---|
| 1 | **Spike Trap** | 1 | Spell. Plant a trap. Arms 0.5s, lives 12s, trigger radius 70. On trigger: 80–110 damage in a 90 burst. | — | — |
| 2 | **Serrated Spikes** | 1 | +8% Spike Trap damage per rank. | 5 × 0.08 | **Hamstring** |
| 2 | **Trap Cache** | 1 | +1 max armed trap per rank (3/4/5). | 3 × 1 | **Quick Hands** |
| 3 | **Tripwire** | 2 | +15% trigger radius per rank. | 5 × 0.15 | **Countermeasure** |
| 3 | **Shrapnel** | 2 | A triggered trap throws arrow shards outward, +1 per rank (3/4/5). | 3 × 1 | **Scattershot** |
| 4 | **Caltrops** | 2 | Spell. Scatter a field, radius 130, 6s. No burst — anyone inside is slowed 35% and takes 15 dmg/s. | — | — |
| 5 | **Rusted Barbs** | 2 | +10% Caltrops slow strength per rank. | 5 × 0.10 | **Mire** |
| 5 | **Wide Scatter** | 1 | +20% Caltrops radius per rank. | 5 × 0.20 | **Second Handful** |
| 5 | **Barbed Wire** | 2 | +8% Caltrops damage per rank. | 5 × 0.08 | **Bleeding Ground** |
| 6 | **Deadfall** | 3 | Spell. Heavy trap: arms 1s, trigger radius 110, 180–240 in a 130 burst, **and detonates your other armed traps within 250u where they stand.** One Deadfall armed at a time. | — | — |
| 7 | **Heavy Jaws** | 2 | +10% Deadfall damage per rank. | 3 × 0.10 | **Maimed** |
| 7 | **Cascade** | 2 | Traps detonated by Deadfall deal +15% damage per rank. | 3 × 0.15 | **Daisy Chain** |
| 7 | **Field Kit** | 1 | −8% cooldown on all Hunter spells per rank. | 5 × 0.08 | **Rearm** |

Node ids: `hunter.spike_trap`, `hunter.serrated_spikes`, `hunter.trap_cache`,
`hunter.tripwire`, `hunter.shrapnel`, `hunter.caltrops`, `hunter.rusted_barbs`,
`hunter.wide_scatter`, `hunter.barbed_wire`, `hunter.deadfall`,
`hunter.heavy_jaws`, `hunter.cascade`, `hunter.field_kit`.

### Gates

Mirror fire and frost exactly. No mutually-exclusive gates — the tree is not
internally branching.

```
hunter.serrated_spikes → requiresAll: [hunter.spike_trap]
hunter.trap_cache      → requiresAll: [hunter.spike_trap]
hunter.tripwire        → requiresAll: [hunter.spike_trap]
hunter.shrapnel        → requiresAll: [hunter.spike_trap]
hunter.caltrops        → requiresAll: [hunter.spike_trap],
                         requiresAny: [hunter.serrated_spikes, hunter.trap_cache,
                                       hunter.tripwire, hunter.shrapnel]
hunter.rusted_barbs    → requiresAll: [hunter.caltrops]
hunter.wide_scatter    → requiresAll: [hunter.caltrops]
hunter.barbed_wire     → requiresAll: [hunter.caltrops]
hunter.deadfall        → requiresAll: [hunter.caltrops],
                         requiresAny: [hunter.rusted_barbs, hunter.wide_scatter,
                                       hunter.barbed_wire]
hunter.heavy_jaws      → requiresAll: [hunter.deadfall]
hunter.cascade         → requiresAll: [hunter.deadfall]
hunter.field_kit       → requiresAll: [hunter.deadfall]
```

### Keystones

Unlocked by the first rank past soft cap, via the existing `hasKeystone`
mechanism on **merged** tree + item-affix ranks, so gear can complete a build.

| Keystone | Effect |
|---|---|
| **Hamstring** | A triggered Spike Trap also slows 40% for 2s. This is the herding engine: one trap makes the next one land. |
| **Quick Hands** | Spike Traps arm instantly. Converts the tree from pre-placed setup to reactive — drop one at your feet while being chased. |
| **Countermeasure** | A trap also triggers when an enemy's mobility spell (Evade, Leap, Teleport) *ends* within 1.5× its trigger radius. Anti-mobility is the trap fantasy's sharpest edge and the game has three dashes to punish. |
| **Scattershot** | Shrapnel shards home toward the nearest enemy instead of scattering. Mirrors frost's Flechette. |
| **Mire** | Caltrops' slow lingers 1.5s after leaving the field, so crossing it costs something even at the far edge. |
| **Second Handful** | Casting Caltrops also scatters a half-size patch at your own feet. Defensive, anti-chase; the mirror of Rain of Arrows' Twin Storm. |
| **Bleeding Ground** | Leaving a Caltrops field carries a 3s bleed. |
| **Maimed** | Deadfall roots for 0.4s. Reuses `DEEP_FREEZE_ROOT_TICKS` and `DEEP_FREEZE_COOLDOWN_TICKS` with the existing `rootUntil` / `freezeRootReadyAt` fields, unchanged. |
| **Daisy Chain** | Deadfall's chain detonation loses its 250u range limit — every armed trap you own fires. |
| **Rearm** | A trap that triggers refunds 50% of the cooldown of the spell that planted it. |

**Only one root exists in this tree**, it is on a keystone, and it uses the
proven-safe envelope (0.4s, 6s per-target internal cooldown). A trap tree could
trivially become a lockdown tree; the existing specs are consistent that hard CC
is the most frustrating thing to be on the receiving end of in a duel. Control
here is slows and denial.

## Explicit design decisions

- **Caltrops is not a trap.** It is a persistent zone, not a dormant proximity
  device, so it breaks the tree's own core mechanic. Deliberate: it is the soft
  wall that makes the hard traps land, and it is by far the cheapest structural
  path — the frost work's `ZoneKind` refactor already generalized
  `FireWallState` into a proper zone entity. The cost is that Caltrops is the
  node closest to Rain of Arrows' territory. It stays distinct by dealing almost
  no damage: it is a movement tax, not a damage zone.
- **Traps are visible to both players.** See the trap contract. This is what
  licenses strong payloads.
- **Modifier values are snapshotted at plant time**, not read at trigger time. A
  trap that outlives a respec still fires the build that planted it.
- **Deadfall's chain is baseline, not a keystone.** The chain is the reason to
  plant multiple traps, which is the tree's core loop; putting it behind a
  keystone would make the loop unavailable to most builds. Cascade and Daisy
  Chain scale it rather than granting it.

## Spells

New `SpellId`s: **17** Spike Trap, **18** Caltrops, **19** Deadfall.

| Spell | Mana | Cooldown |
|---|---|---|
| 17 Spike Trap | 30 | 150 ticks (2.5s) |
| 18 Caltrops | 50 | 300 ticks (5s) |
| 19 Deadfall | 100 | 480 ticks (8s) |

None get a `defaultSlot`, matching the frost spells — they fall to the lowest
empty slot via `resolveSlots`. The ranger goes from four castable spells to
seven against six slots. That pressure is intended; the mage already sits at
eight.

`SPELL_CONFIG` is the only exhaustive `Record<SpellId, …>` in the codebase and
is therefore the compile error that catches a missed id. `VALID_SPELL_IDS` in
`server/src/sanitizeInput.ts` derives from `SPELL_BINDINGS`, so input validation
widens automatically — unlike the frost work, there is no hand-edited numeric
bound to remember.

## Engine changes

### New entity

`TrapState`, as a new `traps` array on `GameState`:

```ts
export type TrapKind = 'spike' | 'deadfall';

export type TrapState = {
  id: string;
  ownerId: string;
  kind: TrapKind;
  position: Vec2;
  armedAt: number;        // absolute ticks
  expiresAt: number;      // absolute ticks
  triggerRadius: number;
  blastRadius: number;
  damageMin: number;
  damageMax: number;
  shardCount: number;     // 0 when Shrapnel is unskilled
  shardsHome: boolean;    // Scattershot
  slowFactor: number;     // 1 when Hamstring is unskilled
  slowTicks: number;
  roots: boolean;         // Maimed
  chainRadius: number;    // deadfall only; Infinity with Daisy Chain
  chainDamageMultiplier: number;  // Cascade, applied to traps this one sets off
};
```

Threading follows the `frozenOrbs` path the frost work already cut:
`makeInitialState`, the tick-local copies, the return literal in
`StateAdvancer`, and — the one the frost spec calls out as easily missed — the
reconnect owner remap in `Room.ts`, without which a reconnecting player's armed
traps lose their multipliers.

### Trigger pass

A new step in the tick, after the status pass and before projectile resolution:

1. Expire traps past `expiresAt`.
2. For each armed trap (`tick >= armedAt`), for each non-owner living player,
   test distance against `triggerRadius`. First match wins.
3. **Collect** triggered traps, then resolve. Deadfall's chain adds every
   owned trap within `chainRadius` to the same collected set before anything
   fires, so a chained trap cannot re-enter the chain and no trap fires twice.
4. Resolving a trap applies blast damage within `blastRadius`, applies slow and
   root riders, appends Shrapnel arrows to `projectiles`, and marks the trap
   dead.

Cost is O(traps × players) per tick, trivial at a cap of five.

### Plant-time cap

Enforced where the spell resolves: count the caster's armed traps of that kind,
evict the oldest if at cap. Spike Traps share one cap (2, up to 5 via Trap
Cache); Deadfall has its own cap of 1.

### Reused, not rebuilt

- `ZoneKind` gains `'caltrops'`. The frost work replaced id-prefix sniffing with
  an explicit `kind` field on `FireWallState`, so Caltrops is a data entry plus a
  damage-rate branch, not a new system.
- Slows use the existing `slowUntil` / `slowFactor` on `PlayerState`.
- The Maimed root uses `rootUntil` / `freezeRootReadyAt` with
  `DEEP_FREEZE_ROOT_TICKS` and `DEEP_FREEZE_COOLDOWN_TICKS` unchanged.
- Shrapnel shards are `ProjectileType: 'arrow'`. No new projectile type.
- Traps are visible to both players, so no per-viewer state filtering is needed.

### New spell modules

`server/src/spells/Trap.ts` in the existing free-function style (`spawnTrap`,
`trapIsArmed`, `trapTriggersOn`, `trapDamage`, `collectChain`) and
`server/src/spells/Caltrops.ts`. Both mirror the shape of `Blizzard.ts` and
`RainOfArrows.ts`.

### Modifiers

`server/src/skills/RangerModifiers.ts` gains `TrapModifiers`,
`CaltropsModifiers` and `DeadfallModifiers` alongside the existing
arrow/multishot/rain/evade sets, wired into `advanceState` the same way.

Unlike the mage's `buildSpellModifiers`, which takes `Map<string, number>` and
therefore compiles a typo'd node id silently, `buildRangerModifiers` is typed
`Map<NodeId, number>` — the union already guards every id this tree adds. No
extra test is needed for that, and the mage builder's weaker signature is out of
scope here.

### Items

`CLASS_TREES.ranger` in `shared/src/items.ts` gains `'hunter'`. That is the only
change needed for talent affixes to roll hunter nodes at the ranger-weighted
rate.

### Client

- `SpellRenderer`: a `syncTraps` pair modeled on `syncArrows` — a dormant idle
  visual, a distinct arming tell for the 0.5s window, and a trigger burst.
  Caltrops reuses the circle-zone rendering path with its own tint and a
  ground-spikes motif.
- `sfx.ts` entries for plant / arm / trigger / Deadfall. A missing entry
  silently falls back to `cast_fire`, so this needs an explicit check.
- HUD `SPELL_ICONS` / `SPELL_TINTS` for 17–19; `InputHandler` needs no change
  (no new mobility spell — `MOBILITY_SPELLS.ranger` stays Evade).

### Refactor: generalize the third tree column

`SkillTreeUI` renders a third column only for the mage, and does it by
hardcoding frost at six sites: the `isMage` flag, the `has-frost` class on
`.st-columns`, the `st-col-frost` div, `st-frost-svg`, `FROST_POSITIONS` /
`FROST_ROWS`, and the `drawConnections('st-frost-svg', …)` call. Bolting the
hunter tree on the same way would mean two parallel hardcoded columns and an
`isMage || isRanger` flag threaded through all six.

Instead, `TREE_CONFIG` gains an optional third entry:

```ts
third?: { tree: SkillTree; label: string; positions: Partial<Record<NodeId, NodePos>>; rows: number }
```

The six sites read it, and the mage's frost column becomes an ordinary
`TREE_CONFIG` entry. Scoped to what this work touches — not an invitation to
restyle the tree screen further.

Two known UI traps: `renderNode` returns `''` for a node missing from the
positions map, so an omitted position silently deletes the node rather than
erroring; and `NODE_ICONS` is `Record<NodeId, string>` and *will* fail the build
until all thirteen nodes are added, which is the useful one.

### Database

No migration. No new class and no new enumerated column value. `skill_unlocks.node_id`
is free text with no CHECK constraint enumerating node ids (verified across
`supabase/migrations/`), so new `hunter.*` ids persist without a schema change.

## Point economy

No changes to point income. Soft-capping every node in the tree:

| Tree | Points to soft-cap everything |
|---|---|
| Archer | 54 (one element) / 72 (all three, unreachable — they are mutually exclusive) |
| Evasion | 14 |
| Hunter | 72 |

Hunter is the ranger's most expensive tree and sits just above frost's ~67. Specialization is forced by arithmetic rather than by
gates, which is the intent: a hybrid spends into two trees knowing both stay
shallow, and the interesting builds are shallow combinations worth more than a
deep single tree. Archer + Hunter is the obvious pairing — Rain of Arrows pushes
someone off a spot, and the spot they move to is where the traps are.

Worth watching after release: Field Kit reduces cooldowns on all three Hunter
spells at 1 point per rank — the cheapest per-rank price in the tree attached to
the broadest effect, which makes it the most likely node to be either mandatory
or, if the cooldowns turn out not to be the binding constraint, ignored. If
every hunter build takes it first, it is priced wrong.

## Risks

- **The trap that is never triggered.** The entire design bets that ground
  denial is worth points even when traps do not fire. If good opponents simply
  never walk into one, the tree is dead weight. First lever is Tripwire's
  trigger radius, second is Caltrops' slow strength. This is the central
  unproven assumption and should be the first thing measured in playtest.
- **Deadfall's chain is a burst spike.** Three soft-capped Spike Traps plus a
  Deadfall is a large single-instant number. It requires the opponent to stand
  in a pre-built kill zone, so it is earned — but Cascade's per-rank multiplier
  on top is the most likely thing to need cutting.
- **Trap lifetime vs. match pace.** 12s dormant life is long. Traps left over
  from a previous engagement may read as noise rather than as planning. Lifetime
  is a cheap tuning lever if so.
- **Slow stacking.** `slowFactor` is a single field, last-writer-wins. The frost
  spec already flagged this against the ranger's freeze arrows; Caltrops makes
  it common enough to matter, since a freeze-arrow ranger standing in their own
  field has two slows fighting over one value. Resolve as
  `min(existing, incoming)` as part of this work.
- **`getSpellNodeMap` class inference.** The gladiator spec flagged that it
  infers class from skill nodes rather than reading `charClass` directly. Verify
  that fix actually landed before adding a third ranger tree on top of it.
- **Snapshot size.** Traps are small and capped at five, but Shrapnel at rank 3
  spawns five arrows per trigger and Daisy Chain can fire five traps at once —
  25 projectiles in one tick. Below Frozen Orb's worst case, but worth measuring
  alongside it.

## Testing

Mirrors the frost suite (Vitest, server workspace, `npm test`):

- **Gates.** `canUnlock` for every hunter node: prerequisites enforced, and each
  tier-2 and tier-5 node independently satisfying the relevant `requiresAny`.
- **Costs.** `totalSpentForRanks` matches the node table, including over-cap
  premiums.
- **Modifiers.** `buildRangerModifiers` returns expected values at ranks 0, 1,
  soft cap, and soft cap + 1 for all ten stackable hunter nodes.
- **Keystones.** `hasKeystone` true only past soft cap. Maimed respects the 6s
  per-target ICD and does not stack with the ranger's Deep Freeze or frost's
  Flash Freeze on the same target.
- **`Trap.ts` predicates.** Arming delay (a trap does not trigger before
  `armedAt`), owner immunity, trigger geometry at the radius boundary, one-shot
  despawn, cap eviction removing the oldest, expiry, and chain collection
  ordering — specifically that a trap set off by Deadfall cannot re-enter the
  chain and nothing fires twice.
- **Caltrops.** Circle containment, damage rate selected by `kind`, and that the
  ranger's rain modifiers do not leak onto it.
- **Snapshot.** A `traps` entry has its `ownerId` remapped by `remapPlayer` on
  reconnect.
- **Slow resolution.** Overlapping Caltrops and freeze-arrow slows resolve to the
  stronger, not the most recent.
