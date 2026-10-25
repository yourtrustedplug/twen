-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to
-- production.
--
-- resolve_brand_refund() (from PATCH_CAMPAIGN_CLOSE.sql / LAUNCH.sql) writes a
-- zero-value wallet transaction with type 'refund_ops' for the audit note.
-- The base local schema only allows the five original types, so admin
-- "Mark returned" fails on a fresh local database. Allow the audit type.

alter table public.wallet_transactions drop constraint if exists wallet_transactions_type_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
  check (type in (
    'campaign_funding',
    'escrow_hold',
    'refund',
    'refund_ops',
    'earnings_credit',
    'payout_debit'
  ));
