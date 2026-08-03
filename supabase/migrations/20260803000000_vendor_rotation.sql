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
