-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to production.
--
-- The production profiles table already had plan_payment_ref (from LAUNCH.sql /
-- PATCH_PAYMENT_IDEMPOTENCY.sql). The historical migration chain references it
-- before any migration adds it, so add it for a fresh local database.

alter table public.profiles
  add column if not exists plan_payment_ref text;
