# More Unique Items — Design

Approved 2026-08-02. Grows `UNIQUE_ITEMS` from 2 to 14, adds three dimensions
uniques do not have today — **drawbacks** (negative affix values), **visual
identity** (a tint override on the base's sprite), and **auras** (per-item
particle effects) — and fixes the base_id-only identity guess that twelve new
items would break.

No new gameplay engine work is required. Every mechanical payoff below already
functions: item talent ranks merge into tree ranks in `Room.startMatch`
(`server/src/rooms/Room.ts:89`), the cast gate only checks
`skillSets[id].has(requiredNode)` (`StateAdvancer.ts:239`) so a talent affix on
a spell node grants that spell outright, and `hasKeystone` fires on the merged
rank so item ranks can trip a keystone.

## Design intent

A unique is **one axis above rare and one axis below it**. Equipping one is a
build decision, not an obvious upgrade. Roughly two-thirds of the set carries a
real drawback; the rest pay for their power by being narrow.

The talent affix is the payload that makes uniques interesting, and it has
three distinct strengths, used deliberately:

1. **Granting a spell you never bought.** `+1 archer.multishot` on a level-1
   bow hands a fresh ranger a 2-point tier-2 spell. `+1 fire.meteor` on a
   level-7 staff hands a mage a 3-point tier-6 spell.
2. **Granting a modifier you never bought** — Ethereal Form, Shadowstep,
   Phantom Step, Combat Roll are binary 2–3 point nodes an item can simply
   give you.
3. **Pushing a stackable node past its soft cap into its keystone.** The item
   alone never trips a keystone; it rewards investment already made. Two tree
   ranks in Freeze plus Quiverfrost's `+2` reaches rank 4 and unlocks Deep
   Freeze.

**Class-shared slots grant both classes' equivalent node.** Hunter's Eye gives
`+1 fire.seeking_flame` *and* `+1 archer.guided`, so the same ring reads
identically on a mage or a ranger — your shots track. Off-class talent affixes
are inert in `computeLoadout`, so this costs nothing and needs no branching.

### Known structural constraint

Only ranger nodes carry `keystone` data (added by the ranger-talents PR); the
fire and utility trees have none. **Keystone-forcing is therefore ranger-only**
in this set. The mage's compensating payoff is the spell grants (Meteor on
Cinderfall) and raw rank stacking (rank-3 Pyroclasm on Ninefold Ember). Adding
mage keystones is separate work and explicitly out of scope here.

### Rejected alternatives

- **Aspirational uniques with no drawbacks.** Simplest to tune, but best-in-slot
  becomes obvious and the item stops being a decision.
- **Identifying a stored row's unique by matching base_id + affix array**
  (no migration). Free today, but every balance tune silently orphans copies
  already granted — they would render under their plain base name. With sharp
  tradeoffs, retuning is certain.
- **A second particle emitter for the Gear screen paperdoll and lobby hero.**
  Those are 2D canvases with no particle system. Unique item cards get a CSS
  glow in the aura color instead.

## The items

Twelve new, three per band. Existing Emberheart and Windrunner Band are
unchanged mechanically and gain auras only.

A unique's `levelReq` need not equal its base's `itemLevel` — Windrunner Band
already sits on the level-1 `bone_ring` at `levelReq: 7`. Several items below
use that (a level-4 unique on a level-1 tunic).

### Level 1

| Item | Base | Affixes | Drawback |
|---|---|---|---|
| **Kindling** | `apprentice_staff` | `damage_pct +5`, `talent +1 fire.volatile_ember` | `max_health -35` |
| **Threefold Draw** | `short_bow` | `talent +1 archer.multishot`, `cast_speed_pct +3` | `max_mana -25` |
| **Hunter's Eye** | `bone_ring` | `talent +1 fire.seeking_flame`, `talent +1 archer.guided`, `max_mana +20` | `damage_pct -5` |

- **Kindling** — *"Every apprentice is told not to feed it. Every apprentice
  does."*
- **Threefold Draw** — *"One string. It has never agreed with itself."* Grants
  Multi-shot at level 1; the mana cut is what makes firing it a choice.
- **Hunter's Eye** — *"It always knows where you meant to look."* Both classes'
  homing node; your shots track and hit softer.

### Level 4

| Item | Base | Affixes | Drawback |
|---|---|---|---|
| **Widow's Vow** | `carved_amulet` | `max_mana +75`, `mana_regen_pct +18`, `cast_speed_pct +4` | `max_health -95` |
| **Marshstrider Breeches** | `cloth_pants` | `move_speed_pct +6`, `max_health +45` | `cast_speed_pct -6` |
| **Hollowhide Jerkin** | `padded_tunic` | `talent +1 utility.ethereal_form`, `talent +1 archer_utility.shadowstep`, `max_health +50` | `mana_regen_pct -35`, `damage_pct -6` |

- **Widow's Vow** — *"She traded her heart's warmth for one more word with
  him."*
- **Marshstrider Breeches** — *"Peat-stained to the knee. They remember every
  path out of the moor."*
- **Hollowhide Jerkin** — *"Cut from something that had already learned to
  vanish."* Grants each class its 2-point vanish-while-moving node:
  invulnerability after teleport for a mage, invisibility after evade for a
  ranger.

### Level 7 — keystone band opens

| Item | Base | Affixes | Drawback |
|---|---|---|---|
| **Cinderfall** | `gnarled_staff` | `talent +1 fire.meteor`, `damage_pct +6` | `max_mana -110`, `cast_speed_pct -8` |
| **Quiverfrost** | `war_bow` | `talent +2 archer.freeze`, `damage_pct +8` | `max_health -75`, `mana_regen_pct -20` |
| **Doomsayer's Barbute** | `iron_helm` | `talent +2 fire.cataclysm`, `talent +2 archer.wide_rain`, `max_health +85` | `move_speed_pct -6` |

- **Cinderfall** — *"The sky owes it a favour."* The boldest item in the set: a
  free tier-6, 3-point spell, paid for with the mana to sustain it.
- **Quiverfrost** — *"The string does not thaw."* Two tree ranks of Freeze plus
  this reaches rank 4 and unlocks **Deep Freeze**.
- **Doomsayer's Barbute** — *"The visor is welded shut. Whoever wore it last
  had stopped looking."* Four tree ranks of Wide Rain plus this unlocks **Twin
  Storm**. Deliberately carries a negative `move_speed_pct` on a helmet: the
  leggings-only rule in `AFFIX_ALLOWED_SLOTS` governs *rolled* affixes, and a
  heavy helm that slows you is the point.

### Level 10

| Item | Base | Affixes | Drawback |
|---|---|---|---|
| **Ninefold Ember** | `archmage_staff` | `talent +3 fire.pyroclasm`, `damage_pct +12` | `max_health -150`, `cast_speed_pct -8` |
| **Stormcaller's Yew** | `great_bow` | `talent +2 archer.sustained_rain`, `talent +2 archer.piercing_rain`, `cast_speed_pct +6` | `max_mana -120`, `move_speed_pct -5` |
| **The Quiet Hour** | `moon_amulet` | `talent +1 utility.phantom_step`, `talent +1 archer_utility.combat_roll`, `cast_speed_pct +9` | `max_health -110`, `max_mana -70` |

- **Ninefold Ember** — *"Nine splinters of the same falling star, bound with
  wire."*
- **Stormcaller's Yew** — *"It bends toward weather that has not arrived yet."*
  The full rain build in one item; can trip **Stormcall** and **Exposed**
  together.
- **The Quiet Hour** — *"Between the last bell and the first, nothing is owed
  to anyone."* Shares the `moon_amulet` base with Emberheart, which is legal
  only once `unique_id` lands.

Balance summary: 3 new uniques per band (level 7 ends at 5 total, since both
existing uniques live there); 3 mage-restricted weapons, 3 ranger-restricted
weapons, 6 class-shared; keystone-forcing confined to levels 7 and 10 as
designed.

## Visual identity

A unique may carry a tint override applied to every layer of its base's LPC
manifest, making it visually distinct in-world and on its inventory icon (both
`SpriteCompositor` and `itemIcon.ts` already honour `layer.tint`/`tintMode`).

Nine of the fourteen sit on visible bases and get one: Kindling ember-orange,
Threefold Draw bone-white, Marshstrider mossy green, Hollowhide bruise-violet,
Cinderfall charred black, Quiverfrost pale blue, Doomsayer's rust-red, Ninefold
Ember white-hot, Stormcaller's storm-violet. Rings and amulets have no world
sprite and stay icon-only.

Exact hex values are chosen by eye in the running game during implementation —
the multiply-based tint pipeline makes them hard to predict from the number
alone.

## Auras

Five reusable emitter styles. Each unique picks one plus a color, a body
anchor, and an intensity; there is no per-item emitter code.

| Style | Motion | Reads as |
|---|---|---|
| `embers` | motes drift upward, hang, fade | something is burning |
| `frost` | motes fall slowly with lateral drift | cold radiating off it |
| `orbit` | motes spawn on a rotating ring, no gravity | an enchantment circling you |
| `drip` | heavy sparse motes fall from the anchor | guttering, leaking, decaying |
| `wisp` | trail left behind, emitted only while moving | speed made visible |

Anchor is `head` / `chest` / `feet`. The descriptors in the table below —
"faint", "slow", "heavy", "heaviest" — are the item's `intensity`, which scales
both emission rate and particle size within the shared budget rules.

| Item | Style | Color | Anchor |
|---|---|---|---|
| Kindling | `embers` | faint orange | chest |
| Threefold Draw | `orbit` | pale white, **three** motes | chest |
| Hunter's Eye | `orbit` | amber, slow, single mote | chest |
| Widow's Vow | `drip` | cold blue-white | chest |
| Marshstrider Breeches | `wisp` | mossy green | feet |
| Hollowhide Jerkin | `drip` | bruise-violet | chest |
| Cinderfall | `embers` | deep orange, heavy | chest |
| Quiverfrost | `frost` | pale cyan | chest |
| Doomsayer's Barbute | `drip` | rust-red | **head** |
| Ninefold Ember | `embers` | white-hot, heaviest | chest |
| Stormcaller's Yew | `wisp` | storm-violet | feet |
| The Quiet Hour | `orbit` | pale silver, very slow | chest |
| Emberheart (existing) | `orbit` | ember-orange | chest |
| Windrunner Band (existing) | `wisp` | pale green-white | feet |

### Budget rules

`ParticleSystem` is a single pooled additive-point system with 4096 slots
shared with all spell VFX, and `SpellRenderer.update` already gates continuous
emitters to 60Hz (`shouldEmitContinuous`) because per-frame emission drains the
pool on high-refresh displays. Auras inherit that gate and add two rules:

1. **Auras yield to spells.** They bail at a much lower pool threshold than the
   existing `SOFT_CAP` (which is 90% of the pool) — around 50%. During a Meteor
   and Rain of Arrows exchange, auras stop emitting until the pool drains.
   Spell VFX must never lose particles to jewelry.
2. **Two auras per player, maximum.** A character wearing seven uniques would
   be unreadable. Highest `levelReq` wins, ties broken by manifest order, so
   chase items are the ones that show.

Emission runs at 30Hz (every other continuous tick), 1–2 particles per emit —
roughly 70 live particles per player.

### Required engine change

Every particle currently takes the same `-80/s` gravity in
`ParticleSystem.update`, so nothing can rise or float. `embers` and `orbit`
need a per-particle `gravityScale` (one additional `Float32Array`, one optional
`spawn()` argument, defaulting to 1). Existing emitters pass nothing and are
unaffected.

## Data model and plumbing

### `shared/src/items.ts`

- `UniqueItem` gains two optional fields:
  - `lpcTint?: { color: string; mode?: 'fabric' }` — applied to every layer of
    the base's LPC manifest.
  - `aura?: { style: AuraStyle; color: [number, number, number]; anchor: 'head' | 'chest' | 'feet'; intensity?: number }`
    where colors are 0–1 RGB triples matching the particle buffers.
- New exported `AuraStyle` union: `'embers' | 'frost' | 'orbit' | 'drip' | 'wisp'`.
- `ItemRow` gains `unique_id?: string | null`.
- New `uniqueForRow(row: ItemRow): UniqueItem | undefined` — resolves by
  `unique_id`, falling back to the existing base_id match so rows granted
  before the migration still resolve. This replaces `GearScreen`'s private
  `findUniqueItem`, whose own comment flags that a second unique on one base
  breaks it (`client/src/items/GearScreen.ts:64-68`).
- `validateItemRow` validates `unique_id`: absent/null is fine; present must
  name a manifest unique whose `baseId` equals the row's `base_id`.

### Balance floors in `computeLoadout`

Negative affix values already flow through the arithmetic correctly, but
nothing bounds the result. `computeLoadout` already clamps `cooldownMult` to
`>= 0.5` and `moveSpeedMult` to `<= 1.15`; add:

| Stat | Floor |
|---|---|
| `maxHp` | 100 |
| `maxMana` | 50 |
| `moveSpeedMult` | 0.75 |
| `manaRegenMult` | 0 |

The worst stack the shipped set can produce is roughly −430 HP against a
750 base, well clear of these. The floors exist so no future combination can
produce a character who cannot move, cast, or survive a hit — the same posture
as the existing move-speed cap, which the code notes is a hard cap rather than
a taste guideline because uncapped movement is the most balance-decisive stat
in an arena duel.

### `shared/src/gearVisuals.ts`

`GearVisuals` changes from `Partial<Record<GearVisualSlot, string>>` to
`Partial<Record<EquipSlot, { base: string; unique?: string }>>` and now covers
all seven equip slots rather than the four visible ones. Tinting and auras then
share one source of truth — a ring's aura has no sprite to hang off otherwise,
and a second parallel field for it would be worse.

`layersForLoadout` continues to iterate `VISUAL_SLOTS` only, so nothing about
sprite composition changes; it additionally applies the unique's `lpcTint` over
the base's layers when `unique` is set.

The type change ripples mechanically through `main.ts`, `CharacterMesh`,
`SpriteCharacter`, `SpritePreview`, `LobbyUI`, `SpriteCompositor`, and
`GearScreen`. Nothing caches on the gear value, and meshes read gear only at
construction, so there is no invalidation subtlety.

**Payload cost:** `gear` rides in every tick's `PlayerState`. This grows it by
roughly 60 bytes per player, about 5 KB/s in a four-player room, on top of the
~173 KB/s the per-tick appearance resend already costs. Accepted; the
one-shot-channel fix for that whole category is separate work.

### Server

- `StateAdvancer.ts:112` already stamps `gearVisualsFor(p.items)` — unchanged
  call, new shape.
- `server/src/economy/service.ts`: `ITEM_ROW_COLUMNS` gains `unique_id`, and
  the three insert sites (vendor purchase, lootbox open, match drop) persist it
  on unique rolls.
- `DropResult` gains an optional `uniqueId` so `rollDropItem` can report which
  unique it picked.

### Migration

```sql
alter table items add column unique_id text;
```

Plus a backfill of existing unique rows from `base_id` (unambiguous today,
before any new item shares a base) and a `p_unique_id text default null`
parameter on `admin_grant_item`.

Per the project's process rule, the migration is **written but not applied
until the change has passed review**, and is packaged as a script the user runs
themselves rather than applied agent-side.

### Same-unique equip restriction (approved post-hoc, 2026-08-02)

`equip_item` refuses to equip a second item with the same non-null
`unique_id`, D2-style, with a matching client-side `canEquip` mirror. Added
during implementation beyond this spec's original scope because two max-rolled
copies of a duplicable-slot unique (e.g. Windrunner Bands on both ring slots)
sum their talent affixes past a node's soft cap and grant its keystone for
free. Ratified as a design rule by the owner during the post-landing review.

### Drop pool

`rollDropItem` currently picks uniformly over every unique with
`levelReq <= maxCharLevel`, so a level-10 player rolling the rare unique slot
would usually land a level-1 item. It changes to weight the pick toward the
player's current band, keeping a small tail of lower-band uniques so nothing
becomes permanently unobtainable.

### Client display

- `affixLabel` in `GearScreen.ts` hardcodes `+`, rendering a drawback as
  `+-35 Max Health`. It becomes sign-aware, and drawbacks render in a muted red
  on the item card so the tradeoff is legible at a glance.
- Unique item cards get a CSS glow in the item's aura color.
- `AdminScreen`'s grant flow passes `unique_id`; its read-only manifest view
  shows the new fields.

### Auras at runtime

`SpellRenderer.update(state)` already walks every player with the 60Hz gate and
has both `player.gear` and `player.position`. A new `syncUniqueAuras(state)`
runs there, resolving each player's equipped unique ids to aura configs and
calling a new `ParticleSystem.emitAura(style, color, anchor, x, y, z)`.

## Testing

- **Manifest invariants** (extends the existing `every unique references a real
  base and respects the 2-talent cap` test): unique ids are distinct; every
  `talent` affix names a node in `SKILL_NODES`; aura color components are
  within 0–1; every `lpcTint` sits on a base that has an `lpc` manifest.
- **Drift guard:** no unique's numeric affix exceeds ~1.5× the top of its
  band's rare roll range in either direction. Catches a future item that
  quietly outclasses the rarity it sits in.
- **`computeLoadout` floors:** a synthetic loadout of stacked drawbacks clamps
  at each floor rather than going negative.
- **`validateItemRow`:** accepts absent/null `unique_id`; accepts a valid one;
  rejects an unknown id and one whose manifest `baseId` disagrees with the
  row's `base_id`.
- **`uniqueForRow`:** resolves by `unique_id`; falls back to base_id for legacy
  rows; disambiguates the two uniques that share `moon_amulet`.
- **Drop pool:** over many seeded rolls at level 10, band-10 uniques dominate
  and lower bands still appear.
- **Sign-aware labels:** a negative affix renders with `-`, not `+-`.
