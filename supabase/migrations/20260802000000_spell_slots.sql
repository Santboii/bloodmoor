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
