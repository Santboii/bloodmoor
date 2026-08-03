# Spell Loadout Slots — Design

Approved 2026-08-02. Replaces the fixed four-key spell bar with six freely
assignable slots persisted per character. Prerequisite for the frost talent
tree ([2026-08-02-frost-talent-tree-design.md](2026-08-02-frost-talent-tree-design.md)),
which gives the mage seven castable spells against today's four keys.

## Motivation

`SPELL_BINDINGS` (`shared/src/skills.ts:139-148`) hardcodes one key per spell
per class, typed `key: 1 | 2 | 3 | 4`. Every class therefore has exactly four
spells and no say in where they sit. That holds only while each class owns one
offensive tree plus one utility tree. A mage who specs into both fire and frost
unlocks seven spells and can cast three of them.

Free assignment also serves builds that already exist: a ranger who skips
Multi-shot has a permanently dead key 2 today.

## Scope

Six slots, not seven. A hybrid mage must still leave one spell benched, which
keeps the hotbar a build constraint rather than a formality. Single-tree
characters leave slots empty; empty slots render dimmed and are not castable.

Out of scope: reordering by drag, per-slot cooldown sharing, weapon swapping,
and any change to the server cast gate (see "Server" below).

## Data model

New table, `character_spell_slots`:

```sql
create table character_spell_slots (
  character_id uuid not null references characters(id) on delete cascade,
  slot         smallint not null check (slot between 1 and 6),
  spell        smallint not null,
  primary key (character_id, slot)
);
```

One row per filled slot; absent row means empty. `spell` is unconstrained by FK
because `SpellId` lives in TypeScript, so the server validates it on load and
drops unknown values rather than failing the match.

RLS mirrors `skill_unlocks`: a character's rows are readable and writable only
by the owning `user_id`, joined through `characters`.

Writes go through one RPC, `set_spell_slots(p_character_id, p_slots smallint[])`,
which atomically replaces the character's whole six-slot bar; a NULL entry is a
deliberately empty slot. Matching the existing `unlock_skill_node` /
`refund_skill_node` pattern keeps authorization in SQL.

The model is **snapshot-authoritative**: once a character has stored any
assignment those rows are the complete bar and defaults no longer apply. That
is what makes a benched slot expressible, and it keeps the optimistic UI and
the stored state identical by construction.

**Defaulting.** A character with no rows gets a deterministic default derived at
read time, not written to the table: unlocked spells in `SPELL_BINDINGS`
declaration order, filling slots 1..6. This is exactly today's behavior, so
every existing character keeps its current bar until it deliberately changes
one. Unlocking a new spell drops it into the lowest empty slot; if all six are
full it stays unslotted and the skill tree surfaces it as benched.

## Shared

`SpellBinding` loses `key` and keeps `{ spell, node, charClass }` — it remains
the spell↔node↔class map that both the ownership derivation and the server
gate read. Dropping the field is what forces every call site below to be
revisited, which is the point.

Add `MAX_SPELL_SLOTS = 6` and `type SlotIndex = 1|2|3|4|5|6` to
`shared/src/types.ts`, plus `resolveSlots(owned: Set<SpellId>, rows):
(SpellId | null)[]` implementing the defaulting rule above. Both client and
server call it so the bar and the prediction path agree.

## Client

| Change | Location |
|---|---|
| Digit regex `[1-4]` → `[1-6]` | `client/src/input/InputHandler.ts:33` |
| `spellForKey` reads the resolved slot array, not `SPELL_BINDINGS` | `InputHandler.ts:27-29` |
| Space's hardcoded `spellForKey(4)` → "the slot holding a mobility spell" | `InputHandler.ts:38-43` |
| `setCharacterClass` seeds `activeSpell` from slot 1, or the first non-empty slot | `InputHandler.ts:90-93` |
| `slotEls: Map<SpellId, SlotEntry>` → slot-indexed array | `client/src/hud/HUD.ts:50` |
| `buildSpellSlots` iterates slots, not `SPELL_BINDINGS` | `HUD.ts:144-170` |
| `update()` reads spell per slot; empty slots dim | `HUD.ts:210-252` |
| Teleport prediction keyed to literal `4` → keyed to the spell id | `client/src/main.ts:803-816` |
| `refreshLoadout` also fetches `character_spell_slots` | `main.ts:118-149` |

`HUD.ts:228` and `:244-251` hardcode spell id `8` for evade charge pips. That
stays correct — it keys off the spell, not the slot — but it must move inside
the per-slot loop rather than the per-binding loop.

`SPELL_ICONS` and `SPELL_TINTS` (`HUD.ts:6-15`) are `Record<number, string>`
with a `?? 'fa-star'` fallback at `:152`, so a missing entry degrades silently
instead of failing the build. Frost's three entries are added in Phase B; this
phase leaves them alone.

### Assignment UI

Slot assignment lives in the skill tree screen, which already owns character
loadout state and has the supabase client wired. Clicking a slot in a new bar
along the bottom of the skill tree opens a picker of unlocked-but-unslotted
spells; picking one calls `set_spell_slots` and re-renders optimistically,
matching `buyNode`'s optimistic-then-reconcile flow (`SkillTreeUI.ts:709-728`).
Assigning a spell already in another slot swaps the two.

No drag-and-drop. Click-to-open, click-to-choose is fewer moving parts and
works on trackpads.

## Server

**The cast gate needs no change.** `StateAdvancer.ts:233-240` authorizes on
spell *ownership* (is the unlocking node in the player's skill map), never on
keys. Slots are a client-side convenience; a client that sends a spell it owns
but has not slotted is not cheating and is allowed.

One hardcode does need widening for Phase B but is harmless now:
`server/src/index.ts:48` validates `r.castSpell >= 1 && r.castSpell <= 8`.

## Testing

- `resolveSlots` unit tests: no rows yields declaration order; partial rows
  preserve explicit assignments and fill the rest; a row naming an unowned or
  unknown spell is dropped; more owned spells than slots leaves the overflow
  unslotted.
- RPC tests alongside the existing skill RPC tests: `set_spell_slots` rejects a
  character the caller does not own, accepts null to clear, and enforces the
  1..6 range.
- HUD test that six slots render and empty slots are non-castable.

## Risks

- **Muscle memory.** Existing players have four spells on keys 1-4. The
  defaulting rule reproduces exactly that, so nothing moves unless the player
  moves it. Worth verifying on a real character before merge.
- **Cooldown display on swap.** `PlayerState.cooldowns` is keyed by `SpellId`,
  so a mid-match swap is not possible and none is offered — slots are edited
  out of match only. The skill tree screen is already gated to out-of-match.
