-- Which manifest unique an items row is. Before this column a unique row was
-- identified by guessing from base_id, which breaks as soon as two uniques
-- share a base (the_quiet_hour and emberheart both sit on moon_amulet).
alter table items add column if not exists unique_id text;

-- Backfill rows granted before the column existed. Unambiguous at this
-- moment: every pre-existing unique sits alone on its base, and the second
-- moon_amulet unique cannot predate this migration.
update items set unique_id = 'emberheart'
  where rarity = 'unique' and base_id = 'moon_amulet' and unique_id is null;
update items set unique_id = 'windrunner_band'
  where rarity = 'unique' and base_id = 'bone_ring' and unique_id is null;

-- admin_grant_item: adds p_unique_id, and relaxes the affix-value guard from
-- "> 0" to "non-zero". Unique items now carry negative affix values as
-- deliberate drawbacks; the old guard made every one of them ungrantable.
-- Body is otherwise verbatim from 20260731010000_items_fixes.sql.

-- create-or-replace cannot change a function's signature: adding p_unique_id
-- would leave the old 7-arg version in place as a second overload, and a
-- 7-argument call would then be ambiguous rather than resolving to either.
drop function if exists admin_grant_item(uuid, text, text, jsonb, integer, text, text);

create or replace function admin_grant_item(
  p_user_id uuid,
  p_base_id text,
  p_rarity text,
  p_affixes jsonb,
  p_level_req integer,
  p_slot text,
  p_class_restriction text default null,
  p_unique_id text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item_id uuid;
  v_affixes jsonb := coalesce(p_affixes, '[]'::jsonb);
  v_elem jsonb;
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin) then
    raise exception 'admin only';
  end if;

  if jsonb_typeof(v_affixes) <> 'array' then
    raise exception 'p_affixes must be a jsonb array';
  end if;

  for v_elem in select * from jsonb_array_elements(v_affixes) loop
    if jsonb_typeof(v_elem) <> 'object' then
      raise exception 'each affix must be a jsonb object';
    end if;

    if not (v_elem ? 'id') or (v_elem ->> 'id') not in
      ('max_health', 'max_mana', 'damage_pct', 'cast_speed_pct', 'move_speed_pct', 'mana_regen_pct', 'talent')
    then
      raise exception 'invalid affix id: %', v_elem ->> 'id';
    end if;

    if not (v_elem ? 'value') or jsonb_typeof(v_elem -> 'value') <> 'number' or (v_elem ->> 'value')::numeric = 0 then
      raise exception 'affix value must be a non-zero number';
    end if;

    if (v_elem ->> 'id') = 'talent' and (
      not (v_elem ? 'node') or jsonb_typeof(v_elem -> 'node') <> 'string' or length(trim(v_elem ->> 'node')) = 0
    ) then
      raise exception 'talent affix must include a non-empty node string';
    end if;
  end loop;

  insert into items (user_id, base_id, rarity, affixes, level_req, slot, class_restriction, source, unique_id)
  values (p_user_id, p_base_id, p_rarity, v_affixes, p_level_req, p_slot, p_class_restriction, 'admin', p_unique_id)
  returning id into v_item_id;

  return v_item_id;
end;
$$;

grant execute on function admin_grant_item(uuid, text, text, jsonb, integer, text, text, text) to authenticated;

-- equip_item: adds a same-unique guard. Two ring slots let a character equip
-- two copies of one unique, and computeLoadout sums their talent affixes —
-- Windrunner Band's archer.barrage (+1-3) at two copies clears the softCap-5
-- keystone gate for free. Diablo II's fix is the simplest one: forbid
-- equipping a second copy of a unique already equipped elsewhere. Signature
-- is unchanged from 20260731000000_items.sql, so no drop-function is needed —
-- create-or-replace only breaks an existing signature when the arg types or
-- count change, and this touches only the body.
create or replace function equip_item(
  p_item_id uuid,
  p_character_id uuid,
  p_slot text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_item items%rowtype;
  v_character characters%rowtype;
begin
  select * into v_item from items where id = p_item_id and user_id = auth.uid();
  if not found then
    raise exception 'item not found or not owned by caller';
  end if;

  select * into v_character from characters where id = p_character_id and user_id = auth.uid();
  if not found then
    raise exception 'character not found or not owned by caller';
  end if;

  if v_item.equipped_by is not null and v_item.equipped_by <> p_character_id then
    raise exception 'item is equipped by another character';
  end if;

  if v_item.slot = 'ring' then
    if p_slot not in ('ring1', 'ring2') then
      raise exception 'invalid slot % for ring item', p_slot;
    end if;
  else
    if p_slot <> v_item.slot then
      raise exception 'invalid slot % for % item', p_slot, v_item.slot;
    end if;
  end if;

  if v_character.level < v_item.level_req then
    raise exception 'character level % is below item level_req %', v_character.level, v_item.level_req;
  end if;

  if v_item.class_restriction is not null and v_item.class_restriction <> v_character.class then
    raise exception 'item is restricted to class %', v_item.class_restriction;
  end if;

  -- Reject a second copy of the same unique in a different slot. Same-row
  -- re-equip (id = p_item_id) and same-slot replacement are both allowed —
  -- only a distinct row of the same unique landing in a distinct slot is
  -- the double-count case this guards against.
  if v_item.unique_id is not null and exists (
    select 1 from items
    where equipped_by = p_character_id
      and equipped_slot is not null
      and equipped_slot <> p_slot
      and unique_id = v_item.unique_id
      and id <> p_item_id
  ) then
    raise exception 'character already has % equipped', v_item.unique_id;
  end if;

  -- Free whatever currently occupies the target slot for this character.
  update items set equipped_by = null, equipped_slot = null
  where equipped_by = p_character_id and equipped_slot = p_slot and id <> p_item_id;

  update items set equipped_by = p_character_id, equipped_slot = p_slot
  where id = p_item_id;
end;
$$;

grant execute on function equip_item(uuid, uuid, text) to authenticated;
