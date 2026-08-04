# Gladiator Expansion — Design

**Date:** 2026-08-04
**Status:** Approved
**Builds on:** `2026-08-03-gladiator-class-design.md` (shipped at `40eca35`; final spell ids 13–16)

## Summary

Four new castable spells (ids **17–20**), Arms deepened 6→11 nodes, Bulwark 4→9, and keystones on every stackable (2→12 total) — bringing the gladiator to frost/ranger build depth. The gladiator ends with 8 spells competing for 6 hotbar slots, matching the mage; the snapshot-authoritative slot system handles benching unchanged.

**CC stance:** the kit already has a stun (Spear Throw), a slow (Leap), and now a pull (Harpoon). No new talent adds hard CC beyond the one earned exception (Bloodsong). The pull is displacement, not a stun.

## New spells

### War Cry — spell 17, Bulwark tier 3

- AoE pulse centered on the gladiator, radius 150u.
- Enemies: ~40 damage + 25% slow for 1.5s. Allies (team modes): +15% move speed for 2s. Never harms teammates; never buffs enemies.
- 50 mana, 12s cooldown (720 ticks).
- A pulse has no incoming direction → **Block does not mitigate it** (zones/meteors rule).

### Harpoon — spell 18, Arms tier 6

- Skillshot projectile: speed ~450 u/s (dodgeable), ~80 damage, 60 mana, 10s cooldown (600 ticks). New `ProjectileType: 'harpoon'`.
- On hit: the victim is **dragged to just outside melee range** of the gladiator over ~0.35s (21 ticks) — a forced dash on the victim using the §0 dash interpolator with a per-tick target tracking the gladiator's live position, clamped by pillars/arena exactly like any dash.
- During the drag the victim cannot steer but **can cast** (displacement, not stun).
- Blocked: damage reduced, pull still lands (mirrors spear-stun-through-block). Teammates: never pulled (FF rule), reduced damage only.
- **Reflected: the harpoon flips owner and drags the gladiator to the reflector.** Deliberate.
- One harpoon in flight per caster (recast gated by cooldown; no charges).

### Kick Up Dust — spell 19, Bulwark tier 4

- Self-centered concealment cloud: radius 120u, duration 2.5s. 40 mana, 14s cooldown (840 ticks). New `ZoneKind: 'dust'` on the shared zone state.
- **Concealment rule:** a player inside the cloud is invisible (sprite, nameplate, minimap, homing/auto-target acquisition) to every player *outside* the cloud. Players inside see each other normally. The caster gets no special treatment — an enemy who steps in sees them.
- Implementation: the per-recipient snapshot filter in `server/index.ts` (Blinding Squall's mechanism) plus the existing `invisibleUntil`-style exclusions at homing/auto-target sites, driven by zone membership instead of a timer field.

### Spear Flurry — spell 20, Arms tier 5

- Committed burst: one cast starts a ~1s state — **5 cone hits**, one every 12 ticks, cone 90° × 100u, re-aimed at the caster's live cursor per hit. Each hit rolls 30–45 damage (independent rolls, modifiers apply per hit).
- During the burst: move speed ×0.5; casting and Block locked out; a stun cancels the remaining hits; death cancels.
- State fields on `PlayerState`: `flurryUntil`, `flurryNextHitAt` (absolute ticks, §0.5 expiry conventions).
- Each hit is directional → `mitigateDamage` per hit; a blocking target banks Riposte stacks per blocked hit (intended counterplay — flurrying a shield arms the counter).
- 55 mana, 8s cooldown (480 ticks).

## Arms tree (11 nodes)

Existing: Jab (t1, starter) → Heavy Thrust / Spear Throw (t2) → Stunning Blow (t3) → Leap (t4) → Crushing Landing (t5). New/changed:

| Node | Tier | Kind | Effect | Keystone (past soft cap) |
|---|---|---|---|---|
| `arms.serrated_edge` | 3 | stackable 3 | Spear Throw applies a bleed DoT (base ~8 dps for 3s, stronger per rank; mirrors burn fields with attacker mult baked in) | **Hemorrhage**: targets moving above 70% of base speed take the bleed 50% faster |
| `arms.spear_flurry` | 5 | spell (cost 2) | unlocks Spear Flurry | — |
| `arms.extended_flurry` | 6 | stackable 3 | +1 flurry hit per rank (count table `[1,2,3]`, `FIRE_COUNT_RANKS` pattern) | **Bloodsong**: landing every hit of one flurry on the same target stuns them 0.5s |
| `arms.harpoon` | 6 | spell (cost 3) | unlocks Harpoon | — |
| `arms.quick_reel` | 7 | stackable 3 | Harpoon cooldown reduced per rank | **Skewer**: if the dragged victim ends within Jab range, the next Jab within 2s deals double damage |
| `arms.stunning_blow` | (existing) | +keystone | — | **Concussion**: targets stunned by you take +15% damage from you while stunned |
| `arms.crushing_landing` | (existing) | +keystone | — | **Seismic Slam**: Leap's landing also deals 60 damage inside the slow radius |

Gates: `serrated_edge` requires `spear_throw`; `spear_flurry` requires `leap`; `extended_flurry` requires `spear_flurry`; `harpoon` requires any of [`spear_flurry`, `serrated_edge`]; `quick_reel` requires `harpoon`.

## Bulwark tree (9 nodes)

Existing: Bracing (t1) → Mobile Guard / Reflect (t2) → Perfect Guard (t3). New/changed:

| Node | Tier | Kind | Effect | Keystone |
|---|---|---|---|---|
| `bulwark.war_cry` | 3 | spell (cost 2) | unlocks War Cry | — |
| `bulwark.intimidating_presence` | 4 | stackable 3 | stronger + longer War Cry slow per rank | **Rallying Roar**: War Cry also grants you (and allies) +10% damage for 3s |
| `bulwark.kick_up_dust` | 4 | spell (cost 2) | unlocks Kick Up Dust | — |
| `bulwark.sandstorm` | 5 | stackable 3 | +dust radius and duration per rank | **Vanish**: leaving your own dust cloud grants 0.5s invisibility (`invisibleUntil`) |
| `bulwark.iron_skin` | 5 | stackable 3 | +flat max HP per rank (~25/rank before diminishing) | **Juggernaut**: below 30% HP, Block's damage reduction +15% (still capped ≤ 0.85 total) |
| `bulwark.mobile_guard` | (existing) | +keystone | — | **Unstoppable Guard**: immune to slows while blocking (not stuns/roots) |
| `bulwark.perfect_guard` | (existing) | +keystone | — | **Mirror Guard**: projectiles you reflect deal +50% damage |

Gates: `war_cry` requires `bracing`; `intimidating_presence` requires `war_cry`; `kick_up_dust` requires any of [`war_cry`, `reflect`]; `sandstorm` requires `kick_up_dust`; `iron_skin` requires any of [`mobile_guard`, `perfect_guard`].

## Systems inventory

**Genuinely new:** victim forced-drag (dash interpolator, moving target), committed burst state, concealment zone membership (per-recipient filter reuse), AoE pulse, bleed DoT (burn-field pattern), max-HP modifier from talents (new `gladMods` hook into `makeInitialState` HP stamping — the one new modifier surface; must compose with gear `maxHp`).

**Reused unchanged:** keystone-past-softcap, count tables, zone lifecycle/expiry, slot system, `sanitizeInput` (set-based from `SPELL_BINDINGS` — zero changes needed for ids 17–20 beyond the bindings rows themselves).

**Client:** 4 icons/tints/cast-sounds (placeholder samples, audition later); visuals — dust cloud particles, harpoon chain line (caster→projectile/victim), flurry cone flashes, war-cry ring pulse; ARMS/BULWARK position tables grow (Arms reaches 7 rows — equal to FIRE_ROWS=7, so the `workspaceHeight` pin still fits; ARMS_ROWS updates 5→7, BULWARK_ROWS 3→5).

**Tests:** per-mechanic suites mirroring the existing ones (flurry, harpoon incl. reflect-inversion and pillar-clamped drags, dust concealment incl. per-recipient snapshot assertions, war cry FF rules, bleed, every keystone), wire-level `sanitizeInput` rows for 17–20, and a full-kit v2 scenario. All keystone-retrofit nodes need regression tests proving pre-keystone ranks are unchanged.

**No DB migration** — nodes and spells are manifest data; `skill_unlocks.node_id` is unconstrained text and `character_spell_slots.spell` allows any ≥1.

## Explicit decisions

- Harpoon pull works through Block and is reflect-invertible; it is not a stun.
- Bloodsong is the only new hard CC, gated behind landing 5 melee hits on one target.
- Flurry locks out Block (no turtle-poking) and is cancelled by stun.
- Dust conceals both sides' vision symmetrically (inside sees inside; outside sees neither).
- One plan, one branch (`gladiator-expansion`), no decomposition — the trees gate the spells.
