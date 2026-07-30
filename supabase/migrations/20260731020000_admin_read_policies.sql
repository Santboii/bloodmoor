-- Task 6 fix-round follow-up: admin-read SELECT policies for `profiles` and
-- `characters`, mirroring `items_admin_read` from 20260731000000_items.sql.
--
-- Without these, Postgres RLS (default-deny) leaves both tables at
-- owner-row-only SELECT (`"Users can read own profile"` /
-- `"Users can read own characters"`, both predating tracked migrations —
-- see docs/superpowers/plans/2026-04-18-skill-tree-phase1.md and
-- 2026-04-24-character-creation.md). That silently blocks the admin
-- screen's cross-account reads: `adminFetchUsernames`/
-- `adminFindUserByUsername` (client/src/supabase.ts) can only ever resolve
-- the calling admin's own row, and the Grant tab's "target any account by
-- username" lookup is non-functional for every other account as a result.
--
-- These policies are additive (Postgres SELECT policies are OR'd together),
-- so the existing owner-read policies are untouched — an admin gets the
-- union of "own row" and "every row, because is_admin".
--
-- Column-level restriction is not expressible through a row-security
-- policy — RLS gates which ROWS are visible, not which COLUMNS of a
-- visible row are selectable. `profiles_admin_read` therefore makes every
-- column of every profiles row visible to an admin caller, `email`
-- included if such a column ever exists on `profiles`. Today it doesn't:
-- email lives in Supabase's separate `auth.users` table, which no
-- client-side query in this repo touches (grepped `client/src` for
-- `email` — zero matches outside two comments explicitly noting this).
-- The actual guarantee that emails are never exposed is therefore
-- enforced by client code discipline (never `select`ing an email column),
-- not by this policy — flagging so that guarantee isn't silently assumed
-- to be a database-level one if `profiles` ever grows an email column.

create policy profiles_admin_read on profiles for select
  using (exists (select 1 from profiles admin_check
                 where admin_check.user_id = auth.uid() and admin_check.is_admin));

create policy characters_admin_read on characters for select
  using (exists (select 1 from profiles where user_id = auth.uid() and is_admin));
