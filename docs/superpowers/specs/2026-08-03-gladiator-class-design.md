# Gladiator Class — Design

**Date:** 2026-08-03
**Status:** Approved

## Summary

A third playable class: a close-range duelist who wins by absorbing and answering damage rather than out-bursting. Uses one-handed spears. Ships with four new combat systems the game does not have yet — melee hitboxes, true stun, directional damage reduction (Block), and projectile reflection — all built as shared mechanics that future classes can inherit.

## Identity & stats

- Class id: `gladiator`.
- Same base stats as mage/ranger: 750 HP, 500 mana, 200 u/s. No per-class stat axis is introduced. Durability comes from playing Block and Reflect well; talent nodes can add flat max-HP later if needed (gear already modifies `maxHp`).

## The Kit

Follows the existing 4-slot pattern (keys 1–3 + Space). Block lives on right-click outside the spell system, like Rest lives on R. All numbers are tuning starting points. Baselines for reference: Fireball 80–120 dmg / 0.5s CD / 25 mana; Arrow 60–90 / 0.4s CD / 20 mana.

### Jab — key 1, SpellId 9 (class starter node)

- Narrow line hitbox toward cursor: ~90 units long, ~40 wide. Hits the first enemy in the line.
- Damage 75–100 (melee-risk premium over Arrow).
- 10 mana, 0.5s cooldown (30 ticks).
- Resolved instantly at cast — no projectile entity. Line-of-sight check against pillars (same as fireball blast).
- Uses the LPC `thrust` animation (new; must be vendored — `derive-weapon-anchors.mjs` already lists `thrust` in its `EXTENDING` set).

### Spear Throw — key 2, SpellId 10

- New projectile type `'spear'`: speed ~500, straight line, no homing.
- 70–100 damage plus a **1s true stun** (60 ticks).
- 40 mana, 6s cooldown (360 ticks) — whiffing it should hurt.

### Reflect — key 3, SpellId 11

- 1s window (`reflectUntil` on `PlayerState`, absolute ticks).
- Any projectile that would hit the Gladiator during the window instead:
  - flips `ownerId` to the Gladiator (reflected damage credits the reflector),
  - re-aims velocity at the original owner's current position,
  - gets a `noHitUntil` grace so it cannot immediately re-hit the reflector (mechanism already exists for split arrows).
- Reflected spears carry their stun.
- 40 mana, 8s cooldown (480 ticks). Casting it releases Block (as does any cast).

### Leap — Space / key 4, SpellId 12

- Jump to cursor, clamped to ~400 range (reuse the `clampTeleport` pattern in shared physics so client prediction agrees).
- Airborne ~0.25s (15 ticks) with i-frames, interpolated like the Evade dash.
- Enemies within ~70 units of the landing point are slowed 30% for 1s. No landing damage, no stun — sticking power only.
- 30 mana, 3s cooldown (180 ticks).

### Block — right-click hold (not a spell)

- While held:
  - Damage from sources in the 180° front arc (dot product of incoming-attack direction vs aim direction ≥ 0) is reduced **60%**.
  - Move speed ×0.5.
  - Cannot cast; casting any ability releases Block.
- Attacks from behind (outside the arc) deal full damage.
- **Status effects pierce Block**: burn, slow, and stun still apply through a blocked hit — only damage is mitigated. A blocked Spear Throw still stuns (prevents Gladiator-mirror stalemates; keeps rules simple).
- Being stunned force-releases Block.
- Releasing (or being force-released) starts a 1s re-raise cooldown.
- Free to hold indefinitely — the costs are the movement slow, the lost offense, and the exposed back.

## New shared systems

These are game systems, not Gladiator-private code. Future classes inherit them.

### Stun

- New `stunUntil` field on `PlayerState` (absolute ticks, like all statuses; ticked/expired in the §0.5 status pass).
- Effects: move multiplier 0 (like root) **and** the cast gate in `advanceState` rejects casts while stunned. Force-releases Block.
- Needs an unmistakable victim-side visual (stars/flash) — "my buttons don't work" must be legible.

### Melee hitbox

- New `server/src/spells/Jab.ts` exporting pure helpers (`jabHitsPlayer`, `jabDamage`) in the style of the existing spell modules: line-segment vs player AABB (`PLAYER_HALF_SIZE` box) plus `hasLineOfSight` against pillars.

### Block plumbing

- New `InputFrame.blocking?: boolean` — a **held state**, not a one-shot latch. Unlike `castSpell`, `Room.tick()` must NOT clear it each tick.
- Client (`InputHandler`): `preventDefault()` on `contextmenu`, track button-2 mousedown/mouseup.
- Server: `blockingSince` / `blockCooldownUntil` stamped on `PlayerState`.
- All damage sites route through one new helper — `mitigateDamage(target, sourcePos, rawDamage)` — so mitigation logic lives in exactly one place.
- Client prediction mirrors the 0.5× move multiplier through the shared `movePlayer` speed-multiplier path (same discipline as slows), or movement rubber-bands.

### Reflect plumbing

- Handled inside the existing projectile loop in `StateAdvancer` (the loop already iterates all players, so the hook point is clean): reflect check runs before the hit is resolved.

## Talent trees: Arms + Bulwark

Two trees in `CLASS_TREES`, mirroring the mage fire/utility split. Spell unlocks live in Arms; Jab is the `CLASS_DEFAULT_NODE` starter (like Fireball / Power Shot).

**Arms (offense):**
- Jab damage ranks
- Spear Throw unlock + stun-duration ranks
- Leap unlock + landing-slow ranks
- Keystone — **Executioner's Thrust**: Jab deals +50% damage to stunned or slowed targets.

**Bulwark (defense):**
- Block damage-reduction ranks (60% → 70%)
- Move-speed-while-blocking ranks
- Reflect unlock + window ranks
- Keystone — **Riposte**: blocked hits build stacks; at 3 stacks the next Jab within 3s is free, ignores cooldown, and stuns for 0.5s. Turtling generates offense instead of just delaying, and the payoff is bounded and blockable.

## Weapons & art

- Three one-handed spears in `ITEM_BASES` with `slot: 'weapon'`, `classRestriction: 'gladiator'`, at ilvl bands 1/7/10 (matching the staff/bow cadence), each with an implicit affix and an `lpc` sprite manifest.
- Vendor LPC spear sheets and the `thrust` animation: add paths to `scripts/vendor-lpc.mjs`, add `'thrust'` to `LpcAnimation` + `LPC_ANIMATIONS` (`shared/src/appearance.ts`), add it to `ANIMS` in `scripts/derive-weapon-anchors.mjs`, re-run both scripts (regenerates `weaponAnchors.generated.ts`).
- `SpriteCharacter` cast animation: gladiator → `thrust` (mage → `slash`, ranger → `shoot`).

## Registration sweep

Per the ranger playbook (`docs/superpowers/plans/2026-05-01-amazon-archer-class.md`):

1. `CharacterClass` union + `normalizeCharacterClass` + `CHARACTER_CLASSES` + `CLASS_DEFAULT_NODE`.
2. `SpellId` union widened to 9–12; `SPELL_CONFIG`, `SPELL_BINDINGS` entries.
3. `SkillTree`/`NodeId` unions, `SKILL_NODES`, `GATES`, `CLASS_TREES` (`arms`, `bulwark`).
4. `CLASS_DEFAULT_APPEARANCE` entry.
5. Server: `GladiatorModifiers.ts` (`buildGladiatorModifiers`), wired into `advanceState`; new spell modules (`Jab.ts`, `Spear.ts`).
6. Client: HUD `SPELL_ICONS`/`SPELL_TINTS`, `SpellRenderer` syncs (spear projectile, reflect flash, block pose/shield, leap arc, stun stars), `sfx` entries, `SkillTreeUI` positions/labels for both trees, `CLASS_ICONS`, `InputHandler.setCharacterClass`.

### Known traps (from architecture explore)

- `StateAdvancer.getSpellNodeMap` **infers** class from skill nodes (`skills.has(ranger starter) ? 'ranger' : 'mage'`) — a third class is misread as mage and its spells blocked. Fix it to read `charClass` directly. Same for the `rangerMods` presence inference.
- The `classOfSpell(spell) === 'ranger' && !rangerMods[id]` cast guard needs a parallel gladiator guard — **guests bypass node checks entirely**, so without a modifier-presence guard, guests could cast gladiator spells.
- **DB migration** must widen: `characters_class_check`, the `create_character` RPC's `IF p_class NOT IN (…)` guard, and `items.class_restriction` checks (touchpoints in `20260731000000_items.sql`, `20260731010000_items_fixes.sql`, `20260731030000_final_review_fixes.sql`).
- Coordinate with the in-flight 6-slot spell-loadout spec (`2026-08-02-spell-loadout-slots-design.md`): everything here is data-driven `SpellBinding` entries, so the migration path is unaffected.

## Testing

Mirror the ranger suite (Vitest, server workspace, `npm test`):

- `gladiator-skills.test.ts`, `gladiator-modifiers.test.ts`, `gladiator-combat.test.ts` — parity with the ranger set.
- `jab.test.ts` — line hitbox geometry, first-target-only, LoS through pillars.
- `spear.test.ts` — projectile flight, stun application, expiry.
- `block.test.ts` — arc math (front vs behind), 60% reduction, cast-breaks-block, re-raise cooldown, stun pierces and force-releases, move-speed multiplier.
- `reflect.test.ts` — ownership flip, re-aim at attacker, `noHitUntil` grace (no self-rehit), stun carried on reflected spears, window expiry.
- `stun.test.ts` — cast gate rejection, movement zeroed, expiry, interaction with root/slow.

## Explicit design decisions

- **Stuns pierce Block** — only damage is mitigated. Keeps mitigation rules uniform and prevents mirror-match stalemates.
- **Leap deals no damage** — engage + stun + jab already forms the kill pattern; landing damage stacked too much combo into one rotation for a defensive class.
- **Block is free to hold** — no stamina/decay system in v1. Anti-turtle pressure comes from rear vulnerability, the movement slow, and opponents' burst timing.
- **No per-class base stats** — avoids a new sim/prediction/HUD axis on top of four new mechanics.
