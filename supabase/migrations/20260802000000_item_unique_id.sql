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
