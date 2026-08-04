-- Vendor stock rotation: the vendor's 6 slots now rotate on staggered
-- 6-hour lifetimes (one turning over each UTC hour) instead of all six
-- swapping at midnight UTC. A purchase therefore marks a specific ITEM
-- OFFER as spent, not a (day, slot) coordinate: instance_key is
-- '<slotIndex>:<generation>:<band>', produced by shared/src/economy.ts's
-- vendorInstanceKey and used verbatim as that offer's rng seed suffix.
--
-- utc_day survives as a plain column because it still backs the unchanged
-- 6-purchases-per-UTC-day allowance — it just no longer identifies WHICH
-- offer was bought. A 6-hour slot can straddle midnight UTC, so a live
-- offer's purchase row may legitimately carry yesterday's utc_day.
--
-- Written to be idempotently re-runnable against an already-migrated live
-- DB, matching the other economy migrations.

alter table vendor_purchases add column if not exists instance_key text;

-- Pre-rotation rows have no offer identity to recover. 'legacy:' keys can
-- never collide with a live instance_key (which always starts with a
-- digit), so these rows keep counting toward their own day's allowance in
-- the historical record and can never mark a live slot SOLD.
update vendor_purchases
   set instance_key = 'legacy:' || utc_day::text || ':' || slot_index::text
 where instance_key is null;

alter table vendor_purchases alter column instance_key set not null;

-- Swap the primary key from (user_id, utc_day, slot_index) to
-- (user_id, instance_key). Dropping the PK drops its backing index too.
alter table vendor_purchases drop constraint if exists vendor_purchases_pkey;
alter table vendor_purchases add constraint vendor_purchases_pkey
  primary key (user_id, instance_key);

-- Backs the daily-allowance count, which the PK no longer serves.
create index if not exists vendor_purchases_user_day_idx
  on vendor_purchases (user_id, utc_day);

-- Before this migration, the PK (user_id, utc_day, slot_index) plus
-- slot_index's 0-5 range check made a 7th same-day row for one user
-- physically impossible. Re-keying the PK to (user_id, instance_key) above
-- removed that guarantee — instance_key admits ~24 distinct values per day
-- (one per hour per slot), not 6. daily_seq restores the invariant: it's
-- "which of today's (at most 6) purchases this is," independent of
-- instance_key, so a unique constraint on (user_id, utc_day, daily_seq)
-- once again makes a 7th row impossible, with the same 0-5 check
-- slot_index used to carry.
alter table vendor_purchases add column if not exists daily_seq int;

-- Pre-rotation rows had exactly one purchase per (user_id, utc_day,
-- slot_index) under the old PK, so slot_index was already unique per user
-- per day and already constrained to 0-5 — it is a valid daily_seq value
-- as-is.
update vendor_purchases
   set daily_seq = slot_index
 where daily_seq is null;

alter table vendor_purchases alter column daily_seq set not null;

alter table vendor_purchases drop constraint if exists vendor_purchases_daily_seq_check;
alter table vendor_purchases add constraint vendor_purchases_daily_seq_check
  check (daily_seq between 0 and 5);

alter table vendor_purchases drop constraint if exists vendor_purchases_user_day_seq_key;
alter table vendor_purchases add constraint vendor_purchases_user_day_seq_key
  unique (user_id, utc_day, daily_seq);
