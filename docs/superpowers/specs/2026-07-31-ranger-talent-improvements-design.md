# Ranger Talent Improvements — Design

Approved 2026-07-31. Improves the existing ranger trees (`archer`,
`archer_utility`) in place — no nodes added, removed, or moved; the four
spells and all gates stay as they are. Four workstreams: supercharge
keystones, dead-value fixes, element rework, and the supporting cleanup.

## Motivation

- Of the 12 non-spell ranger nodes, 8 are invisible "+X% per rank" math.
  The mage tree got the behavior-changers (Pyroclasm, Blind Strike,
  Phantom Step); the ranger's only two are Combat Roll and Shadowstep.
- Supercharging (ranks past `softCap`) is strictly bad value: each
  over-cap rank costs +1 extra (`rankUpCost`) and yields *less* effect
  (`effectAtRank`, rank^0.7). The gold UI treatment is a trap.
- Several talent values are imperceptible or vestigial (details below).

## 1. Supercharge keystones

The first over-cap rank (merged effective rank ≥ `softCap + 1` — the same
condition that triggers the gold treatment in `SkillTreeUI`) unlocks a named
**keystone** behavior on that talent. The diminishing numeric curve is
unchanged; the over-cap premium buys a mechanic, not numbers.

Keystones key off the **merged** tree + item-affix ranks (the map passed to
`buildRangerModifiers`), so an item talent grant can push a capped talent
into its keystone. This is deliberate — gear can complete a build.

| Talent (soft cap) | Keystone | Effect |
|---|---|---|
| Guided (4) | **Relentless** | Redirects repeat until the arrow hits a player, pillar, or wall (no redirect budget). |
| Homing (3) | **Predator** | Each redirect leads the target: aim at `enemyPos + enemyVel × (dist / arrowSpeed)` instead of current position. |
| Barrage (5) | **Echo Volley** | 0.25s (15 ticks) after a Multi-shot cast, a second volley fires from the caster's current position at the same world-space angles, 35% damage. No extra mana or cooldown. |
| Sustained Rain (5) | **Stormcall** | The rain zone drifts toward the nearest living enemy at 60 u/s while active. |
| Piercing Rain (3) | **Exposed** | Enemies inside the caster's rain zone take +15% damage from all of that caster's sources (arrows, zone ticks, echo volleys). |
| Wide Rain (5) | **Twin Storm** | Casting Rain of Arrows also marks a second zone, 0.5× radius, centered on the nearest enemy's position at cast time. Same delay and duration; damage does not stack with the primary zone on overlap. |
| Burn (3, after §3) | **Ignite** | An arrow hitting a target that is already burning consumes the burn: +40 burst damage, burn ends. (The same hit re-applies a fresh burn afterward, so the loop is hit → burn → hit → burst.) |
| Freeze (3, after §3) | **Deep Freeze** | The first freeze applied to a target roots (move speed 0) for 0.4s. Per-target 6s internal cooldown before another root can occur. Slow applies as normal during and after. |
| Poison (3, after §3) | **Withering Venom** | Poison additionally drains 10 flat mana/s for its duration, on top of the regen reduction. Mana floors at 0. |
| Acrobatics (3) | **Second Wind** | Evade holds 2 charges. Each charge refills on the (Acrobatics-reduced) cooldown; casting consumes one and does not reset an in-flight refill. |

Combat Roll, Shadowstep, and Ethereal-style unlock nodes are not stackable
and get no keystones.

### Keystone costs (why the budget works)

Reaching a keystone costs `softCap × cost + (cost + 1)`:
Barrage 13, Acrobatics 13, elements 13 (after §3's cap change), Guided 11,
Homing 9 (requires Guided ≥1 first), rain talents 7–9. With the level-30 /
~30-point cap, a build fits **two of the expensive keystones plus support** —
e.g. Echo Volley (Multi-shot 2 + Barrage 13) + Predator (Guided 2 + Homing 9)
+ Evade 1 + Combat Roll 2 = 29 points. An element keystone plus Second Wind
is 32+ with prerequisites and only closes with item-granted talent ranks.

**Correction (verified post-implementation).** An earlier draft claimed three
keystones never fit. That is wrong: the three rain keystones are the cheapest
(7/9/7) *and* share one prerequisite chain, so Stormcall + Exposed + Twin
Storm closes at exactly **34 points** — a complete, gearless level-30 build.
Measured, it underperforms badly (a fleeing target takes 0 damage: 0.75s
telegraph and 60 u/s zone drift against 200 u/s player speed; the
stationary-target ceiling is ~573 over 6.7s), so this is a break in the
intended cost tension rather than a power outlier. Re-costing the rain
talents is the open lever if that tension matters.

## 2. Dead-value fixes

- **Homing** (`baseEffect` 2 → **6**): today `floor(effectAtRank(2, rank))`
  shaves 2–4 ticks off the 30-tick redirect delay — 0.03–0.07s for 2
  points/rank, imperceptible. At 6: rank 1 ≈ 6 ticks (0.1s), rank 3 ≈ 13
  ticks. The existing 10-tick floor in `spawnArrow` still bounds it.
- **Sustained Rain** (`baseEffect` 0.15 → **0.35**): rank 1 currently adds
  +0.45s to a 3s zone while reading like an unlock. At 0.35: rank 1 +1.05s,
  cap ≈ +3.2s.
- **Rain zone damage** (`RAIN_DAMAGE_PER_TICK` 30/s → **45/s**): 80 mana +
  4s cooldown currently buys at most ~90 damage if the enemy stands in it
  voluntarily. 45/s (max ~135 base) makes leaving mandatory, which is what
  makes Stormcall/Exposed/Twin Storm interesting.
- **Guided momentum** (new rider on the existing node): each completed
  redirect adds +5% arrow damage, so ranks pay off even when the extra
  redirect wasn't needed. Additive per redirect (+5%, +10%, +15%…),
  applied at hit time.

## 3. Element rework

- **Rain applies the element.** Elements currently apply only on arrow
  hits (`StateAdvancer` projectile branch); the rain zone applies nothing.
  Zone damage ticks now also apply/refresh the caster's element status
  (slow-in-zone for Freeze, DoT refresh for Burn/Poison), using the same
  friendly-fire exclusion as arrows.
- **Cheaper element depth**: soft caps 5 → **3**, per-rank effects
  rebalanced so cap value is preserved (old `effectAtRank(x, 5)` ≈ new
  `effectAtRank(x', 3)`):
  - Burn `baseEffect` 8 → **12** (cap ≈ +26 dps on the 10 base)
  - Freeze `baseEffect` 0.06 → **0.09** (cap ≈ +19.5% on the 30% base)
  - Poison dps `baseEffect` 5 → **7**; the mana-regen term 0.05 → **0.07**
  - Keystone (rank 4) cost drops from 19 points to 13.
- Mutual exclusivity and the burn > freeze > poison tiebreak in
  `deriveElement` are unchanged.

## 4. Cleanup and touch points

- Delete the vestigial `sustained`/`piercing` booleans threaded through
  `RainOfArrowsState` / `RainConfig` / `RangerSpellModifiers.rain`, and the
  unused `rainDamage()` in `RainOfArrows.ts`. `durationMultiplier` /
  `damageMultiplier` / `radiusMultiplier` are the real levers and stay.
- **Shared** (`shared/src/skills.ts`): `stackable` value changes (§2, §3),
  a `keystone?: { name: string; description: string }` field on
  `SkillNode`, updated node descriptions.
- **Server**: `RangerModifiers.ts` grows keystone flags derived from merged
  ranks; `Arrow.ts` (Relentless, Predator lead, momentum), `StateAdvancer`
  (echo volley scheduling, zone drift, Exposed multiplier, Twin Storm
  spawn, Ignite/Deep Freeze/Withering Venom in the status paths, evade
  charges), `RainOfArrows.ts` (second zone spawn, cleanup). Predator needs
  per-player velocity, derivable from position deltas already in state.
- **Client**: `SkillTreeUI` tooltip gains a gold keystone line ("Supercharge:
  …") on stackable nodes; the gold node treatment is unchanged. HUD: evade
  charge pips when Second Wind is active. Known gap, accepted: the skill
  tree UI computes `supercharged` from tree ranks only, so an item-granted
  keystone shows in match behavior and the gear screen but not as a gold
  tree node — follow-up, not in scope.
- **Mage parity**: mage stackables get no keystones in this pass. If the
  system lands well, a follow-up spec covers the fire tree.

## Testing

- Unit (Vitest, server): one test per keystone behavior (trigger at
  `softCap + 1` merged rank, not at cap; item-affix ranks count), the §2
  value changes asserted through `buildRangerModifiers`, element
  application from zone ticks, Deep Freeze per-target cooldown, Echo
  Volley damage/timing, Second Wind charge accounting.
- Existing suites to update: `ranger-modifiers.test.ts`,
  `ranger-combat.test.ts`, `elemental-effects.test.ts` (element cap/value
  changes), plus any snapshot of `SKILL_NODES` descriptions.
- Balance smoke: assert keystone reach costs (13/13/13/11/9) via
  `totalSpentForRanks` so cost regressions are caught.
