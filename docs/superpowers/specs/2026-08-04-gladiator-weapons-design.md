# Gladiator Weapons & Uniques — Design

Approved 2026-08-04. Adds three new gladiator weapon bases (including the
first level-4 weapon in the game) and the gladiator's first four unique
items — one per item-level band, each an archetype the arms/bulwark trees
already support. Extends the catalog in `shared/src/items.ts`; no new engine
mechanics are required. Every payoff below already functions: item talent
ranks merge into tree ranks at match start, the cast gate only checks node
presence (so a talent affix on a spell node grants that spell outright), and
keystones fire on the merged rank.

## Design intent

Same language as the 2026-08-02 uniques set: a unique is **one axis above
rare and one axis below it**. Each of the four items is a distinct build
("archetype ladder") rather than four grades of the same damage stick:

- **L1** — stun-thrower starter (spell grant, mirroring Threefold Draw)
- **L4** — leaper (spell grant one progression stage early)
- **L7** — executioner (keystone-forcer for arms — Executioner's Thrust)
- **L10** — riposte fortress (keystone-forcer for bulwark — Riposte)

Both gladiator keystones become item-reachable, and neither can be tripped
by the item alone — a max roll (+3) still needs 3 invested tree ranks to
pass either soft cap of 5. Same posture as Quiverfrost.

All four uniques sit on gladiator-restricted weapon bases, so off-class
inertness costs nothing and no dual-node (Hunter's-Eye-style) design is
needed.

## New weapon bases

Three recolored spear sheets, vendored from upstream via
`scripts/vendor-lpc.mjs` (upstream ships 12 spear colors in the same 64px
walk/thrust/hurt layout already supported; we use `dark`, `bronze`,
`silver`). All are `classRestriction: 'gladiator'`, icon `fa-location-arrow`,
`nativeAnims: ['thrust']`, and the same background/foreground layer structure
as the existing spears.

Today every weapon in the game carries a `damage_pct` implicit. Two of the
three new bases deliberately break that so base choice is a decision:

| Base | id | Band | Sheet | Implicit | Identity |
|---|---|---|---|---|---|
| Boar Spear | `boar_spear` | 1 | `dark` | `+20 max_health` | Tanky starter alternative to Iron Spear |
| Bronze Spear | `bronze_spear` | 4 | `bronze` | `+4 damage_pct` | Fills the empty L4 weapon band; continues the 2/·/6/9 curve |
| Serpent Pike | `serpent_pike` | 7 | `silver` | `+4 cast_speed_pct` | Speed spear — faster cadence instead of War Spear's +6 damage |

Distinct silhouettes (trident, longspear, dragonspear, halberd) were
rejected: upstream only ships them as oversize sheets (`walk_128`,
`thrust_oversize`) that the compositor's dimension gate cannot consume —
the same limitation that leaves bows without walk art. Recolors are zero
renderer risk.

## The uniques

House rules apply: authored roll ranges with `max` always the lucky end;
`levelReq` equals the base's band; `lpcTint` + aura for identity.

### Level 1 — Crowd-Pleaser (`crowd_pleaser` on `iron_spear`)

*"The crowd knows what it came for."*

Grants Spear Throw — a tier-2, 2-point spell — at level 1. The mana cut
makes each throw a commitment rather than a freebie (the Threefold Draw
pattern).

| Affix | Roll |
|---|---|
| `talent arms.spear_throw` | +1 (fixed) |
| `cast_speed_pct` | +2 – +4 |
| `max_mana` | −30 → −16 |

Tint `#d9b96a` (arena gold). Aura: `orbit`, color `[0.9, 0.78, 0.45]`,
anchor chest, intensity 0.6, 1 mote.

### Level 4 — The Short Road (`the_short_road` on `bronze_spear`)

*"Between you and them: a straight line, and the sky."*

Grants Leap (tier-4, 2-point) a full progression stage early, with Crushing
Landing synergy. The move-speed drawback is the thesis: you leap because you
no longer run.

| Affix | Roll |
|---|---|
| `talent arms.leap` | +1 (fixed) |
| `talent arms.crushing_landing` | +1 – +2 |
| `move_speed_pct` | −5 → −3 |

Tint `#a9744a` (scorched bronze). Aura: `wisp`, color `[0.75, 0.6, 0.4]`,
anchor feet, intensity 0.8.

### Level 7 — Headsman's Reach (`headsmans_reach` on `war_spear`)

*"It asks once."*

The executioner. A max roll (+3) plus 3 invested Heavy Thrust ranks passes
the soft cap of 5 and unlocks **Executioner's Thrust** (+50% Jab damage vs
stunned/slowed) — rewarding a tree that already bought Spear Throw stuns or
Leap slows. The mana cut pushes the build toward jab-range brutality.

| Affix | Roll |
|---|---|
| `talent arms.heavy_thrust` | +1 – +3 |
| `damage_pct` | +6 – +11 |
| `max_mana` | −120 → −75 |

Tint `#8a2f2f` (dried blood). Aura: `drip`, color `[0.6, 0.15, 0.1]`,
anchor chest, intensity 0.8.

### Level 10 — The Patient Wall (`the_patient_wall` on `champion_spear`)

*"It has never struck first."*

The riposte fortress. A max roll (+3) plus 3 invested Bracing ranks passes
the cap of 5 and unlocks **Riposte** (blocked hits charge a free stunning
Jab). Mobile Guard ranks let the wall advance while blocking. It hits
softer — the keystone's free Jabs are the damage.

| Affix | Roll |
|---|---|
| `talent bulwark.bracing` | +1 – +3 |
| `talent bulwark.mobile_guard` | +1 – +2 |
| `max_health` | +90 – +130 |
| `damage_pct` | −12 → −6 |

Tint `#8d98a8` (cold steel). Aura: `orbit`, color `[0.7, 0.75, 0.85]`,
anchor chest, intensity 0.7, 2 motes.

## Balance guardrails

- **Stat floors hold with no new clamps.** Worst-case mana stacking
  (Headsman's Reach −120 plus existing drawback gear) is caught by
  `STAT_FLOORS.maxMana: 50`; The Patient Wall's damage cut bottoms out
  around 0.88× before other gear, nowhere near a degenerate zero.
- **No item trips a keystone alone** — both forcers require 3 invested
  ranks at max roll.
- **Drop-pool skew, accepted:** the new bases raise gladiator's share of
  band drops (L1: 7→8 bases, L4: 2→3, L7: 7→8), and `bronze_spear` is the
  first class-restricted item in band 4 — a sellable-but-dead drop for
  mage/ranger accounts. The vendor already badges cross-class stock.

### Parked follow-ups (out of scope)

- L4 weapons for mage and ranger, to close the same band gap and rebalance
  the band-4 pool.
- `CLASS_TREES` in `shared/src/items.ts` omits `frost` for mage — frost
  talent affixes on items are currently inert for mages and never favored
  by `pickTalentNode`. Pre-existing gap from the frost merge; fix
  separately.

## Testing

Mirror the existing suites in `server/tests/items.test.ts` and
`items-combat.test.ts`:

- **Manifest invariants** for new entries: unique `baseId`s exist and are
  gladiator-restricted; `min ≤ max` on every range; `levelReq` matches the
  base band; aura/tint shapes valid; new base ids unique and band-correct.
- **Roll math:** `rollUnique` determinism from a seeded rng; `rollQuality`
  correctly averages The Patient Wall's two rolling talent affixes.
- **Loadout:** spear_throw/leap grants appear in `talentRanks` for a
  gladiator; drawback floors clamp as expected.
- **Keystone-forcing:** 3 invested Bracing ranks + max-roll Patient Wall =
  merged rank 6 > soft cap 5 (Quiverfrost-style assertion); same for Heavy
  Thrust with Headsman's Reach.
- **Assets:** vendor the three new spear colors, then run
  `derive-weapon-anchors.mjs` and `render-weapon-contact-sheet.mjs` to
  confirm the recolors align with the existing spear anchors.
