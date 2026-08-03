-- Add 'gladiator' as a character class.
-- Mirrors 20260502000000_add_amazon_class.sql / 20260730010000_rename_amazon_to_ranger.sql.
--
-- Guard inventory (grep -rn "'mage'" supabase/migrations/), latest-definition-wins:
--   * characters.class check       -> latest: 20260730010000_rename_amazon_to_ranger.sql
--   * items.class_restriction check -> latest (only): 20260731000000_items.sql:21 (inline,
--     auto-named items_class_restriction_check by Postgres convention; confirmed against
--     the live project's pg_constraint, which reports exactly that name)
--   * create_character RPC          -> latest: 20260731030000_final_review_fixes.sql:38
--     (supersedes 20260502000000, 20260730010000, 20260731000000, 20260731010000 — all
--     earlier versions of this function)
--   * grant_starter_gear RPC        -> latest (only): 20260731000000_items.sql:157. Still
--     live (never dropped/re-created), just unreachable from `authenticated` since
--     20260731010000_items_fixes.sql revoked its client-facing execute grant when
--     create_character inlined the starter-gear insert. Re-emitted here for consistency
--     since the function object and its class-list body still exist.
--   * equip_item / admin_grant_item -> latest definitions (20260802000000_item_unique_id.sql)
--     contain no literal class list (equip_item compares item.class_restriction to
--     character.class dynamically; admin_grant_item's list is affix ids, not classes) —
--     not touched here.
--   * 20260502000000_add_amazon_class.sql's check + guard, and
--     20260730010000_rename_amazon_to_ranger.sql's intermediate widen-then-migrate-then-
--     tighten steps, are historical/superseded by later migrations in this same file list.
--
-- Confirmed against the live project (ulekuozamvhluojthxrh) via pg_get_functiondef /
-- pg_constraint before writing this file: create_character, grant_starter_gear,
-- equip_item, and admin_grant_item's live bodies are byte-identical to the latest local
-- migration files referenced above, so there is no drift between this worktree's
-- migration lineage and the deployed schema for the functions touched here.
--
-- No NOT NULL columns are added by this migration — only CHECK constraints (widened,
-- not tightened) and function-body edits.

-- 1. characters.class check
alter table characters drop constraint if exists characters_class_check;
alter table characters add constraint characters_class_check
  check (class in ('mage', 'ranger', 'gladiator'));

-- 2. items.class_restriction check
alter table items drop constraint if exists items_class_restriction_check;
alter table items add constraint items_class_restriction_check
  check (class_restriction is null or class_restriction in ('mage', 'ranger', 'gladiator'));

-- 3. create_character: verbatim from 20260731030000_final_review_fixes.sql, widening the
-- class guard and adding the gladiator starter weapon (iron_spear — shared/src/items.ts
-- confirms iron_spear is the itemLevel-1 gladiator-restricted weapon base, mirroring
-- apprentice_staff/short_bow). Signature unchanged (p_user_id uuid, p_name text,
-- p_class text) so CREATE OR REPLACE is safe; this function's ACL was never touched by a
-- DROP in its migration history, so no grant/revoke is re-emitted here.
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

  if p_class not in ('mage', 'ranger', 'gladiator') then
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
    when 'gladiator' then 'iron_spear'
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

-- 4. grant_starter_gear: verbatim from 20260731000000_items.sql, widening the class case
-- the same way. Signature unchanged (p_character_id uuid); its execute grant was revoked
-- from `authenticated`/`public` by 20260731010000_items_fixes.sql (not dropped, so
-- CREATE OR REPLACE here preserves that revoked ACL) — no grant is re-added.
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
    when 'gladiator' then 'iron_spear'
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

-- ============================================================================
-- Verification queries (comments only — run manually, not part of the migration)
-- ============================================================================

-- Coverage check: every live 'mage' guard/check should now appear in this file too.
-- (run from repo root)
--   grep -rn "'mage'" supabase/migrations/ | grep -v 20260803120000_add_gladiator_class.sql
-- Expected remaining hits, all historical/superseded, none live:
--   20260502000000_add_amazon_class.sql:18   -- superseded check, dropped by 20260730010000
--   20260502000000_add_amazon_class.sql:30   -- superseded create_character v1
--   20260730010000_rename_amazon_to_ranger.sql:7   -- intermediate widen-step check (superseded by :13 in the same file)
--   20260730010000_rename_amazon_to_ranger.sql:13  -- superseded check (widened again above)
--   20260730010000_rename_amazon_to_ranger.sql:25  -- superseded create_character v2
--   20260731000000_items.sql:21   -- superseded inline check (widened above)
--   20260731000000_items.sql:171  -- grant_starter_gear v1, superseded by this migration
--   20260731000000_items.sql:201  -- create_character v3 (in this file), superseded
--   20260731010000_items_fixes.sql:41   -- create_character v4 guard, superseded
--   20260731010000_items_fixes.sql:58   -- create_character v4 weapon-base case, superseded
--   20260731030000_final_review_fixes.sql:52  -- create_character v5 (the pre-this-migration latest), superseded above
--   20260731030000_final_review_fixes.sql:69  -- weapon-base case in the same superseded function

-- Post-apply manual checklist (run against a real authenticated session, not service role):
--   1. Create a gladiator character end-to-end from the UI (or via
--      supabase.rpc('create_character', { p_user_id, p_name, p_class: 'gladiator' })
--      as the authenticated user) and confirm it succeeds and grants an iron_spear.
--   2. Grant a spear via admin_grant_item (p_slot 'weapon', p_class_restriction
--      'gladiator') and equip_item it onto the gladiator character; confirm equip_item's
--      class_restriction check passes.
--   3. Confirm skill_unlocks accepts 'arms.jab' for the new gladiator character (via
--      unlock_skill_node / the skill tree UI).
--   4. One plain authenticated (non-service-role) SELECT per touched table:
--        select * from characters where user_id = auth.uid() limit 1;
--        select * from items where user_id = auth.uid() limit 1;
