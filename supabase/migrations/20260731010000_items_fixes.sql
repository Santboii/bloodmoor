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
$$ language plpgsql security definer;

-- No longer called from create_character (inlined above); revoke its
-- client-facing execute grant so an authenticated user can't call it
-- directly to duplicate a starter set on a character they already own.
revoke all on function grant_starter_gear(uuid) from public;
revoke all on function grant_starter_gear(uuid) from authenticated;
