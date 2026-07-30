-- Items schema, equip/unequip + admin RPCs, drop tables.
-- Ownership convention: profiles.user_id is the FK to auth.users (confirmed
-- against client/src/supabase.ts and AuthUI.ts, which both query
-- profiles.user_id — NOT profiles.id) so every admin/ownership check below
-- reads profiles.user_id = auth.uid(), not "profiles.id".

alter table profiles add column if not exists is_admin boolean not null default false;

-- items: account-owned (user_id), optionally equipped by one of the
-- account's characters (equipped_by). class_restriction is populated at
-- grant time (grant_starter_gear / admin_grant_item) so equip_item can
-- enforce the class check without knowing the TS ITEM_BASES manifest.
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_id text not null,
  rarity text not null check (rarity in ('basic', 'magic', 'rare', 'unique')),
  affixes jsonb not null default '[]'::jsonb,
  level_req integer not null check (level_req >= 1),
  slot text not null check (slot in ('weapon', 'helmet', 'armor', 'leggings', 'ring', 'amulet')),
  class_restriction text null check (class_restriction is null or class_restriction in ('mage', 'ranger')),
  equipped_by uuid null references characters(id) on delete set null,
  equipped_slot text null check (equipped_slot in ('weapon', 'helmet', 'armor', 'leggings', 'ring1', 'ring2', 'amulet')),
  source text not null check (source in ('starter', 'drop', 'vendor', 'lootbox', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on items (user_id);
create index if not exists items_equipped_by_idx on items (equipped_by) where equipped_by is not null;

alter table items enable row level security;

create policy items_owner_read on items for select
  using (user_id = auth.uid());

create policy items_admin_read on items for select
  using (exists (select 1 from profiles where user_id = auth.uid() and is_admin));

-- No insert/update/delete policies: mutations only happen through the
-- SECURITY DEFINER RPCs below, which bypass RLS as the function owner.

-- ON DELETE SET NULL (character deletion) updates equipped_by via a plain
-- UPDATE, which fires this trigger — equipped_slot would otherwise go
-- stale (pointing at a slot on a now-orphaned item). The RPCs below also
-- null both columns explicitly, so this is a no-op in that path and only
-- does real work for the character-deletion case.
create or replace function items_clear_slot_on_unequip() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.equipped_by is null and old.equipped_by is not null then
    new.equipped_slot := null;
  end if;
  return new;
end;
$$;

drop trigger if exists items_clear_slot_on_unequip on items;
create trigger items_clear_slot_on_unequip
  before update on items
  for each row
  execute function items_clear_slot_on_unequip();

-- drop_tables: context -> rarity weights, read by anyone authenticated,
-- mutated only via admin_update_drop_table.
create table if not exists drop_tables (
  context text primary key,
  weights jsonb not null,
  updated_at timestamptz not null default now()
);

alter table drop_tables enable row level security;

create policy drop_tables_read on drop_tables for select
  to authenticated using (true);

insert into drop_tables (context, weights) values
  ('match_drop', '{"basic": 70, "magic": 24, "rare": 5.5, "unique": 0.5}'::jsonb),
  ('lootbox_basic', '{"basic": 60, "magic": 32, "rare": 7.5, "unique": 0.5}'::jsonb),
  ('lootbox_premium', '{"basic": 25, "magic": 50, "rare": 21, "unique": 4}'::jsonb)
on conflict (context) do nothing;

-- equip_item: caller must own both the item and the character. Validates
-- the item isn't equipped elsewhere, the requested slot matches the item's
-- base slot (rings -> ring1|ring2, everything else exact), the character's
-- level meets level_req, and any class restriction. Then frees whatever
-- currently sits in that slot for the character and equips this item.
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

  -- Free whatever currently occupies the target slot for this character.
  update items set equipped_by = null, equipped_slot = null
  where equipped_by = p_character_id and equipped_slot = p_slot and id <> p_item_id;

  update items set equipped_by = p_character_id, equipped_slot = p_slot
  where id = p_item_id;
end;
$$;

grant execute on function equip_item(uuid, uuid, text) to authenticated;

create or replace function unequip_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update items set equipped_by = null, equipped_slot = null
  where id = p_item_id and user_id = auth.uid();
  if not found then
    raise exception 'item not found or not owned by caller';
  end if;
end;
$$;

grant execute on function unequip_item(uuid) to authenticated;

-- grant_starter_gear: inserts + equips the 4 level-1 "Crude" basics
-- (weapon.base_id chosen by class, plus the three class-agnostic pieces),
-- source = 'starter'. Called from create_character below, but also stands
-- alone as an authenticated RPC, so it re-checks ownership itself.
create or replace function grant_starter_gear(p_character_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_class text;
  v_weapon_base text;
begin
  select user_id, class into v_user_id, v_class
  from characters where id = p_character_id and user_id = auth.uid();
  if not found then
    raise exception 'character not found or not owned by caller';
  end if;

  v_weapon_base := case v_class
    when 'mage' then 'apprentice_staff'
    when 'ranger' then 'short_bow'
    else null
  end;
  if v_weapon_base is null then
    raise exception 'unknown class: %', v_class;
  end if;

  insert into items (user_id, base_id, rarity, affixes, level_req, slot, class_restriction, source, equipped_by, equipped_slot)
  values
    (v_user_id, v_weapon_base,   'basic', '[]'::jsonb, 1, 'weapon',   v_class, 'starter', p_character_id, 'weapon'),
    (v_user_id, 'leather_cap',   'basic', '[]'::jsonb, 1, 'helmet',   null,    'starter', p_character_id, 'helmet'),
    (v_user_id, 'padded_tunic',  'basic', '[]'::jsonb, 1, 'armor',    null,    'starter', p_character_id, 'armor'),
    (v_user_id, 'cloth_pants',   'basic', '[]'::jsonb, 1, 'leggings', null,    'starter', p_character_id, 'leggings');
end;
$$;

grant execute on function grant_starter_gear(uuid) to authenticated;

-- create_character: verbatim from 20260730010000_rename_amazon_to_ranger.sql
-- (the current definition), with a grant_starter_gear call appended.
create or replace function create_character(
  p_user_id uuid,
  p_name text,
  p_class text
) returns uuid as $$
declare
  v_id uuid;
  v_count integer;
begin
  if p_class not in ('mage', 'ranger') then
    raise exception 'Invalid class: %', p_class;
  end if;

  select count(*) into v_count
  from characters
  where user_id = p_user_id;

  if v_count >= 6 then
    raise exception 'Maximum characters reached';
  end if;

  insert into characters (user_id, name, class, xp, level, skill_points_available, skill_points_total)
  values (p_user_id, p_name, p_class, 0, 1, 1, 1)
  returning id into v_id;

  perform grant_starter_gear(v_id);

  return v_id;
end;
$$ language plpgsql security definer;

-- admin_grant_item: the testing lever — grants any base at any rarity
-- (or a curated unique roll assembled client-side) to any account.
-- p_class_restriction is supplied by the caller (from the ITEM_BASES /
-- UNIQUE_ITEMS manifest lookup) rather than re-derived here: admin already
-- fully controls every other field on the grant (rarity, affixes,
-- level_req), so this is consistent with the existing trust boundary for
-- this RPC, not a new one.
create or replace function admin_grant_item(
  p_user_id uuid,
  p_base_id text,
  p_rarity text,
  p_affixes jsonb,
  p_level_req integer,
  p_slot text,
  p_class_restriction text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item_id uuid;
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin) then
    raise exception 'admin only';
  end if;

  insert into items (user_id, base_id, rarity, affixes, level_req, slot, class_restriction, source)
  values (p_user_id, p_base_id, p_rarity, coalesce(p_affixes, '[]'::jsonb), p_level_req, p_slot, p_class_restriction, 'admin')
  returning id into v_item_id;

  return v_item_id;
end;
$$;

grant execute on function admin_grant_item(uuid, text, text, jsonb, integer, text, text) to authenticated;

create or replace function admin_delete_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin) then
    raise exception 'admin only';
  end if;

  delete from items where id = p_item_id;
end;
$$;

grant execute on function admin_delete_item(uuid) to authenticated;

create or replace function admin_update_drop_table(p_context text, p_weights jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_basic numeric;
  v_magic numeric;
  v_rare numeric;
  v_unique numeric;
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin) then
    raise exception 'admin only';
  end if;

  if not (p_weights ? 'basic' and p_weights ? 'magic' and p_weights ? 'rare' and p_weights ? 'unique') then
    raise exception 'weights must include basic, magic, rare, unique keys';
  end if;

  v_basic  := (p_weights ->> 'basic')::numeric;
  v_magic  := (p_weights ->> 'magic')::numeric;
  v_rare   := (p_weights ->> 'rare')::numeric;
  v_unique := (p_weights ->> 'unique')::numeric;

  if v_basic < 0 or v_magic < 0 or v_rare < 0 or v_unique < 0 then
    raise exception 'weights must be non-negative';
  end if;
  if v_basic + v_magic + v_rare + v_unique <= 0 then
    raise exception 'at least one weight must be positive';
  end if;

  update drop_tables set weights = p_weights, updated_at = now() where context = p_context;
  if not found then
    raise exception 'unknown drop table context: %', p_context;
  end if;
end;
$$;

grant execute on function admin_update_drop_table(text, jsonb) to authenticated;
