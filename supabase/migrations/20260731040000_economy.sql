-- Economy Phase 2: gold, selling, vendor purchase tracking, match gold
-- crediting. Ownership convention unchanged from 20260731000000_items.sql:
-- profiles.user_id is the FK to auth.users, so ownership checks below read
-- profiles.user_id = auth.uid() / items.user_id = auth.uid(), never
-- profiles.id.

alter table profiles add column if not exists gold integer not null default 0 check (gold >= 0);

-- vendor_purchases: one row per (account, UTC day, vendor slot) marks that
-- slot as bought. Task 3 (game server) re-derives the day's 6 slots
-- deterministically via shared vendorStockFor and consults this table to
-- annotate/reject already-purchased slots — the row itself carries no item
-- data, it is purely a "this slot is spent today" marker. Rows are only
-- ever inserted by the game server's service-role client (which bypasses
-- RLS entirely), never by an authenticated client directly, so there is no
-- insert/update/delete policy here — only owner-read.
create table if not exists vendor_purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  utc_day date not null,
  slot_index int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, utc_day, slot_index)
);

alter table vendor_purchases enable row level security;

drop policy if exists vendor_purchases_owner_read on vendor_purchases;
create policy vendor_purchases_owner_read on vendor_purchases for select
  using (user_id = auth.uid());

-- vendorStockFor always produces exactly 6 slots (indices 0..5) — this
-- constraint is added via drop-then-add (Postgres has no `ADD CONSTRAINT
-- IF NOT EXISTS`) so the migration stays idempotently re-runnable against
-- an already-migrated live DB.
alter table vendor_purchases drop constraint if exists vendor_purchases_slot_index_check;
alter table vendor_purchases add constraint vendor_purchases_slot_index_check check (slot_index between 0 and 5);

-- sell_price: SQL mirror of shared/src/economy.ts's SELL_PRICES table
-- (rarity x item-level band [1, 4, 7, 10]). This exact CASE table is
-- drift-tested against the TS literal in server/tests/economy.test.ts (a
-- regex parses these five WHEN clauses per rarity), so the values below
-- must be edited in lockstep with SELL_PRICES if they ever change.
-- Bespoke levels between bands round DOWN to the nearest band, matching
-- shared's bandIndexForLevel.
create or replace function sell_price(p_rarity text, p_level_req int) returns int
language sql immutable set search_path = public as $$
  select case p_rarity
    when 'basic'  then case when p_level_req >= 10 then 25   when p_level_req >= 7 then 15   when p_level_req >= 4 then 10   else 5    end
    when 'magic'  then case when p_level_req >= 10 then 90   when p_level_req >= 7 then 60   when p_level_req >= 4 then 40   else 25   end
    when 'rare'   then case when p_level_req >= 10 then 320  when p_level_req >= 7 then 220  when p_level_req >= 4 then 150  else 100  end
    when 'unique' then case when p_level_req >= 10 then 1000 when p_level_req >= 7 then 750  when p_level_req >= 4 then 550  else 400  end
  end;
$$;

-- sell_item: caller must own the item, it must be unequipped, and it must
-- not be starter gear (Phase 2 precondition 1 — enforced here, not just
-- hidden in UI). Deletes the item, credits the sell price to the caller's
-- gold, and returns the price so the client can show it without a
-- follow-up read.
--
-- `select ... for update` locks the row for the rest of this transaction:
-- a second concurrent call on the same item blocks here until the first
-- call's DELETE commits, then finds zero matching rows and falls into the
-- `not found` branch below instead of re-validating a row that's already
-- gone — closing the race where two concurrent sells both pass validation,
-- one deletes, and the other's DELETE silently no-ops but still credits
-- gold (double-sold item, double gold). The `if not found` check after the
-- DELETE itself is a second, independent guard against the same failure
-- mode (defense in depth, not load-bearing given the lock above).
create or replace function sell_item(p_item_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_item items%rowtype;
  v_price int;
begin
  select * into v_item from items where id = p_item_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'item not found or not owned by caller';
  end if;

  if v_item.equipped_by is not null then
    raise exception 'item is equipped and cannot be sold';
  end if;

  if v_item.source = 'starter' then
    raise exception 'starter gear cannot be sold';
  end if;

  v_price := sell_price(v_item.rarity, v_item.level_req);

  delete from items where id = p_item_id;
  if not found then
    raise exception 'item was already sold';
  end if;

  update profiles set gold = gold + v_price where user_id = auth.uid();

  return v_price;
end;
$$;

grant execute on function sell_item(uuid) to authenticated;

-- spend_gold: atomic debit — the WHERE clause's `gold >= p_amount` makes the
-- check-and-update a single statement, so two concurrent spends can't both
-- read a stale balance and double-spend it. Task 3's game server calls
-- this with the buyer's own JWT (a per-request PostgREST client, not the
-- server's service-role client) so auth.uid() resolves to the buyer —
-- gold debits are never computed/asserted by the server's own math.
create or replace function spend_gold(p_amount int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then
    raise exception 'p_amount must be positive';
  end if;

  update profiles set gold = gold - p_amount
  where user_id = auth.uid() and gold >= p_amount;

  if not found then
    raise exception 'insufficient gold';
  end if;
end;
$$;

grant execute on function spend_gold(int) to authenticated;

-- credit_match_result v2: CREATE OR REPLACE of the pre-existing RPC
-- (predates tracked migrations; current definition and XP/level-up
-- behavior sourced from docs/superpowers/plans/2026-04-24-character-creation.md
-- Step 6, verbatim below except for the additions noted). Called by the
-- game server via its service-role client (server/src/skills/loadSkills.ts
-- creditMatchResult), so — like the original — it trusts p_user_id/
-- p_character_id rather than checking auth.uid() (auth.uid() is NULL under
-- a service-role call; this is the server's own trusted path, not a
-- client-facing one). Additions here: `set search_path = public` (the
-- original had none, unlike every other DEFINER RPC in this schema — same
-- hardening already applied to create_character in
-- 20260731010000_items_fixes.sql), and a new `p_gold` parameter (default 0,
-- sanity-bounded to the plan's 0..200 match-reward range) credited to the
-- profile alongside the existing XP/level-up/match-stat updates, which are
-- otherwise unchanged.
--
-- The 4-arg overload (p_user_id, p_character_id, p_won, p_xp) predates this
-- migration and is NOT superseded by a bare CREATE OR REPLACE, since adding
-- a parameter changes the signature — Postgres treats it as a distinct
-- overload rather than a replacement, so both would coexist and the
-- server's existing (unchanged) 4-arg call site would keep resolving to
-- the stale, unpinned, gold-blind original. Drop it explicitly first;
-- `p_gold integer default 0` below lets that same 4-arg call site resolve
-- to this 5-arg function instead once the old overload is gone.
drop function if exists credit_match_result(uuid, uuid, boolean, integer);

create or replace function credit_match_result(
  p_user_id uuid,
  p_character_id uuid,
  p_won boolean,
  p_xp integer,
  p_gold integer default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_char characters%rowtype;
  v_new_level integer;
  v_new_xp integer;
  v_levels_gained integer;
  v_threshold integer;
begin
  if p_gold < 0 or p_gold > 200 then
    raise exception 'p_gold out of sane range (0..200)';
  end if;

  select * into v_char from characters
  where id = p_character_id and user_id = p_user_id;

  if not found then
    raise exception 'Character not found';
  end if;

  -- Compute level-ups
  v_new_level := v_char.level;
  v_new_xp := v_char.xp + p_xp;
  v_levels_gained := 0;

  loop
    v_threshold := floor(100 * power(v_new_level, 1.5))::integer;
    exit when v_new_xp < v_threshold;
    v_new_xp := v_new_xp - v_threshold;
    v_new_level := v_new_level + 1;
    v_levels_gained := v_levels_gained + 1;
  end loop;

  update characters set
    xp = v_new_xp,
    level = v_new_level,
    skill_points_available = skill_points_available + v_levels_gained,
    skill_points_total = skill_points_total + v_levels_gained
  where id = p_character_id;

  update profiles set
    matches_played = matches_played + 1,
    matches_won = case when p_won then matches_won + 1 else matches_won end,
    gold = gold + p_gold
  where user_id = p_user_id;

  return jsonb_build_object(
    'xpGained', p_xp,
    'levelsGained', v_levels_gained,
    'newLevel', v_new_level,
    'newXp', v_new_xp
  );
end;
$$;

-- No `grant execute ... to authenticated` here, unlike the RPCs above:
-- this function trusts p_user_id/p_character_id verbatim (see note above)
-- specifically because its only real caller is the game server's
-- service-role client, which never needed an explicit grant — service_role
-- already has implicit execute access via its own default privileges, and
-- it is never explicitly granted anywhere else in this schema either. A
-- client-facing grant here would let any signed-in user call this RPC
-- directly to credit arbitrary gold/XP/level-ups to any account, repeatedly.
-- Supabase's default privileges grant EXECUTE to authenticated/anon on
-- every newly created function, so the absence of a grant line is not
-- itself sufficient — revoke explicitly, and re-revoke on every re-run
-- (REVOKE is a no-op, never an error, when the privilege isn't held).
revoke execute on function credit_match_result(uuid, uuid, boolean, integer, integer) from public, authenticated, anon;
