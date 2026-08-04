# Ice Ray — Design

Approved 2026-08-02. Adds a fourth frost spell: a hold-to-channel beam whose
damage, mana drain, and width all ramp the longer it is held. Extends the
frost tree from thirteen nodes to fourteen.

Depends on the frost talent tree
([2026-08-02-frost-talent-tree-design.md](2026-08-02-frost-talent-tree-design.md)),
which must be merged first.

## Motivation

Frost currently has three spells that all resolve instantly: a projectile, a
zone, and a capstone that sprays projectiles. Nothing in the tree — or in the
game — rewards sustained commitment. Ice Ray is the first ability where the
player trades position for escalating output, and it gives frost an early
identity beyond "the other bolt."

It is also the first **channelled** ability in the game, which is most of the
work. See "Channel architecture" below.

## Design intent

The ramp is a decision, not a flourish. Two seconds to full power is long
enough that an opponent can see the beam, close distance, or break line of
sight, and short enough to pay off inside one engagement. Movement drops to
35% for the whole channel, so committing costs you the kiting the rest of the
game is built on.

Three rejected alternatives, recorded so they are not re-litigated:

- **Rooted while channelling.** Rejected: a self-imposed root in a 60-tick
  duel game is punished brutally by Meteor and Rain of Arrows, and it edges
  toward the hard CC this tree deliberately avoids.
- **Free movement.** Rejected: sustained ramping damage with no positional
  cost would be the strongest spell in the kit, and the only fix is tuning
  damage so low the ramp stops mattering.
- **Movement penalty that worsens as it ramps.** Rejected: two variables
  moving at once makes the commitment hard to read mid-fight. A flat 35% is
  legible.

## Channel architecture

**This is the part with no precedent in the codebase.** Every existing spell
is a discrete cast: `InputHandler` queues one `pendingCast` on mouse-up, and
`Room.tick()` clears `castSpell` on every pending input afterwards
(`server/src/rooms/Room.ts:145-148`) so that one keypress produces exactly one
cast. A channel is the opposite — a sustained signal.

**`InputFrame` gains `channel: SpellId | null`**, sent every tick the button
is held. It must be **exempt from the clearing in `Room.tick()`**. That
asymmetry is the entire mechanic and is the likeliest place for a silent bug:
if `channel` gets cleared like `castSpell`, the beam fires for one tick per
network frame and the ramp never climbs.

**State lives on the caster, not in a new entity array.** `PlayerState` gains:

| Field | Meaning |
|---|---|
| `channelSpell?: SpellId` | which channel is active, if any |
| `channelTicks?: number` | ticks held; drives the ramp |
| `channelEnd?: Vec2` | server-computed beam terminus, for rendering |

This is deliberate. Frozen Orb needed a new `GameState` array and therefore
threading through `makeInitialState`, the tick-local copies, the return
literal, and `Room.remapPlayer`. Ice Ray needs none of those: the players map
is already remapped by socket key, so a reconnecting player's channel state
survives for free.

**The channel path needs its own ownership gate.** It bypasses the cast
dispatch entirely, so it does not inherit the check at
`StateAdvancer.ts:250`. Mirror that check on the channel branch, or an
unowned Ice Ray is castable.

## Beam resolution

Hitscan, re-evaluated every tick:

1. Direction from the caster's position toward `input.aimTarget`.
2. March out to `ICE_RAY_MAX_RANGE` in fixed steps (8 units is fine — half a
   pillar's half-size, so no pillar can be stepped over), testing each sample
   with `pillarContainsPoint`. The first sample inside a pillar ends the beam;
   otherwise it ends at max range, clamped to the arena. The stop point is
   `channelEnd`.
3. Every enemy whose distance to the segment `[position, channelEnd]` is under
   `PLAYER_HALF_SIZE + halfWidth` takes that tick's damage.

The beam **pierces** — it damages everyone in the band rather than stopping at
the first body. Combined with the widening band, that makes a fully-ramped ray
a genuine multi-target threat in 2v2 and FFA.

`pointToSegmentDist` already exists as a private helper in
`server/src/spells/FireWall.ts:127`. Lift it into `shared/src/physics.ts`
rather than reimplementing it; Fire Wall keeps using it unchanged.

Chill applies on hit, gated on `!sameTeam` exactly like every other frost
effect. Teammates caught in the beam take the reduced damage but no chill.

## The ramp

`channelTicks` climbs from 0 to `ICE_RAY_RAMP_TICKS` and then holds. All three
ramped values interpolate linearly on `min(channelTicks / RAMP_TICKS, 1)`.

| | Start | Full (2s) |
|---|---|---|
| Damage | 45 /s | 130 /s |
| Mana drain | 18 /s | 55 /s |
| Half-width | 6 units | 20 units |
| Move speed | ×0.35 | ×0.35 (flat) |

Constants, in `shared/src/types.ts`:

```ts
export const ICE_RAY_MAX_RANGE = 700;
export const ICE_RAY_RAMP_TICKS = 2 * TICK_RATE;        // 120
export const ICE_RAY_DAMAGE_MIN_PER_SEC = 45;
export const ICE_RAY_DAMAGE_MAX_PER_SEC = 130;
export const ICE_RAY_MANA_MIN_PER_SEC = 18;
export const ICE_RAY_MANA_MAX_PER_SEC = 55;
export const ICE_RAY_HALF_WIDTH_MIN = 6;
export const ICE_RAY_HALF_WIDTH_MAX = 20;
export const ICE_RAY_MOVE_MULT = 0.35;
```

Per-tick values are the per-second figures divided by `TICK_RATE`.

**Ending the channel.** Releasing the button, or mana reaching zero, clears
`channelSpell` and resets `channelTicks` to 0. No decay and no persistence —
re-tapping starts from the bottom. That is self-punishing enough that no
cooldown is needed.

For scale: Fire Wall is 40 dmg/s, Blizzard 45 dmg/s, Meteor 200–280 burst on a
5s cooldown. At full ramp the ray outpaces mana regen (18/s) by about 37/s, so
a full 500 pool sustains roughly 13 seconds of max-power beam.

**These numbers are a starting point and need playtesting.** The damage
ceiling and the movement multiplier are the two tuning levers, in that order.

## The node

`frost.ice_ray`, tier 2, cost 2, `isSpell: true`, gated on `frost.ice_bolt`.
Spell id **12**. Not stackable, no keystone — it sits beside Bitter Chill and
Ice Lance as a third tier-2 option.

It also becomes a valid tier-2 prerequisite for Blizzard, so `frost.blizzard`'s
`requiresAny` gains `frost.ice_ray`. That makes it a real alternative path
rather than a detour.

The tree grows from 13 nodes to 14, and the full-tree budget from 67 points to
69. Ice Ray scales off Cold Mastery and the existing chill rather than getting
its own modifier nodes — a deliberate scope choice.

**The mage reaches eight spells for six hotbar slots.** The snapshot-
authoritative hotbar already handles this: newly unlocked spells fall to the
lowest empty slot, and with none free the spell stays unslotted until the
player benches something from the slot bar. No hotbar changes are needed.

## Wire and client

`shared/src/types.ts` — widen `SpellId` to include 12; add a `SPELL_CONFIG`
entry. Its `manaCost` and `cooldownTicks` are **both 0**: the per-tick drain is
the cost and the ramp reset is the limiter. The entry exists only because
`SPELL_CONFIG` is exhaustive over `SpellId`. A zero cooldown means the HUD slot
never sweeps and never greys out, which is correct for a channel.

`server/src/index.ts:48` validates `castSpell <= 11` and must become `<= 12`.
It must also **validate and pass through the new `channel` field** — the
handler rebuilds the frame from a fixed set of keys, so an unlisted field is
silently dropped and the beam would never fire.

`InputHandler` sends `channel` while the left button is held **and the active
slot holds spell 12**, and null otherwise. This is a second input path
alongside `pendingCast`; casting other spells must be unaffected.

**Mouse-up must not also queue a normal cast when the active spell is a
channel.** `onMouseUp` currently sets `pendingCast` unconditionally. Left as
is, releasing the ray would fire a discrete spell-12 cast through the ordinary
dispatch on top of ending the channel — a phantom extra hit and a second mana
charge. The channel branch must return early instead.

**No client prediction.** Teleport is the only predicted spell
(`main.ts:803-816`); the beam renders from server snapshots. That costs one
round trip before the beam appears, which is acceptable for a sustained effect
and avoids rubber-banding a damage source.

Rendering: a beam quad from the caster to `channelEnd`, cyan, with width and
opacity both driven by the ramp so it visibly thickens and brightens.
`CAST_SAMPLE` needs an entry for 12; no cold sample exists in the bank, so
reuse the closest and note it as a follow-up.

## Testing

- **Ramp math** as a pure function: damage, mana, and width at tick 0, at half
  ramp, at full ramp, and well past full ramp (must clamp, not keep climbing).
- **The clearing asymmetry:** an input with `channel` set, replayed across
  several ticks through `Room.tick()`, must leave `channelTicks` climbing.
  This is the test that catches the highest-risk bug in the design.
- **Ownership:** a mage without `frost.ice_ray` channelling spell 12 takes no
  mana and deals no damage.
- **Beam geometry:** a target directly in line takes damage; a target beyond a
  pillar does not; a target just outside the band does not, and does once the
  ramp widens the band enough to reach it.
- **Piercing:** two enemies in line both take damage on the same tick.
- **Friendly fire:** a teammate in the beam takes reduced damage and no chill.
- **Termination:** releasing resets `channelTicks` to 0; running out of mana
  ends the channel rather than dealing free damage.
- **Movement:** a channelling player moves at 35% speed and returns to full
  the tick after release.
- **No phantom cast on release:** ending a channel must not also queue a
  discrete spell-12 cast. Assert that releasing produces no extra damage tick
  and no second mana charge.

## Risks

- **The clearing asymmetry** in `Room.tick()` is the single highest-risk
  detail. If `channel` is cleared alongside `castSpell`, everything still
  compiles, the beam still appears, and the ramp silently never climbs past
  its first tick.
- **Sustained-damage balance.** 130/s is above anything else in the game; the
  35% movement penalty is the only thing holding it in check, and that trade
  is unproven.
- **Snapshot cost is negligible** — three small fields on one player, versus
  Frozen Orb's 40 projectiles. This is the cheap spell to broadcast.
