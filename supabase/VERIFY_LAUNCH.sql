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

-- fund_campaign must NOT be executable by authenticated (should be false for authenticated)
SELECT has_function_privilege('authenticated', 'public.fund_campaign(uuid)', 'EXECUTE') AS authenticated_can_fund_campaign;
-- Expect: false

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
