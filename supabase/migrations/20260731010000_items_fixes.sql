-- Hardening follow-up to 20260731000000_items.sql.
--
-- Live verification initially found create_character -> grant_starter_gear
-- failing when create_character was invoked via a service-role (no-JWT)
-- caller: grant_starter_gear's ownership check (`user_id = auth.uid()`)
-- reads NULL for auth.uid() in that case, so it can't match the
-- just-created character and the whole create_character call aborts. A
-- second live run through an authenticated ephemeral user's own session
-- (the way the real client app always calls it) passed 11/11, confirming
-- this was a test-script bug (wrong client), not a bug in the RPC.
--
-- Still worth hardening: create_character trusts its p_user_id parameter
-- unconditionally (pre-existing behavior, unchanged here) while
-- grant_starter_gear separately re-checks ownership against auth.uid() —
-- an inconsistency that would abort character creation entirely for any
-- future non-interactive caller (admin backfill, seeding/test tooling)
-- that creates characters via service role. Fix: inline the starter-gear
-- insert directly into create_character (which just inserted v_id itself,
-- so no ownership re-check is needed there), and revoke
-- grant_starter_gear's client-facing execute grant so an authenticated
-- user can no longer call it directly to duplicate a starter set on a
-- character they already own. The function itself is left defined, just
-- no longer reachable from the client-facing RPC surface.

-- Review item 2 (Important) — create_character was SECURITY DEFINER
-- without a pinned search_path, unlike every other RPC in this task
-- (v1, in 20260731000000_items.sql, inherited this gap from the
-- pre-existing function it replaced). This CREATE OR REPLACE supersedes
-- v1 wholesale — identical body, with `set search_path = public` added
-- to the language clause below.
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

-- No longer called from create_character (inlined above); revoke its
-- client-facing execute grant so an authenticated user can't call it
-- directly to duplicate a starter set on a character they already own.
revoke all on function grant_starter_gear(uuid) from public;
revoke all on function grant_starter_gear(uuid) from authenticated;

-- Review item 1 (Important) — equip race / stat-duplication guard.
--
-- equip_item's body runs two UPDATEs per call: first null out whatever
-- currently occupies (p_character_id, p_slot), then set the target item
-- to occupy it. Those two statements target different rows for two
-- concurrent callers racing on the *same* (character, slot) with
-- *different* items — under READ COMMITTED there is no row-lock overlap
-- between "set item A's equipped_by/equipped_slot" and "set item B's
-- equipped_by/equipped_slot" (different rows), so nothing serializes the
-- two calls against each other. Both can independently complete their
-- "free the slot" step (no-op, since neither item held it yet) and then
-- both their "set the slot" step, leaving two items double-occupying one
-- equip position — a stat-duplication exploit once Task 3 wires
-- computeLoadout to sum every equipped item's stats.
--
-- This partial unique index is the guard: it makes the second commit of
-- any such race fail with a unique-violation instead of silently
-- succeeding. It's partial (`where equipped_by is not null`) because
-- stash items (equipped_by null, equipped_slot null) must not be
-- constrained against each other — a plain unique index on
-- (equipped_by, equipped_slot) would otherwise be satisfied by Postgres's
-- normal NULL-is-distinct-from-NULL semantics anyway, but the partial
-- form is explicit about the intent and keeps the index small (it only
-- ever indexes equipped rows).
--
-- The racing loser hits this index during its own "set the slot" UPDATE
-- (the second of equip_item's two statements) — not during the "free the
-- slot" step, which never violates uniqueness on its own (it only ever
-- sets equipped_by/equipped_slot to NULL, which the partial index
-- ignores). equip_item has no exception handler, so the raised
-- unique-violation propagates straight to the RPC caller as an error;
-- the client already reconciles its optimistic UI on any RPC error
-- (same pattern as the skill tree), so no client change is needed.
create unique index if not exists items_equipped_position
  on items (equipped_by, equipped_slot)
  where equipped_by is not null;

-- Review item 3 (Minor) — admin_grant_item accepted p_affixes
-- unvalidated. Admin already fully controls this RPC's other fields
-- (rarity, level_req, slot, class_restriction — see the design notes in
-- the task report), but a malformed affixes payload here would silently
-- corrupt data that computeLoadout (shared/src/items.ts) and
-- validateItemRow both assume is well-shaped, so this is defense in
-- depth rather than a new trust boundary. CREATE OR REPLACE with the
-- same signature as the base migration, adding shape checks before the
-- insert: p_affixes must be a jsonb array; each element an object whose
-- 'id' is one of the seven known affix ids and whose 'value' is a
-- positive number; 'talent' elements must additionally carry a
-- non-empty 'node' string.
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

    if not (v_elem ? 'value') or jsonb_typeof(v_elem -> 'value') <> 'number' or (v_elem ->> 'value')::numeric <= 0 then
      raise exception 'affix value must be a positive number';
    end if;

    if (v_elem ->> 'id') = 'talent' and (
      not (v_elem ? 'node') or jsonb_typeof(v_elem -> 'node') <> 'string' or length(trim(v_elem ->> 'node')) = 0
    ) then
      raise exception 'talent affix must include a non-empty node string';
    end if;
  end loop;

  insert into items (user_id, base_id, rarity, affixes, level_req, slot, class_restriction, source)
  values (p_user_id, p_base_id, p_rarity, v_affixes, p_level_req, p_slot, p_class_restriction, 'admin')
  returning id into v_item_id;

  return v_item_id;
end;
$$;

grant execute on function admin_grant_item(uuid, text, text, jsonb, integer, text, text) to authenticated;
