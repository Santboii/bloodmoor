# Rest Ability — Design

Approved 2026-08-02. A universal recovery action every character has: press R,
wind up for 2 seconds, then regenerate health and mana until full or
interrupted. The game's first healing mechanic and first cast-time action.

## Motivation

HP only ever decreases today — there is no healing anywhere in the sim, and
mana regen is a slow passive trickle (`MANA_REGEN_PER_TICK`,
`shared/src/types.ts:157`). Between fights the only recovery options are dying
or waiting. Rest gives every character deliberate downtime recovery without
touching combat balance: because damage and movement cancel it, its regen rate
can be generous.

## Scope

Rest is an **action, not a spell**. It never touches `SpellId`,
`SPELL_CONFIG`, `SPELL_BINDINGS`, skill maps, or the ownership gate — so it
does not collide with the frost tree's reserved spell ids 9–11
([2026-08-02-frost-talent-tree-design.md](2026-08-02-frost-talent-tree-design.md))
or the loadout-slots rework of the spell bar
([2026-08-02-spell-loadout-slots-design.md](2026-08-02-spell-loadout-slots-design.md)).
Everyone gets it unconditionally, including guests — there is no grant logic.

Out of scope: cast animation or sprite changes (rest does not use
`castingSpell`), particle effects, any talent or item interaction with rest,
and a generic cast-time system for spells.

## Mechanics

Three-state machine per player: **idle → casting (2s) → resting (regen)**.

- **Cast:** 2 seconds (120 ticks). No mana cost.
- **Regen:** 10% of `maxHp` and 10% of `maxMana` per second, applied per tick
  and clamped. Passive mana regen continues on top. Resting ends on its own
  when both pools are full.
- **Cooldown:** 3 seconds, stamped when the cast starts. Exists only to
  prevent re-cast spam flicker; an interrupted rest does not refund it.
- **Interrupts** (cancel both the wind-up and the regen):
  - nonzero movement input
  - casting any spell
  - starting an evade dash
  - losing HP this tick, from any source — direct hits and burn/poison DoT
    alike
  - dying
- Rest never roots or slows the player — moving *cancels* rather than being
  *blocked*. This is deliberate: the client movement predictor
  (`client/src/network/Predictor.ts`) replays movement with no knowledge of
  rest, and a server-only speed multiplier would rubber-band
  (`client/src/main.ts:794-801`).
- Casting rest at full HP and mana is allowed; resting simply ends the tick it
  begins. Not worth a special case.

## Shared

New constants beside `MANA_REGEN_PER_TICK` in `shared/src/types.ts`:

```ts
export const REST_CAST_TICKS = 2 * TICK_RATE;
export const REST_REGEN_FRACTION_PER_SEC = 0.10; // of maxHp and maxMana
export const REST_COOLDOWN_TICKS = 3 * TICK_RATE;
```

New optional fields on `PlayerState`, same flat-field idiom as burn/poison
(`shared/src/types.ts:44-60`):

```ts
restCastEndTick?: number;   // set while winding up
resting?: boolean;          // regen active
restCooldownUntil?: number;
```

`InputFrame` gains `rest?: boolean`.

## Server

All logic lives in `advanceState`
(`server/src/gameloop/StateAdvancer.ts`).

- **Start** — in the input loop (section 1): if `input.rest` and the player is
  alive, not evading, off cooldown, and not already casting or resting, set
  `restCastEndTick = tick + REST_CAST_TICKS` and stamp `restCooldownUntil`.
- **Resolve and regen** — a small pass beside the status-effects section
  (0.5): when `tick >= restCastEndTick`, clear it and set `resting = true`.
  While resting, add the per-tick fraction of `maxHp`/`maxMana`, clamped; when
  both are full, clear `resting`.
- **Cancel on action** — the movement branch and the spell-cast branch clear
  both rest fields when movement input is nonzero, a spell cast succeeds, or
  an evade starts.
- **Cancel on damage** — an HP snapshot per resting/casting player taken
  *after* the rest-regen pass, compared at the end of the tick; any decrease
  clears both fields. Snapshotting after regen means the comparison sees only
  losses, so healing cannot mask same-tick damage.
- `deepCopyPlayers` (`StateAdvancer.ts:690-703`) must carry the three new
  fields — it drops fields it does not copy explicitly.

Wire path: validate `rest` as a boolean in `server/src/index.ts` alongside the
`castSpell` range check, and latch it across ticks in `Room.queueInput`
(`server/src/rooms/Room.ts:115-122`) exactly like the cast latch, so a press
is not lost to network jitter. Clear it with the other latched inputs after
the tick.

## Client

- **Input:** `InputHandler` maps the R key to `InputFrame.rest`.
- **HUD:** one small dedicated slot beside the spell bar, outside the numbered
  slots the loadout spec reworks. Its overlay (mirroring `.cd-overlay`,
  `client/src/hud/HUD.ts:82-84`) is used two ways: the normal cooldown sweep
  from `restCooldownUntil`, and a cast-progress fill during the wind-up
  derived from `restCastEndTick` in the interpolated snapshot. While
  `resting` is true the icon glows/tints.
- **Orbs:** no work — HP/mana orbs render straight from server state
  (`HUD.ts:172-202`), so regen animates for free.
- No changes to `castingSpell`, `SpriteCharacter`, or the predictor.

## Testing

Extend `server/tests/stateadvancer.test.ts`, mirroring the existing mana-regen
test (`:45-56`) and the duration-effect patterns in
`server/tests/elemental-effects.test.ts`:

- cast resolves to resting after exactly `REST_CAST_TICKS`
- regen rates match the constant and clamp at `maxHp`/`maxMana`
- resting clears once both pools are full
- each interrupt cancels: movement, spell cast, evade, HP loss (direct and
  DoT), death
- cooldown blocks a restart within 3s; an interrupted rest does not refund it
- a guest player (no skill system) can rest
- rest state survives `deepCopyPlayers`

## Risks

- **First healing in the game.** 10%/s makes a full recovery from empty take
  ~10s plus the 2s cast. If that trivializes attrition between fights, the
  fraction is a single constant to tune.
- **Damage-cancel ordering.** The snapshot/compare must bracket every
  damage-dealing section of the tick; a damage source applied outside the
  bracket would fail to interrupt rest. The tests above should include at
  least one projectile hit and one DoT tick for this reason.
