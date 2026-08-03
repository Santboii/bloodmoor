# Fire Talent Rework — Design

Approved 2026-08-02. Reworks the existing `fire` tree in place — no nodes
added, removed, or moved; the three spells (Fireball, Fire Wall, Meteor) and
all gates stay exactly as they are. This is the follow-up the ranger spec
parked: "mage stackables get no keystones in this pass. If the system lands
well, a follow-up spec covers the fire tree."
([2026-07-31-ranger-talent-improvements-design.md](2026-07-31-ranger-talent-improvements-design.md))

## Design intent

**Fire is the tree where physics misbehaves.** Fireballs bounce off pillars,
burst into homing embers, and loop back when they miss. Walls grow, rotate,
and supercharge your own projectiles that cross them. Meteors steer mid-fall
and shatter on landing. The tree rewards clever geometry and pillar play, and
it is deliberately the least tidy thing in the game.

This is chosen against two alternatives, recorded so they are not
re-litigated:

- **Burning — a stacking DoT the tree feeds and spends.** Rejected: it
  duplicates the ranger's existing burn mechanic, needs new fields on
  `PlayerState`, and reads as DPS bookkeeping in a duel that lasts seconds.
- **Ground control — fire owns the terrain.** Rejected: it is the same shape
  as Blizzard and Rain of Arrows, so fire would land as "more zones" next to
  frost's zones.

The contrast that matters is with frost
([2026-08-02-frost-talent-tree-design.md](2026-08-02-frost-talent-tree-design.md)),
which is tidy cold artillery: predictable zones, a chill rider, saturation.
Fire is the opposite temperament. Where the two trees would overlap, fire
yields — see Blind Strike below.

**Every node does something at rank 1.** The ranger pass put all behavior on
keystones and left base ranks as invisible math; that half-fixed the problem.
Here each stackable node has a behavior from its first rank and a keystone
past soft cap that escalates it.

## Constraint: node ids are persisted

`skill_unlocks.node_id` stores these strings, and `loadSkillsForCharacter`
(`server/src/skills/loadSkills.ts:32-34`) casts them straight back to `NodeId`.
Renaming an id orphans that node's ranks for every existing mage. **All
thirteen ids stay byte-identical.** Display names, descriptions, costs, soft
caps, and behavior change freely; two nodes get new names over unchanged ids
(`fire.pyroclasm` → "Ricochet", `fire.blind_strike` → "Guided Descent").

## Node table

### Fireball line

| id → name | Tier / cost / cap | Base behavior | Keystone |
|---|---|---|---|
| `fire.volatile_ember` → **Volatile Ember** | 2 / 1 / 5 | The fireball is unstable: its blast bursts into **homing embers**, +1 per rank. | **Chain Reaction** — an ember that hits bursts into 2 more, one generation deep. |
| `fire.seeking_flame` → **Seeking Flame** | 2 / 1 / 5 | Unchanged. Homing strength per rank; already a behavior. | **Hunter's Ember** — a fireball that would die against a wall instead curls around for one more pass. |
| `fire.hellfire` → **Hellfire** | 3 / 2 / 3 | Unchanged. Larger, slower, harder-hitting per rank. | **Rolling Doom** — too massive to stop: plows *through* players, damaging each, and detonates at end of flight. |
| `fire.pyroclasm` → **Ricochet** | 3 / 2 / 3 | **Fireballs bounce** off pillars and arena walls instead of detonating on them. +1 bounce per rank; each bounce adds **+12% damage**. | **Perpetual Flame** — unlimited bounces. Dies only on a player hit or at the hard lifetime ceiling. |

Splitting moves from Pyroclasm down to Volatile Ember, where "ember" already
means *small fire fragment* and it is a cheap tier-2 toy rather than a 2-point
tax. Children get `homing` instead of Pyroclasm's fixed ±0.4 rad spread; the
existing split machinery (`StateAdvancer.ts:577-594`, including the
`noHitUntil` grace that stops children re-detonating on the parent's target)
carries over unchanged.

Ricochet's `+12% damage` per bounce is the same momentum rider as the ranger's
Guided (`redirectCount`), applied at hit time and additive per bounce.

### Fire Wall line

| id → name | Tier / cost / cap | Base behavior | Keystone |
|---|---|---|---|
| `fire.enduring_flames` → **Enduring Flames** | 5 / 1 / 5 | +10% duration per rank, **and the wall burns hotter as it ages** — damage ramps linearly 25→55/s across its life. | **Eternal Pyre** — duration only ticks down while nobody is touching the wall. |
| `fire.searing_heat` → **Searing Heat** | 5 / 2 / 5 | +8% wall damage per rank, **and your own fireballs that cross your own wall ignite**: +25% damage and +50% blast radius for the rest of their flight. | **Blastfurnace** — a fireball crossing the wall also gains one free bounce and one free ember burst, whether or not you own those nodes. |
| `fire.inferno_expanse` → **Inferno Expanse** | 5 / 1 / 5 | +25% length and width per rank, **and the wall grows outward over its lifetime** from where it was drawn. | **Firestorm** — instead of growing straight, the wall **rotates** around its midpoint, sweeping the area. |

The ramping-damage rider on Enduring Flames rewards placing a wall ahead of
the fight rather than reactively, which pairs with the node's own duration
scaling instead of fighting it. Base damage today is a flat
`FIREWALL_DAMAGE_PER_TICK = 40/s` (`shared/src/types.ts:177`); the ramp
replaces it with 25→55/s, whose mean over a full-length wall is exactly 40/s,
so total damage is unchanged and only the shape differs.

Searing Heat's fireball-through-wall interaction is the piece to defend
hardest: a fire→fire combo is a shape neither frost nor the ranger has, and it
gives the wall a reason to exist in a build that is otherwise all projectiles.

### Meteor line

| id → name | Tier / cost / cap | Base behavior | Keystone |
|---|---|---|---|
| `fire.molten_impact` → **Molten Impact** | 7 / 2 / 3 *(now stackable)* | The impact **shatters**: 3 flaming chunks arc outward and land ~100u away as small AoEs, +1 chunk per rank. | **Ejecta** — chunks leave burning craters. |
| `fire.blind_strike` → **Guided Descent** | 7 / 2 / 3 *(now stackable)* | The meteor is **steerable mid-fall** — it lands where the caster's cursor is at strike time, clamped to a radius around the original target. Ranks widen that radius. | **Falling Star** — for the last 0.5s it steers itself toward the nearest enemy. |
| `fire.cataclysm` → **Cataclysm** | 7 / **2** / 3 | The meteor comes as a **shower**: +1 extra meteor per rank at scattered offsets, each at 60% radius and 50% damage. | **Extinction** — the shower falls in a converging spiral and the final impact is full-size. |

Both tier-7 nodes that were non-stackable become stackable, which is what
makes keystones reachable on them at all (`hasKeystone` requires
`stackable`, `skills.ts:203-207`).

**Cataclysm costs 2, up from 1.** At cost 1, "+1 full meteor per rank" would
be the cheapest damage multiplier in the game. The 60%/50% scaling on extra
meteors keeps it from being a straight multiplier even at the higher cost.

**Blind Strike's hidden-indicator effect is dropped, not moved.** Frost's
**Blinding Squall** keystone already claims that mechanic
([frost design](2026-08-02-frost-talent-tree-design.md), keystone table), and
two trees owning the same effect is the duplication this rework exists to
avoid. `MeteorState.hidden` and `MeteorModifiers.hidden` become dead and are
deleted; the client's visibility branch (`SpellRenderer.ts:398`) goes with
them.

### Count nodes bypass `effectAtRank`

Four of these nodes scale a **count** — bounces, embers, chunks, extra
meteors. `effectAtRank` applies `rank^0.7` diminishing returns, which is right
for percentages and wrong for small integers: today's Pyroclasm computes
`floor(effectAtRank(1, rank))`, giving **1, 1, 2** splits across its three
ranks. Rank 2 buys literally nothing for 2 points. That is a live bug in the
current tree, not a hypothetical, and every count node in this rework would
inherit it.

Count nodes therefore use explicit per-rank tables instead:

| Node | Rank 1 | 2 | 3 | 4 | 5 | Keystone |
|---|---|---|---|---|---|---|
| Ricochet (bounces) | 2 | 3 | 4 | — | — | unlimited |
| Volatile Ember (embers) | 2 | 3 | 4 | 5 | 6 | +2 per ember hit, one generation |
| Molten Impact (chunks) | 3 | 4 | 5 | — | — | chunks leave craters |
| Cataclysm (extra meteors) | 1 | 2 | 3 | — | — | converging spiral, final full-size |

Percentage nodes (Hellfire, Seeking Flame, the wall multipliers) keep
`effectAtRank` unchanged.

## Point economy

Reach cost for a keystone is `softCap × cost + (cost + 1)`, per `rankUpCost`.
Reaching any tier-7 node first costs 7 points of prerequisites: a tier-2 node
(1) + Fire Wall (2) + a tier-5 node (1) + Meteor (3), with Fireball free as
the class default node (`CLASS_DEFAULT_NODE`, `skills.ts:151-154`).

| Keystone | Node reach | Total with prereqs |
|---|---|---|
| Chain Reaction | 7 | 7 |
| Perpetual Flame | 9 | 9 |
| Hunter's Ember | 7 | 7 |
| Rolling Doom | 9 | 9 |
| Eternal Pyre / Firestorm | 7 | 10 |
| Blastfurnace | 13 | 16 |
| Ejecta / Falling Star / Extinction | 9 | 16 |

Tier-2 and tier-3 nodes gate on Fireball alone (`GATES`, `skills.ts:40-43`),
so their keystones carry no prerequisite cost at all.

At 1 point per level and a level-30 cap, a chaos build closes with room to
spare: Perpetual Flame (9) + Chain Reaction (7) + Fire Wall (2) + Searing Heat
2 ranks (4) + Seeking Flame 3 ranks (3) = 25, leaving 5 for Teleport and
Ethereal Form. Soft-capping the whole tree stays around 60 points, so
specialization is still forced by arithmetic rather than by gates.

Chain Reaction at 7 points is the cheapest keystone in the game — cheaper than
the ranger's rain keystones. That is intentional (it is a cheap tier-2 toy,
and fire's early game is otherwise the weakest in the roster), but it means
its power must be held down by damage scalars rather than by cost: embers deal
~20% of fireball damage, second-generation embers ~10%, with a hard cap on
total live embers per cast.

## Engine changes

### Shared

`Projectile` (`types.ts:63-84`) gains:

- `bounces?: number` — remaining bounce budget.
- `bounceCount?: number` — completed bounces, the +12% damage rider. Mirrors
  the existing `redirectCount`.
- `perpetual?: boolean` — Perpetual Flame.
- `wallEmpowered?: boolean` — one-shot Searing Heat flag, so a fireball
  overlapping a wall for several ticks empowers once rather than per tick.

`FireWallState` (`types.ts:86-94`) gains `spawnedAt: number`. Age is required
by all three tier-5 riders and is not derivable today — only `expiresAt` is
stored, and duration varies per caster. Firestorm additionally needs `origin:
Vec2`, `angle: number`, `angularVel: number`, and `halfLength: number` so
segments can be recomputed rather than transformed.

`MeteorState` (`types.ts:96-104`): `hidden` is deleted. Gains `origin: Vec2`
(steer clamp center), `steerRadius?: number`, and `chunks?: number`.

`SkillNode.keystone` already exists from the ranger pass — no type change
needed. Fire node descriptions, `stackable` configs, and the two display-name
changes all land in `SKILL_NODES` (`skills.ts:83-95`).

### Server

**`spells/Fireball.ts`.** `isFireballExpired` currently conflates
out-of-bounds and pillar-overlap into one boolean (`:70-78`). Bounce needs to
tell them apart and needs a surface normal, so this splits into
`isOutOfBounds(p)` and `pillarHitNormal(p, tick): Vec2 | null`. Both surfaces
are axis-aligned (`PILLARS` are AABBs, the arena is a box), so reflection is:
compute penetration depth on each axis, reflect the velocity component on the
dominant one, and push the projectile clear along that normal. Re-collision on
the following tick is prevented by the existing `noHitUntil` grace pattern,
which already exists for exactly this purpose with split children.

`isFireballExpired` stays as a thin wrapper over the two new predicates so
existing call sites and `fireball.test.ts` keep working.

**`spells/FireWall.ts`.** `buildWallSegments` is re-run each tick for growing
and rotating walls. Cost is 13 pillars × a handful of operations per wall per
tick — negligible, and it means pillar occlusion stays correct as the wall
moves, which a naive coordinate transform would break. `spawnFireCrater`
(`:97-113`) is reused for Ejecta chunk craters instead of the meteor crater it
serves today.

**`spells/Meteor.ts`.** Chunks spawn as short-delay, small-radius meteors on
detonation, so Molten Impact introduces no new entity type. The shower is N
meteors created at cast time with scattered target offsets. Steering mutates
`target` each tick toward the caster's live `aimTarget`, clamped to
`steerRadius` around `origin`.

**`skills/SpellModifiers.ts`.** Every fire branch is rewritten (`:46-88`).
Note that `buildSpellModifiers` takes `Map<string, number>`, not
`Map<NodeId, number>` — a typo'd node id compiles silently and returns zero.
The test below is the only guard.

**`gameloop/StateAdvancer.ts`.** Three regions: the fireball branch
(`:545-598`) for bounce, ember burst, Rolling Doom pass-through, and the
Searing Heat wall crossing; zone damage (`:602-635`) for the age ramp, growth,
rotation, and Eternal Pyre's conditional expiry; meteor detonation
(`:636-655`) for steering, shower, and chunks.

The wall-crossing test is a swept segment-segment intersection between the
projectile's previous and current position and each of the owner's own wall
segments. `LineOfSight.ts` has `segmentIntersectsAABB` but not segment-segment,
so that helper is new.

Keystone flags derive from merged ranks with no new plumbing:
`Room.effectiveSkillSets` (`Room.ts:85-89`) already merges item talent affixes
into tree ranks before `advanceState`, so an item-granted rank can complete a
fire keystone exactly as it can a ranger one.

### Client

`SpellRenderer.syncFireWalls` (`:284`) must be checked for an assumption that
a wall's geometry is static once spawned — Firestorm and the growth rider both
break that. `syncMeteors` (`:362`) loses the `hidden` visibility branch at
`:398`.

`NODE_ICONS` (`SkillTreeUI.ts:10`) is `Record<NodeId, string>` and will *not*
compile-error here, because no ids change. The icon swaps for Ricochet
(`fa-code-fork` → something bounce-flavored) and Guided Descent
(`fa-eye-slash` → a steering icon) are therefore silent and easy to forget.

Tooltips already render the gold "Supercharge:" keystone line from the ranger
pass, so fire keystones surface for free. The known gap recorded there still
applies: the tree UI computes `supercharged` from tree ranks only, so an
item-granted fire keystone shows in match behavior but not as a gold node.

## Risks

1. **Entity lifetime explosion.** Perpetual Flame is a bouncing AoE with no
   bounce budget, and Eternal Pyre is a wall that will not expire while
   contested. Both need hard ceilings — an absolute max lifetime on the
   fireball regardless of `perpetual`, and an absolute cap on how far Eternal
   Pyre can extend a wall — or the 60Hz full-state snapshots grow the way the
   frost spec worried about with orb shards. Set both ceilings before
   playtesting, not after.
2. **Chain Reaction is the cheapest keystone in the game.** Damage scalars and
   a hard live-ember cap are the controls, per the point-economy section. If it
   still dominates, the lever is the scalars first and the cost second.
3. **Guided Descent may be mandatory.** A steerable meteor is strictly better
   than the hidden indicator it replaces, and steering erodes the 1.5s
   telegraph that is currently Meteor's only counterplay. Steer radius is the
   tuning lever and should start deliberately small.
4. **Reconnect drops entity ownership.** `remapPlayer` (`Room.ts:180-275`)
   remaps `state.players` but not the `ownerId` on in-flight projectiles,
   walls, or meteors, so a reconnecting player's live entities lose their
   damage multipliers and friendly-fire exclusion. This is pre-existing, but
   this rework multiplies long-lived entities and makes it far likelier to
   surface. Fix it here rather than leaving it.
5. **Rotating walls and line-of-sight.** The fireball blast already respects
   line of sight (`StateAdvancer.ts:569-570`) and walls already split around
   pillars. A rotating wall sweeping into a pillar re-splits correctly because
   segments are rebuilt, but the visual and the damage volume must be verified
   to stay in sync as it moves.

## Testing

- **Count curves.** Each count node yields its exact table value at every
  rank, and specifically that no rank is a no-op — the regression that the
  current `floor(effectAtRank(1, rank))` Pyroclasm has today.
- **Costs.** `totalSpentForRanks` for every reworked node, including the
  Cataclysm cost change and the two nodes becoming stackable, asserted against
  the point-economy table so cost regressions are caught.
- **Modifiers.** `buildSpellModifiers` at ranks 0, 1, soft cap, and soft cap+1
  for all ten stackable fire nodes. Plus an explicit test that every node id
  the builder reads exists in `SKILL_NODES` — the only defense against the
  silent-typo failure mode described above.
- **Keystones.** `hasKeystone` true only past soft cap; merged item-affix
  ranks reach keystones; each keystone behavior triggers at `softCap + 1` and
  not at cap.
- **Bounce.** Reflection normal correct off each pillar face and each arena
  wall; bounce budget decrements; `bounceCount` damage rider applies at hit
  time; a bounced fireball does not re-collide with the surface it just left;
  Perpetual Flame respects the hard lifetime ceiling.
- **Embers.** Burst count scales with rank; embers home; Chain Reaction stops
  at one generation and respects the live-ember cap.
- **Wall riders.** Damage ramps 30→60/s across life and averages to today's
  40/s; growth and rotation rebuild segments with pillar occlusion intact;
  Eternal Pyre extends only while contested and stops at its ceiling.
- **Searing Heat crossing.** A fireball crossing the owner's own wall empowers
  exactly once, not per overlapping tick; it does not empower off an enemy's
  wall.
- **Meteor.** Steering clamps to `steerRadius` around `origin`; target freezes
  when the caster dies or input goes stale; shower spawns N meteors at the
  scaled radius and damage; chunks land as AoEs and, with Ejecta, leave
  craters.
- **Existing suites to update.** `fireball.test.ts`, `firewall.test.ts`,
  `meteor.test.ts`, `skills.test.ts`, `stateadvancer.test.ts`, and anything
  asserting `SKILL_NODES` descriptions or the deleted `hidden` field.
