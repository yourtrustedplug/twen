-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to
-- production.
--
-- The base local schema restricts payouts.status to pending/processing/paid/
-- failed, but resolve_payout() (mirrored from PAYOUTS_OPS.sql / LAUNCH.sql)
-- writes "completed" and also checks for "queued". The admin "Mark paid"
-- action therefore fails on a fresh local database. Allow every status the
-- app and function use so the local ops flow is testable.

alter table public.payouts drop constraint if exists payouts_status_check;
alter table public.payouts
  add constraint payouts_status_check
  check (status in ('pending', 'processing', 'queued', 'completed', 'paid', 'failed'));
