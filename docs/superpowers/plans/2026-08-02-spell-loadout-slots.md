# Spell Loadout Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed four-key spell bar with six freely assignable slots persisted per character, so a mage specced into two trees can choose which spells it carries.

**Architecture:** A pure function in `shared` (`resolveSlots`) turns persisted slot rows plus the set of owned spells into a six-entry array. Client input, HUD, and the assignment UI all read that array; nothing reads keybinds from `SPELL_BINDINGS` any more. The server is untouched — its cast gate already authorizes on spell *ownership*, never on keys.

**Tech Stack:** TypeScript, npm workspaces (`shared` / `server` / `client`), Vitest, Supabase (Postgres + RLS + SECURITY DEFINER RPCs), Three.js client.

## Global Constraints

- Six slots, not seven. A hybrid mage must still bench one spell.
- Slots are edited **out of match only**. `PlayerState.cooldowns` is keyed by `SpellId`, so mid-match swapping is not supported and must not be offered.
- Existing characters must see **no change** to their bar until they deliberately move a spell. The defaulting rule reproduces today's layout exactly.
- All tests live in `server/tests/` and run via `npm test` from the repo root, even when they cover `shared` code (see `server/tests/skills.test.ts` for the precedent). The `client` workspace has a `test` script but no test files; do not add the first one here.
- Supabase mutations go through `SECURITY DEFINER` RPCs that check `characters.user_id = auth.uid()`. Tables get a read policy only — no insert/update/delete policies (the pattern in `supabase/migrations/20260731000000_items.sql:31-38`).
- Do not modify anything under `server/src/gameloop/` or `server/src/rooms/` in this plan.

---

### Task 1: `resolveSlots` in shared

The pure defaulting rule everything else depends on. Additive — nothing is removed yet, so the build stays green.

**Files:**
- Modify: `shared/src/types.ts` (add `MAX_SPELL_SLOTS`, `SlotIndex` near the other constants around `:148-157`)
- Modify: `shared/src/skills.ts` (add `SpellSlotRow`, `MOBILITY_SPELLS`, `resolveSlots` after `SPELL_BINDINGS` at `:148`)
- Test: `server/tests/spell-slots.test.ts` (create)

**Interfaces:**
- Consumes: `SpellId` and `SPELL_BINDINGS` as they exist today.
- Produces:
  - `MAX_SPELL_SLOTS: 6`
  - `type SlotIndex = 1 | 2 | 3 | 4 | 5 | 6`
  - `type SpellSlotRow = { slot: number; spell: number }`
  - `MOBILITY_SPELLS: Record<CharacterClass, SpellId>`
  - `resolveSlots(owned: Set<SpellId>, rows: SpellSlotRow[]): (SpellId | null)[]` — always returns exactly `MAX_SPELL_SLOTS` entries, index 0 being slot 1.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/spell-slots.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSlots, MAX_SPELL_SLOTS, MOBILITY_SPELLS } from '@arena/shared';
import type { SpellId } from '@arena/shared';

const owned = (...ids: number[]) => new Set(ids as SpellId[]);

describe('resolveSlots', () => {
  it('always returns exactly MAX_SPELL_SLOTS entries', () => {
    expect(resolveSlots(new Set(), []).length).toBe(MAX_SPELL_SLOTS);
    expect(resolveSlots(owned(1, 2, 3, 4), []).length).toBe(MAX_SPELL_SLOTS);
  });

  it('with no rows, fills slots in SPELL_BINDINGS declaration order', () => {
    expect(resolveSlots(owned(1, 2, 3, 4), [])).toEqual([1, 2, 3, 4, null, null]);
  });

  it('with no rows, seeds each spell at its legacy default slot', () => {
    // A mage with only Fireball and Teleport keeps them on keys 1 and 4 —
    // exactly where they sit today. Nothing is silently rebound.
    expect(resolveSlots(owned(1, 4), [])).toEqual([1, null, null, 4, null, null]);
  });

  it('falls back to the lowest empty slot when a default slot is taken', () => {
    // Spell 5 is the ranger's Power Shot (defaultSlot 1); with the mage's
    // Fireball already holding slot 1 it spills to the first free slot.
    expect(resolveSlots(owned(1, 5), [])).toEqual([1, 5, null, null, null, null]);
  });

  it('treats a stored snapshot as the complete bar', () => {
    // Fireball is pinned to slot 3. Fire Wall is owned but absent from the
    // snapshot, which means the player benched it — it must NOT reappear.
    expect(resolveSlots(owned(1, 2), [{ slot: 3, spell: 1 }]))
      .toEqual([null, null, 1, null, null, null]);
  });

  it('lets a slot stay deliberately empty', () => {
    // The bench that makes "Clear" work: slot 1 has no row, and Fireball
    // does not fall back into it because a snapshot exists.
    expect(resolveSlots(owned(1, 2), [{ slot: 2, spell: 2 }])[0]).toBeNull();
  });

  it('falls back to defaults when no row survives validation', () => {
    // A snapshot whose spells were all respecced away must not strand the
    // player on an empty bar.
    expect(resolveSlots(owned(1), [{ slot: 2, spell: 7 }]))
      .toEqual([1, null, null, null, null, null]);
  });

  it('drops rows with an out-of-range slot', () => {
    expect(resolveSlots(owned(1), [{ slot: 0, spell: 1 }, { slot: 9, spell: 1 }]))
      .toEqual([1, null, null, null, null, null]);
  });

  it('drops rows naming a spell id outside the SpellId range', () => {
    expect(resolveSlots(owned(1), [{ slot: 2, spell: 99 }]))
      .toEqual([1, null, null, null, null, null]);
  });

  it('keeps the first row when two rows name the same spell', () => {
    expect(resolveSlots(owned(1), [{ slot: 2, spell: 1 }, { slot: 4, spell: 1 }]))
      .toEqual([null, 1, null, null, null, null]);
  });

  it('leaves the overflow unslotted when more spells are owned than slots', () => {
    const result = resolveSlots(owned(1, 2, 3, 4, 5, 6, 7), []);
    expect(result.filter(s => s !== null).length).toBe(MAX_SPELL_SLOTS);
    expect(result).not.toContain(null);
  });

  it('names a mobility spell for every class', () => {
    expect(MOBILITY_SPELLS.mage).toBe(4);
    expect(MOBILITY_SPELLS.ranger).toBe(8);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- spell-slots`
Expected: FAIL — `resolveSlots` is not exported from `@arena/shared`.

- [ ] **Step 3: Add the constants to `shared/src/types.ts`**

Add immediately after `export const MAX_MANA = 500;` (currently `:156`):

```ts
export const MAX_SPELL_SLOTS = 6;
export type SlotIndex = 1 | 2 | 3 | 4 | 5 | 6;
```

- [ ] **Step 4: Implement `resolveSlots` in `shared/src/skills.ts`**

Add after the `SPELL_BINDINGS` array (currently ends `:148`):

```ts
export type SpellSlotRow = { slot: number; spell: number };

/** Each class's movement spell, cast by Space regardless of which slot holds it. */
export const MOBILITY_SPELLS: Record<CharacterClass, SpellId> = {
  mage: 4,    // Teleport
  ranger: 8,  // Evade
};

const ALL_SPELL_IDS: ReadonlySet<number> = new Set(SPELL_BINDINGS.map(b => b.spell));

/**
 * Resolve persisted slot rows into the character's hotbar.
 *
 * The model is **snapshot-authoritative**: a character who has edited their
 * bar has every slot persisted, and those rows are the complete truth.
 * Defaults apply only to a character who has never edited.
 *
 *   1. Explicit rows win. If any survived validation, return immediately —
 *      an absent slot in a stored snapshot means *deliberately empty*, and
 *      nothing may fall into it. This is what makes benching a spell
 *      possible, and it is why "Clear" works.
 *   2. Otherwise (a never-edited character) every owned spell seeds at its
 *      legacy default slot. This keeps an existing character's bar identical
 *      to what it was before slots existed: a mage owning Fireball and
 *      Meteor keeps them on keys 1 and 3, with the gap where Fire Wall goes.
 *   3. Anything still unplaced — its default slot was taken, or it has no
 *      default (Phase B frost spells) — falls to the lowest empty slot.
 *
 * The early return keys off whether any row *survived validation*, not
 * whether any row was supplied. A snapshot whose spells were all respecced
 * away resolves to defaults rather than stranding the player on an empty
 * bar.
 *
 * Consequence to know: once a character has edited, a newly unlocked spell
 * does NOT auto-appear on the bar. They assign it from the slot bar on the
 * skill tree screen, which is where they just spent the point.
 */
export function resolveSlots(owned: Set<SpellId>, rows: SpellSlotRow[]): (SpellId | null)[] {
  const slots: (SpellId | null)[] = new Array(MAX_SPELL_SLOTS).fill(null);
  const placed = new Set<SpellId>();

  const claim = (index: number, spell: SpellId) => {
    slots[index] = spell;
    placed.add(spell);
  };

  for (const row of rows) {
    if (!Number.isInteger(row.slot) || row.slot < 1 || row.slot > MAX_SPELL_SLOTS) continue;
    if (!ALL_SPELL_IDS.has(row.spell)) continue;
    const spell = row.spell as SpellId;
    if (!owned.has(spell)) continue;
    if (placed.has(spell)) continue;      // first row wins
    if (slots[row.slot - 1] !== null) continue;
    claim(row.slot - 1, spell);
  }

  // Snapshot-authoritative: a stored assignment is the whole bar. Empty
  // slots in it are deliberate benches, so the default passes must not run.
  if (placed.size > 0) return slots;

  for (const binding of SPELL_BINDINGS) {
    if (!owned.has(binding.spell) || placed.has(binding.spell)) continue;
    // `key` is today's fixed keybind. Task 6 renames it to `defaultSlot`,
    // which is what it actually means once slots are assignable.
    const index = binding.key - 1;
    if (slots[index] === null) claim(index, binding.spell);
  }

  for (const binding of SPELL_BINDINGS) {
    if (!owned.has(binding.spell) || placed.has(binding.spell)) continue;
    const free = slots.indexOf(null);
    if (free === -1) break;
    claim(free, binding.spell);
  }

  return slots;
}
```

Add `MAX_SPELL_SLOTS` to the existing `types.js` import at the top of `skills.ts` (currently `import { TELEPORT_MAX_RANGE } from './types.js';`):

```ts
import { TELEPORT_MAX_RANGE, MAX_SPELL_SLOTS } from './types.js';
```

- [ ] **Step 5: Verify `shared/src/index.ts` re-exports the new symbols**

Read `shared/src/index.ts`. It re-exports whole modules; if it uses explicit named exports instead, add `MAX_SPELL_SLOTS`, `SlotIndex`, `SpellSlotRow`, `MOBILITY_SPELLS`, and `resolveSlots`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- spell-slots`
Expected: PASS, 10 tests.

- [ ] **Step 7: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — this task is purely additive.

- [ ] **Step 8: Commit**

```bash
git add shared/src/types.ts shared/src/skills.ts shared/src/index.ts server/tests/spell-slots.test.ts
git commit -m "feat(spells): resolve persisted hotbar slots from owned spells"
```

---

### Task 2: Slot persistence migration

**Files:**
- Create: `supabase/migrations/20260802000000_spell_slots.sql`

**Interfaces:**
- Consumes: existing `characters` table (`id`, `user_id`).
- Produces: table `character_spell_slots(character_id, slot, spell)` and RPC `set_spell_slots(p_character_id uuid, p_slots smallint[])`, which atomically replaces the character's whole six-slot bar. `NULL` at an index means that slot is deliberately empty.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260802000000_spell_slots.sql`:

```sql
-- Per-character hotbar assignment. One row per filled slot; an absent row
-- means empty. Characters with no rows fall back to the TS-side default in
-- resolveSlots (SPELL_BINDINGS declaration order), which reproduces the old
-- fixed-key layout — so existing characters see no change until they move a
-- spell themselves.
--
-- `spell` is deliberately unconstrained by FK: SpellId lives in TypeScript,
-- not in the database. resolveSlots drops unknown values on read rather than
-- failing the match.
create table if not exists character_spell_slots (
  character_id uuid not null references characters(id) on delete cascade,
  slot         smallint not null check (slot between 1 and 6),
  spell        smallint not null check (spell >= 1),
  primary key (character_id, slot)
);

create index if not exists character_spell_slots_character_idx
  on character_spell_slots (character_id);

alter table character_spell_slots enable row level security;

create policy character_spell_slots_owner_read on character_spell_slots for select
  using (exists (
    select 1 from characters c
    where c.id = character_spell_slots.character_id and c.user_id = auth.uid()
  ));

-- No insert/update/delete policies: mutations only happen through the
-- SECURITY DEFINER RPC below, which bypasses RLS as the function owner.

-- Replace a character's entire hotbar in one atomic call.
--
-- The model is snapshot-authoritative: the client computes the whole
-- six-slot array and stores it. That makes swapping, clearing, and benching
-- ordinary array edits on the client rather than three different SQL paths,
-- and it removes any chance of the optimistic UI and the stored state
-- disagreeing — what the player sees IS what gets written.
--
-- p_slots must have exactly 6 entries, ordered slot 1..6, with NULL for a
-- deliberately empty slot.
create or replace function set_spell_slots(
  p_character_id uuid,
  p_slots smallint[]
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_slots is null or array_length(p_slots, 1) is distinct from 6 then
    raise exception 'expected exactly 6 slot entries';
  end if;

  if not exists (
    select 1 from characters where id = p_character_id and user_id = auth.uid()
  ) then
    raise exception 'character not found or not owned by caller';
  end if;

  delete from character_spell_slots where character_id = p_character_id;

  insert into character_spell_slots (character_id, slot, spell)
  select p_character_id, i::smallint, p_slots[i]
  from generate_series(1, 6) as i
  where p_slots[i] is not null;
end;
$$;

grant execute on function set_spell_slots(uuid, smallint[]) to authenticated;
```

The `grant` is explicit because every other client-facing RPC in this repo states its own (`supabase/migrations/20260731000000_items.sql:138,151,188,255,268`), and the one deliberately-unreachable function uses an explicit `revoke`. Postgres would grant it by default; saying so keeps this file's reachability readable.

- [ ] **Step 2: Write a shape-guard test for the migration**

There is no local Postgres in this repo's test loop, but `server/tests/economy.test.ts:185-203` establishes the pattern for asserting on migration SQL as text. Use it to lock the security guarantees in place.

Append to `server/tests/spell-slots.test.ts`:

```ts
import { readFileSync } from 'node:fs';

describe('set_spell_slots migration guardrails', () => {
  const sql = readFileSync(
    new URL('../../supabase/migrations/20260802000000_spell_slots.sql', import.meta.url),
    'utf8',
  );

  it('enables RLS and grants read only to the owning account', () => {
    expect(sql).toMatch(/alter table character_spell_slots enable row level security/);
    expect(sql).toMatch(/create policy character_spell_slots_owner_read[\s\S]*?for select/);
  });

  it('exposes no insert, update, or delete policy', () => {
    expect(sql).not.toMatch(/for (insert|update|delete)/);
  });

  it('runs the RPC as SECURITY DEFINER with a pinned search_path', () => {
    expect(sql).toMatch(/security definer set search_path = public/);
  });

  it('checks character ownership before mutating', () => {
    // Both offsets must be measured from inside the RPC. The RLS policy
    // above it also contains `user_id = auth.uid()`, and an unscoped search
    // finds that one — which would keep this test green even if the RPC's
    // own ownership check were deleted outright.
    const rpcStart = sql.indexOf('create or replace function set_spell_slots');
    expect(rpcStart).toBeGreaterThan(0);

    const ownership = sql.indexOf('user_id = auth.uid()', rpcStart);
    const firstMutation = Math.min(
      ...['delete from character_spell_slots', 'insert into character_spell_slots']
        .map(s => sql.indexOf(s, rpcStart))
        .filter(i => i > 0),
    );
    expect(ownership).toBeGreaterThan(rpcStart);
    expect(ownership).toBeLessThan(firstMutation);
  });

  it('bounds the slot range in the table and the array length in the RPC', () => {
    expect(sql).toMatch(/check \(slot between 1 and 6\)/);
    expect(sql).toMatch(/array_length\(p_slots, 1\) is distinct from 6/);
  });

  it('grants execute to authenticated', () => {
    expect(sql).toMatch(/grant execute on function set_spell_slots\(uuid, smallint\[\]\) to authenticated/);
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npm test -- spell-slots`
Expected: PASS. A failure here means a guardrail is genuinely missing from the migration — fix the SQL, not the test.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260802000000_spell_slots.sql server/tests/spell-slots.test.ts
git commit -m "feat(db): persist per-character spell slot assignments"
```

---

### Task 3: Slot-indexed HUD spell bar

**Files:**
- Modify: `client/src/hud/HUD.ts` — `SlotEntry` type (`:25-36`), `slotEls` field (`:50`), `buildSpellSlots` (`:144-170`), the slot loop in `update` (`:210-252`), and the CSS block (`:77-91`)
- Modify: `client/src/main.ts:148` and `:723-725` (the two `buildSpellSlots` call sites)

**Interfaces:**
- Consumes: `resolveSlots`, `MAX_SPELL_SLOTS` from Task 1.
- Produces: `HUD.buildSpellSlots(slots: (SpellId | null)[]): void` — replaces the old `(ownedSpells: Set<SpellId>)` signature. Always renders exactly `MAX_SPELL_SLOTS` slots; empty ones are dimmed and never show cooldown or mana state.

- [ ] **Step 1: Widen the `SlotEntry` type and the `slotEls` field**

In `HUD.ts`, add `spell` to `SlotEntry` (`:25-36`) so the update loop no longer needs a map key:

```ts
type SlotEntry = {
  spell: SpellId;
  slot: HTMLElement;
  cd: HTMLElement;
  cdTime: HTMLElement;
  pips: HTMLElement;
  lastPct: number;
  lastActive: boolean;
  lastNoMana: boolean;
  lastCooling: boolean;
  lastCdText: string;
  lastCharges?: number;
};
```

Replace the field at `:50`:

```ts
private slotEls: (SlotEntry | null)[] = [];
```

- [ ] **Step 2: Add the empty-slot CSS rule**

In the `<style>` block, immediately after the `.spell-slot.active::after` rule (`:88`):

```css
.spell-slot.empty{opacity:0.3}
.spell-slot.empty .slot-icon{opacity:0.5}
```

- [ ] **Step 3: Rewrite `buildSpellSlots`**

Replace `:144-170` entirely:

```ts
buildSpellSlots(slots: (SpellId | null)[]): void {
  this.spellsEl.textContent = '';
  this.slotEls = [];
  for (let i = 0; i < MAX_SPELL_SLOTS; i++) {
    const spell = slots[i] ?? null;
    const slot = document.createElement('div');
    slot.className = spell === null ? 'spell-slot empty' : 'spell-slot';
    const icon = spell === null ? 'fa-minus' : (SPELL_ICONS[spell] ?? 'fa-star');
    const tint = spell === null ? 'var(--px-text)' : (SPELL_TINTS[spell] ?? 'var(--px-text)');
    slot.innerHTML = `
      <i class="fa ${icon} fa-fw slot-icon" style="color:${tint}"></i>
      <span class="slot-key">${i + 1}</span>
      <div class="cd-overlay" style="height:0%"></div>
      <span class="cd-time"></span>
      <div class="charge-pips"></div>`;
    this.spellsEl.appendChild(slot);
    if (spell === null) {
      this.slotEls.push(null);
      continue;
    }
    this.slotEls.push({
      spell,
      slot,
      cd: slot.querySelector('.cd-overlay') as HTMLElement,
      cdTime: slot.querySelector('.cd-time') as HTMLElement,
      pips: slot.querySelector('.charge-pips') as HTMLElement,
      lastPct: 0,
      lastActive: false,
      lastNoMana: false,
      lastCooling: false,
      lastCdText: '',
    });
  }
}
```

Add `MAX_SPELL_SLOTS` to the `@arena/shared` import on `:1`.

- [ ] **Step 4: Update the slot loop in `update`**

Replace the loop header at `:210` (`for (const [key, entry] of this.slotEls) {`) with:

```ts
for (const entry of this.slotEls) {
  if (!entry) continue;
  const key = entry.spell;
```

The body from `:211` to `:251` is unchanged — it already reads `key` as a `SpellId`, and the two `key === 8` checks for evade charge pips stay correct because 8 is a spell id, not a slot.

- [ ] **Step 5: Update both call sites in `main.ts`**

At `:148`, inside `refreshLoadout` — for now resolve with no persisted rows, which reproduces current behavior exactly (Task 5 supplies the real rows):

```ts
hud.buildSpellSlots(resolveSlots(ownedSpells, []));
```

At `:723-725`, the guest fallback:

```ts
// Guests have no skill unlocks but the server lets them cast their class's
// bound spells — show those slots rather than an empty bar.
const slotSpells = ownedSpells.size > 0
  ? ownedSpells
  : new Set(SPELL_BINDINGS.filter(b => b.charClass === (activeCharacter?.class ?? 'mage')).map(b => b.spell));
hud.buildSpellSlots(resolveSlots(slotSpells, []));
```

Add `resolveSlots` to the `@arena/shared` import in `main.ts`.

- [ ] **Step 6: Verify the client builds**

Run: `npm run build --workspace=client`
Expected: PASS. A type error on `buildSpellSlots` means a call site was missed.

- [ ] **Step 7: Verify the bar renders unchanged**

Run the app (`npm run dev`), enter a match with an existing mage, and confirm: six slots render, the first four hold Fireball / Fire Wall / Meteor / Teleport with keys 1-4 as before, slots 5 and 6 are visibly dimmed, and cooldown sweeps and mana graying still work on the filled slots.

- [ ] **Step 8: Commit**

```bash
git add client/src/hud/HUD.ts client/src/main.ts
git commit -m "feat(hud): render the spell bar as six indexed slots"
```

---

### Task 4: Six-key, slot-driven input

**Files:**
- Modify: `client/src/input/InputHandler.ts` — `spellForKey` (`:27-29`), `onKeyDown` (`:31-44`), `setCharacterClass` (`:90-93`), and add a `setSlots` method

**Interfaces:**
- Consumes: `resolveSlots` output shape and `MOBILITY_SPELLS` from Task 1.
- Produces: `InputHandler.setSlots(slots: (SpellId | null)[]): void` — called by `main.ts` whenever the loadout changes. Until it is called, the handler holds an all-null array and number keys do nothing.

- [ ] **Step 1: Replace the binding lookup with a slot array**

In `InputHandler.ts`, replace the `activeSpell` field (`:11`) and add a slots field:

```ts
private activeSpell: SpellId | null = null;
private slots: (SpellId | null)[] = new Array(MAX_SPELL_SLOTS).fill(null);
```

Replace `spellForKey` (`:27-29`):

```ts
private spellForSlot(slot: number): SpellId | null {
  return this.slots[slot - 1] ?? null;
}
```

Update the import on `:1`:

```ts
import { InputFrame, SpellId, MAX_SPELL_SLOTS, MOBILITY_SPELLS } from '@arena/shared';
```

`SPELL_BINDINGS` is no longer needed here — remove it from the import.

- [ ] **Step 2: Widen the digit regex and fix Space**

Replace `onKeyDown` (`:31-44`):

```ts
private onKeyDown = (e: KeyboardEvent) => {
  this.keys.add(e.code);
  const digit = /^Digit([1-6])$/.exec(e.code);
  if (digit) {
    const spell = this.spellForSlot(Number(digit[1]));
    if (spell) this.activeSpell = spell;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    // The mobility spell is cast by its id wherever it sits — slots are free
    // now, so "whatever is on key 4" is no longer the same thing.
    const mobility = MOBILITY_SPELLS[this.charClass];
    if (this.slots.includes(mobility)) {
      this.pendingCast = { spell: mobility, aimTarget: this.mouseWorld };
    }
  }
};
```

- [ ] **Step 3: Add `setSlots` and fix `setCharacterClass`**

Replace `setCharacterClass` (`:90-93`) and add `setSlots` beside it:

```ts
setSlots(slots: (SpellId | null)[]): void {
  this.slots = slots;
  // Keep the current selection if it survived the change; otherwise fall back
  // to the first non-empty slot so left-click is never a no-op.
  if (this.activeSpell === null || !slots.includes(this.activeSpell)) {
    this.activeSpell = slots.find((s): s is SpellId => s !== null) ?? null;
  }
}

setCharacterClass(cls: string): void {
  this.charClass = cls === 'ranger' ? 'ranger' : 'mage';
}
```

- [ ] **Step 4: Guard the cast path against an empty bar**

`onMouseUp` (`:57-60`) and `buildInputFrame` (`:62-84`) must not queue a null spell. Replace `onMouseUp`:

```ts
private onMouseUp = (e: MouseEvent) => {
  if (e.button !== 0) return;
  if (this.activeSpell === null) return;
  this.pendingCast = { spell: this.activeSpell, aimTarget: this.mouseWorld };
};
```

Change `getActiveSpell` (`:95`) to return the nullable type:

```ts
getActiveSpell(): SpellId | null { return this.activeSpell; }
```

- [ ] **Step 5: Fix the `getActiveSpell` consumer**

`main.ts:881` passes the result into `hud.update(state, inputHandler.getActiveSpell())`. Widen `HUD.update`'s second parameter (`HUD.ts:172`) to `activeSpell: SpellId | null`. The comparison at `:211` (`const active = key === activeSpell;`) is already correct for null.

- [ ] **Step 6: Verify the client builds**

Run: `npm run build --workspace=client`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/input/InputHandler.ts client/src/hud/HUD.ts
git commit -m "feat(input): drive spell selection from six assignable slots"
```

---

### Task 5: Load and thread persisted slots

**Files:**
- Modify: `client/src/main.ts` — `refreshLoadout` (`:118-149`), match start (`:715-725`)

**Interfaces:**
- Consumes: `set_spell_slots` / `character_spell_slots` from Task 2, `resolveSlots` from Task 1, `InputHandler.setSlots` from Task 4.
- Produces: a module-level `activeSlots: (SpellId | null)[]` that both the HUD and the input handler read.

- [ ] **Step 1: Add the module-level slot state**

Beside `let ownedSpells = new Set<SpellId>();` (`:102`):

```ts
let activeSlots: (SpellId | null)[] = new Array(MAX_SPELL_SLOTS).fill(null);
```

- [ ] **Step 2: Fetch slot rows in `refreshLoadout`**

`refreshLoadout` already runs two awaited fetches before its staleness guard at `:140`. Add the slot fetch alongside the existing `skill_unlocks` query at `:119`:

```ts
const [{ data }, { data: slotData }] = await Promise.all([
  supabase.from('skill_unlocks').select('node_id, rank').eq('character_id', characterId),
  supabase.from('character_spell_slots').select('slot, spell').eq('character_id', characterId),
]);
const slotRows = (slotData ?? []) as SpellSlotRow[];
```

Then replace the `buildSpellSlots` line added in Task 3 (`:148`):

```ts
ownedSpells = spellsFromNodes(nodeSet);
playerElement = deriveElement(effRanks);
phaseShiftRank = effRanks.get('utility.phase_shift' as NodeId) ?? 0;
activeSlots = resolveSlots(ownedSpells, slotRows);
hud.buildSpellSlots(activeSlots);
inputHandler?.setSlots(activeSlots);
```

`inputHandler` is only constructed at match start, so the optional call is required — `refreshLoadout` also runs from the lobby.

Add `SpellSlotRow` and `MAX_SPELL_SLOTS` to the `@arena/shared` import.

- [ ] **Step 3: Seed the handler at match start**

At `:715-725`, after `inputHandler.setCharacterClass(...)`, replace the guest-fallback block written in Task 3:

```ts
inputHandler = new InputHandler(scene, scene.renderer.domElement);
if (activeCharacter) inputHandler.setCharacterClass(activeCharacter.class);

// Guests have no skill unlocks but the server lets them cast their class's
// bound spells — show those slots rather than an empty bar.
const slots = ownedSpells.size > 0
  ? activeSlots
  : resolveSlots(
      new Set(SPELL_BINDINGS.filter(b => b.charClass === (activeCharacter?.class ?? 'mage')).map(b => b.spell)),
      [],
    );
hud.buildSpellSlots(slots);
inputHandler.setSlots(slots);
```

- [ ] **Step 4: Verify the teleport prediction needs no change**

Read `main.ts:803-816`. The condition is `frame.castSpell === 4 && ownedSpells.has(4)`. `castSpell` is a `SpellId`, so this already keys off the *spell*, not a keybind, and stays correct under free assignment. **Make no change here.** (The design doc listed this as a change site; that was wrong, and this step exists to stop an implementer "fixing" working code.)

- [ ] **Step 5: Verify the client builds**

Run: `npm run build --workspace=client`
Expected: PASS.

- [ ] **Step 6: Manually verify persistence end to end**

Run the app. With a logged-in mage: confirm the bar matches the pre-change layout. Then insert a row directly via the Supabase SQL editor —
`select set_spell_slots('<character-id>'::uuid, array[null,null,null,null,null,1]::smallint[]);`
— reload, and confirm Fireball has moved to slot 6 and slot 1 now holds Fire Wall.

- [ ] **Step 7: Commit**

```bash
git add client/src/main.ts
git commit -m "feat(client): load persisted spell slots into the bar and input"
```

---

### Task 6: Rename `key` to `defaultSlot`

The field survives, but its meaning has changed. It is no longer "the key that casts this spell" — nothing looks a spell up by keypress any more. It is now "the slot this spell occupies when the character has not assigned one," which is what preserves an existing character's bar unchanged. Renaming it forces every read site to be revisited, which is the same guarantee deleting it would have given.

Making it optional matters for Phase B: the frost tree adds three more mage spells, and with only six slots they cannot all have a distinct default. A spell with no `defaultSlot` simply falls to the lowest empty slot.

**Files:**
- Modify: `shared/src/skills.ts:137-148` and the `resolveSlots` default-slot pass
- Test: `server/tests/spell-slots.test.ts` (extend)

**Interfaces:**
- Produces: `SpellBinding = { spell: SpellId; node: NodeId; charClass: CharacterClass; defaultSlot?: SlotIndex }`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/spell-slots.test.ts`:

```ts
import { SPELL_BINDINGS } from '@arena/shared';

describe('default slots', () => {
  it('keeps every existing spell on the key it uses today', () => {
    const slotOf = (s: number) => SPELL_BINDINGS.find(b => b.spell === s)?.defaultSlot;
    expect(slotOf(1)).toBe(1);  // Fireball
    expect(slotOf(2)).toBe(2);  // Fire Wall
    expect(slotOf(3)).toBe(3);  // Meteor
    expect(slotOf(4)).toBe(4);  // Teleport
    expect(slotOf(5)).toBe(1);  // Power Shot
    expect(slotOf(8)).toBe(4);  // Evade
  });

  it('gives every current spell an explicit default slot', () => {
    // `defaultSlot` is optional so Phase B's frost spells can omit it, but
    // no spell that exists today may rely on that — omitting one here would
    // silently move it to the lowest empty slot and change a live hotbar.
    for (const b of SPELL_BINDINGS) {
      expect(b.defaultSlot).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- spell-slots`
Expected: FAIL — `defaultSlot` does not exist on `SpellBinding`.

- [ ] **Step 3: Rename the field**

Replace `:137-148`:

```ts
/** Maps a spell to the node that unlocks it and the class that can cast it.
 *  `defaultSlot` is the hotbar slot the spell takes when the character has
 *  not assigned one — it preserves the pre-slots keybind layout. A spell
 *  without one falls to the lowest empty slot. */
export type SpellBinding = {
  spell: SpellId;
  node: NodeId;
  charClass: CharacterClass;
  defaultSlot?: SlotIndex;
};

export const SPELL_BINDINGS: SpellBinding[] = [
  { spell: 1, node: 'fire.fireball',          defaultSlot: 1, charClass: 'mage' },
  { spell: 2, node: 'fire.fire_wall',         defaultSlot: 2, charClass: 'mage' },
  { spell: 3, node: 'fire.meteor',            defaultSlot: 3, charClass: 'mage' },
  { spell: 4, node: 'utility.teleport',       defaultSlot: 4, charClass: 'mage' },
  { spell: 5, node: 'archer.power_shot',      defaultSlot: 1, charClass: 'ranger' },
  { spell: 6, node: 'archer.multishot',       defaultSlot: 2, charClass: 'ranger' },
  { spell: 7, node: 'archer.rain_of_arrows',  defaultSlot: 3, charClass: 'ranger' },
  { spell: 8, node: 'archer_utility.evade',   defaultSlot: 4, charClass: 'ranger' },
];
```

- [ ] **Step 4: Update the `resolveSlots` default-slot pass**

The second pass currently reads `binding.key`. It becomes:

```ts
  for (const binding of SPELL_BINDINGS) {
    if (!owned.has(binding.spell) || placed.has(binding.spell)) continue;
    if (binding.defaultSlot === undefined) continue;
    const index = binding.defaultSlot - 1;
    if (slots[index] === null) claim(index, binding.spell);
  }
```

- [ ] **Step 5: Build every workspace to find stragglers**

Run: `npm run build --workspace=client && npm test`
Expected: PASS. Any surviving `b.key` reference surfaces here as a type error — that is the rename doing the job deletion would have done.

- [ ] **Step 6: Commit**

```bash
git add shared/src/skills.ts server/tests/spell-slots.test.ts
git commit -m "refactor(spells): rename the spell keybind to defaultSlot"
```

---

### Task 7: Slot assignment UI

**Files:**
- Modify: `client/src/skills/SkillTreeUI.ts` — CSS block (near `:133`), `render()` markup (`:363-392`), `reload()` (`:299-344`), and new handler methods beside `buyNode` (`:709-728`)

**Interfaces:**
- Consumes: `set_spell_slots` RPC (Task 2), `resolveSlots` (Task 1).
- Produces: a slot bar at the bottom of the skill tree screen. Click a slot — it highlights — to open a picker of unlocked spells below it; click a spell to assign it, or the dedicated "— Clear —" item to empty the slot.

- [ ] **Step 1: Load the character's slots in `reload()`**

`reload()` runs a parallel fetch pair at `:302-313`. Add one field beside the existing `private ranks = new Map<NodeId, number>();` (`:221`):

```ts
private slotRows: SpellSlotRow[] = [];
```

Widen the destructure and add a third query:

```ts
const [{ data: charData }, { data }, { data: slotData }] = await Promise.all([
  supabase
    .from('characters')
    .select('skill_points_available, name, class')
    .eq('id', this.characterId)
    .single(),
  supabase
    .from('skill_unlocks')
    .select('node_id, rank')
    .eq('character_id', this.characterId),
  supabase
    .from('character_spell_slots')
    .select('slot, spell')
    .eq('character_id', this.characterId),
]);
```

Then, immediately before the trailing `this.render();` (`:343`):

```ts
this.slotRows = (slotData ?? []) as SpellSlotRow[];
```

Owned spells are derived from `this.ranks`, which is the existing map of unlocked nodes — there is no separate owned-node field. Add a getter beside the other private helpers:

```ts
private ownedSpells(): Set<SpellId> {
  return new Set(SPELL_BINDINGS.filter(b => this.ranks.has(b.node)).map(b => b.spell));
}
```

Placing the assignment before `this.render()` matters: `reload()` already grants the class-default node above this point, so `this.ranks` is complete by the time the bar renders.

- [ ] **Step 2: Add the slot bar CSS**

In the `<style>` block near the other `.st-*` rules (`:133-144`):

```css
.st-slots{display:flex;gap:8px;justify-content:center;margin-top:14px}
.st-slot{width:46px;height:46px;background:#23252c;box-shadow:0 0 0 2px var(--px-border-dark);position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer}
.st-slot.picking{box-shadow:0 0 0 2px var(--px-accent)}
.st-slot .st-slot-key{position:absolute;right:2px;bottom:2px;font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-text)}
.st-picker{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}
.st-picker-item{padding:6px 10px;background:#23252c;box-shadow:0 0 0 2px var(--px-border-dark);cursor:pointer;font-family:'VT323',monospace;font-size:15px;color:var(--px-text)}
.st-picker-item:hover{box-shadow:0 0 0 2px var(--px-accent)}
```

- [ ] **Step 3: Render the bar**

In `render()`, after the closing tag of the two-column block (`:392`), insert:

```ts
<div class="st-slots" id="st-slots">${this.renderSlotBar()}</div>
<div class="st-picker" id="st-picker"></div>
```

Add the method beside the other render helpers:

```ts
private renderSlotBar(): string {
  const slots = resolveSlots(this.ownedSpells(), this.slotRows);
  return slots.map((spell, i) => {
    const icon = spell === null ? 'fa-minus' : (NODE_ICONS[nodeForSpell(spell)] ?? 'fa-star');
    return `<div class="st-slot" data-slot="${i + 1}">
      <i class="fa ${icon} fa-fw"${spell === null ? ' style="opacity:0.3"' : ''}></i>
      <span class="st-slot-key">${i + 1}</span>
    </div>`;
  }).join('');
}
```

And a module-level helper beside `esc` (`:46`):

```ts
function nodeForSpell(spell: SpellId): NodeId {
  return SPELL_BINDINGS.find(b => b.spell === spell)!.node;
}
```

- [ ] **Step 4: Wire the picker**

Add beside `buyNode` (`:709-728`), following its optimistic-then-reconcile shape. Note `this.el` is the root element (there is no `this.root`) and `this.characterId` is `string | null`:

```ts
private pickingSlot: SlotIndex | null = null;

private openPicker(slot: SlotIndex): void {
  this.pickingSlot = slot;
  // Mark which slot is being edited. The picker renders in its own row
  // below the bar, so without this the player has no way to tell which of
  // the six slots their choice will land in.
  this.el.querySelectorAll('.st-slot').forEach(el => {
    el.classList.toggle('picking', Number((el as HTMLElement).dataset.slot) === slot);
  });
  const picker = this.el.querySelector('#st-picker') as HTMLElement;
  const items = [...this.ownedSpells()].map(spell => {
    const node = SKILL_NODES.find(n => n.id === nodeForSpell(spell));
    return `<div class="st-picker-item" data-spell="${spell}">${esc(node?.name ?? String(spell))}</div>`;
  });
  items.push('<div class="st-picker-item" data-spell="clear">— Clear —</div>');
  picker.innerHTML = items.join('');
}

private async assignSlot(slot: SlotIndex, spell: SpellId | null): Promise<void> {
  if (!this.characterId) return;

  // Snapshot-authoritative: compute the whole bar and store the whole bar.
  // There is no swap to model against the server, so the optimistic view
  // and what persists cannot drift apart.
  const next = resolveSlots(this.ownedSpells(), this.slotRows);
  const existing = spell === null ? -1 : next.indexOf(spell);
  // Moving a spell that already sits somewhere swaps the two slots; the
  // vacated one takes whatever the target was holding (possibly nothing).
  if (existing !== -1) next[existing] = next[slot - 1];
  next[slot - 1] = spell;

  this.slotRows = next
    .map((s, i) => ({ slot: i + 1, spell: s }))
    .filter((r): r is { slot: number; spell: SpellId } => r.spell !== null);

  this.pickingSlot = null;
  this.render();

  const { error } = await supabase.rpc('set_spell_slots', {
    p_character_id: this.characterId,
    p_slots: next,
  });
  if (error) console.error('Slot assignment failed, reverting:', error.message);
  await this.reload();
}
```

- [ ] **Step 5: Bind the click handlers**

`render()` re-binds listeners at `:403` (respec) and `:642-680` (nodes), using `this.el.querySelector` / `this.el.querySelectorAll`. Match that idiom — add after the respec binding at `:403`:

```ts
this.el.querySelectorAll('.st-slot').forEach(el => {
  el.addEventListener('click', () => {
    this.openPicker(Number((el as HTMLElement).dataset.slot) as SlotIndex);
  });
});
// Delegate on the container, not the items. `render()` emits #st-picker
// EMPTY and openPicker fills it later via innerHTML — binding the items
// here would attach zero listeners and the picker would never respond.
this.el.querySelector('#st-picker')!.addEventListener('click', e => {
  const item = (e.target as HTMLElement).closest('.st-picker-item') as HTMLElement | null;
  if (!item || this.pickingSlot === null) return;
  const raw = item.dataset.spell;
  void this.assignSlot(this.pickingSlot, raw === 'clear' ? null : (Number(raw) as SpellId));
});
```

Because `render()` rebuilds `innerHTML` wholesale, these bindings are re-established on every render — the same lifecycle the node handlers already rely on.

- [ ] **Step 6: Verify the client builds**

Run: `npm run build --workspace=client`
Expected: PASS.

- [ ] **Step 7: Manually verify the full loop**

Run the app. Open the skill tree on a mage. Confirm: six slots render with the current assignment; clicking a slot opens the picker; picking a spell already in another slot swaps them; "Clear" empties the slot; closing and reopening the tree preserves the change; and entering a match shows the new arrangement on the HUD with the matching number keys.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add client/src/skills/SkillTreeUI.ts
git commit -m "feat(ui): assign spells to hotbar slots from the skill tree"
```

---

## Notes for the implementer

- **`SkillTreeUI.ts` is 810 lines** and this plan adds to it rather than splitting it. That is deliberate: the slot bar genuinely belongs to the loadout screen, and a split should be its own change. If it crosses ~950 lines, raise it rather than refactoring mid-task.
- **`SkillTreeUI` field names in Task 7 are verified against the source:** `this.el` is the root element (there is no `this.root`), `this.ranks: Map<NodeId, number>` holds unlocked nodes (there is no separate owned-node set), `this.characterId: string | null`, and `esc` is a module-level function at `:46`. Do not add fields that duplicate this state.
- **The design doc lists `main.ts:803` as a change site. It is not** — see Task 5 Step 4. The condition there already keys off the spell id.
- **Do not touch the server.** If a change here appears to require a server edit, the design is wrong; stop and raise it.
