import { describe, it, expect } from 'vitest';
import { resolveSlots, MAX_SPELL_SLOTS, MOBILITY_SPELLS, SPELL_BINDINGS } from '@arena/shared';
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

import { readFileSync } from 'node:fs';

describe('set_spell_slots migration guardrails', () => {
  const sql = readFileSync(
    new URL('../../supabase/migrations/20260802010000_spell_slots.sql', import.meta.url),
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

  it('gives every pre-frost spell an explicit default slot', () => {
    // Frost spells (9-11) deliberately have none — with only six slots the
    // mage's seven spells cannot all hold a distinct default, so frost falls
    // to the lowest empty slot. Spells 1-8 predate slots and must keep the
    // exact key they had, or a live hotbar silently moves.
    for (const b of SPELL_BINDINGS) {
      if (b.spell >= 9) continue;
      expect(b.defaultSlot).toBeDefined();
    }
  });

  it('gives frost spells no default slot', () => {
    // Frost (9-12) joins an EXISTING class's bar, so it must not displace a
    // mage's legacy layout. Gladiator (13-16) is a brand-new class with no
    // legacy bars to preserve — its spells deliberately carry defaults.
    for (const b of SPELL_BINDINGS.filter(x => x.spell >= 9 && x.spell <= 12)) {
      expect(b.defaultSlot).toBeUndefined();
    }
  });
});
