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

-- Assign a spell to a slot, clear a slot (p_spell null), or swap two slots
-- (when p_spell already lives in a different slot on the same character).
create or replace function set_spell_slot(
  p_character_id uuid,
  p_slot smallint,
  p_spell smallint
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old_slot  smallint;
  v_displaced smallint;
begin
  if p_slot is null or p_slot < 1 or p_slot > 6 then
    raise exception 'slot out of range';
  end if;

  if not exists (
    select 1 from characters where id = p_character_id and user_id = auth.uid()
  ) then
    raise exception 'character not found or not owned by caller';
  end if;

  if p_spell is null then
    delete from character_spell_slots
    where character_id = p_character_id and slot = p_slot;
    return;
  end if;

  -- Where the incoming spell lives now (if anywhere), and what currently
  -- occupies the target slot. Both are read before any mutation so the swap
  -- below cannot see its own writes.
  select slot into v_old_slot from character_spell_slots
  where character_id = p_character_id and spell = p_spell and slot <> p_slot;

  select spell into v_displaced from character_spell_slots
  where character_id = p_character_id and slot = p_slot;

  -- Clear both rows first: writing the target directly would collide with the
  -- primary key while the old row still holds the same spell.
  delete from character_spell_slots
  where character_id = p_character_id and (slot = p_slot or slot = v_old_slot);

  insert into character_spell_slots (character_id, slot, spell)
  values (p_character_id, p_slot, p_spell);

  -- Only a genuine swap re-homes the displaced spell; if the incoming spell
  -- was previously unslotted there is nothing to move back.
  if v_old_slot is not null and v_displaced is not null then
    insert into character_spell_slots (character_id, slot, spell)
    values (p_character_id, v_old_slot, v_displaced);
  end if;
end;
$$;
