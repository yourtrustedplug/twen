-- =============================================================================
-- Unignored — paste AFTER LAUNCH.sql to verify security grants / RPCs exist.
-- Read-only checks. Expected: each query returns true / expected rows.
-- =============================================================================

-- Staff helper
SELECT public.is_staff(NULL) IS NOT NULL AS has_is_staff;

-- Funding RPCs exist and are service_role only (has_privilege for current role may vary)
SELECT
  (to_regprocedure('public.confirm_campaign_funding(uuid,text)') IS NOT NULL) AS has_confirm_funding,
  (to_regprocedure('public.confirm_plan_upgrade(uuid,text)') IS NOT NULL) AS has_confirm_plan,
  (to_regprocedure('public.request_payout(numeric,text,text)') IS NOT NULL) AS has_request_payout;

-- Legacy fund_campaign is removed (or at minimum not executable by clients).
SELECT CASE
  WHEN to_regprocedure('public.fund_campaign(uuid)') IS NULL THEN true
  ELSE NOT has_function_privilege('authenticated', 'public.fund_campaign(uuid)', 'EXECUTE')
END AS fund_campaign_removed;

-- Campaign writes: no client delete, no anon extend, and the money/status guard is installed.
SELECT
  has_table_privilege('authenticated', 'public.campaigns', 'DELETE') AS authenticated_can_delete_campaigns,
  has_function_privilege('anon', 'public.extend_campaign(uuid,integer)', 'EXECUTE') AS anon_can_extend_campaign,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'campaigns_guard'
      AND tgrelid = 'public.campaigns'::regclass
      AND NOT tgisinternal
  ) AS has_campaigns_guard,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'profiles_insert_guard'
      AND tgrelid = 'public.profiles'::regclass
      AND NOT tgisinternal
  ) AS has_profiles_insert_guard;
-- Expect: false, false, true, true

-- Money / role columns present
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'nardopay_payment_ref'
  ) AS has_nardopay_payment_ref,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan'
  ) AS has_plan,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_payment_ref'
  ) AS has_plan_payment_ref;

SELECT
  (to_regclass('public.profiles_plan_payment_ref_uidx') IS NOT NULL) AS has_plan_payment_ref_uidx,
  (to_regclass('public.campaigns_nardopay_payment_ref_uidx') IS NOT NULL) AS has_campaign_payment_ref_uidx;

-- Payouts: authenticated should not have INSERT
SELECT has_table_privilege('authenticated', 'public.payouts', 'INSERT') AS authenticated_can_insert_payouts;
-- Expect: false

-- Launch hardening additions
SELECT
  (to_regclass('public.client_errors') IS NOT NULL) AS has_client_errors,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_messages' AND column_name = 'ip_hash'
  ) AS has_contact_ip_hash,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'campaign-assets') AS campaign_assets_limit,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'id-documents') AS id_documents_limit;
-- Expect: true, true, 52428800, 15728640
