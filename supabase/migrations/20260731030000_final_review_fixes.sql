-- Whole-branch final review fix round (itemization-phase1).
--
-- C1 (CRITICAL, LIVE): 20260731020000_admin_read_policies.sql's
-- profiles_admin_read policy subqueries `profiles` from within a policy ON
-- `profiles` — Postgres detects this as infinite recursion (SQLSTATE
-- 42P17) and every authenticated SELECT of profiles fails, cascading to
-- characters_admin_read and items_admin_read (both subquery profiles too).
-- This migration is already applied on the live project, so real logged-in
-- users are currently getting empty profile/character/item reads. Fix:
-- a SECURITY DEFINER `is_admin()` helper that reads profiles from inside
-- its own privileged context (not through the RLS-subject query plan), then
-- every admin-read policy calls it instead of subquerying profiles inline.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where user_id = auth.uid() limit 1), false);
$$;

drop policy if exists profiles_admin_read on profiles;
create policy profiles_admin_read on profiles for select
  using (is_admin());

drop policy if exists characters_admin_read on characters;
create policy characters_admin_read on characters for select
  using (is_admin());

drop policy if exists items_admin_read on items;
create policy items_admin_read on items for select
  using (is_admin());

-- I3: create_character (v1 in 20260731000000_items.sql, v2 in
-- 20260731010000_items_fixes.sql) trusted p_user_id verbatim — any
-- authenticated caller who learns a victim's auth uuid could fill the
-- victim's 6-character cap and pollute their stash with starter items.
-- v3 here is identical to v2 except for one guard at the top: the caller
-- must be creating a character for themselves. `IS DISTINCT FROM` (not
-- `<>`) so this can't be bypassed by a NULL auth.uid() (e.g. a service-role
-- caller with no JWT) comparing NULL-vs-NULL to a false "no mismatch".
create or replace function create_character(
  p_user_id uuid,
  p_name text,
  p_class text
) returns uuid as $$
declare
  v_id uuid;
  v_count integer;
  v_weapon_base text;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'p_user_id must match the authenticated caller';
  end if;

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

  v_weapon_base := case p_class
    when 'mage' then 'apprentice_staff'
    when 'ranger' then 'short_bow'
  end;

  insert into items (user_id, base_id, rarity, affixes, level_req, slot, class_restriction, source, equipped_by, equipped_slot)
  values
    (p_user_id, v_weapon_base,   'basic', '[]'::jsonb, 1, 'weapon',   p_class, 'starter', v_id, 'weapon'),
    (p_user_id, 'leather_cap',   'basic', '[]'::jsonb, 1, 'helmet',   null,    'starter', v_id, 'helmet'),
    (p_user_id, 'padded_tunic',  'basic', '[]'::jsonb, 1, 'armor',    null,    'starter', v_id, 'armor'),
    (p_user_id, 'cloth_pants',   'basic', '[]'::jsonb, 1, 'leggings', null,    'starter', v_id, 'leggings');

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- I2: create_character mints 4 source='starter' items per call;
-- equipped_by has ON DELETE SET NULL (20260731000000_items.sql), so
-- deleting a character today returns its starter items to the account
-- stash instead of removing them — combined with the 6-character cap
-- resetting on delete, a create-delete loop mints unlimited stash items
-- (no power today, since basics are floor-tier, but Phase 2's "selling:
-- instant, price = f(rarity, level_req)" turns this into a gold faucet).
--
-- Investigated how character deletion actually executes before writing
-- this fix: the client's deleteCharacter() (client/src/supabase.ts) calls
-- `supabase.rpc('delete_character', ...)` — an RPC, not a direct table
-- delete under RLS (confirmed by grep; there is no client code path that
-- deletes from `characters` any other way). That RPC's SQL predates this
-- branch's tracked migrations, so its exact body wasn't readable here —
-- but the fix below does not depend on it: a BEFORE DELETE trigger on
-- `characters` fires for ANY statement that removes a row from that
-- table, including a DELETE issued from inside another SECURITY DEFINER
-- function, regardless of the calling role or session — this is a
-- structural Postgres guarantee, not implementation-specific. There is
-- also no soft-delete column on `characters` (fetchCharacters selects
-- unconditionally, and a deleted character does disappear from the list
-- in the live app today), so `delete_character` must perform a literal
-- `DELETE FROM characters` for that observed behavior to hold — the only
-- way a row leaves that table. Net: this trigger is guaranteed to fire on
-- delete_character's internal delete without needing to see its source.
--
-- Deletes only source='starter' items equipped by the character being
-- deleted; non-starter gear is untouched and still returns to the stash
-- via the existing ON DELETE SET NULL (that's correct, intended
-- behavior — only the free mint needs closing).
create or replace function items_delete_starter_gear() returns trigger
language plpgsql set search_path = public as $$
begin
  delete from items where equipped_by = old.id and source = 'starter';
  return old;
end;
$$;

drop trigger if exists characters_delete_starter_gear on characters;
create trigger characters_delete_starter_gear
  before delete on characters
  for each row
  execute function items_delete_starter_gear();
