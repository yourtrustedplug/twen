-- =============================================================================
-- Paste in Unignored SQL Editor if LAUNCH.sql was already applied earlier.
-- Makes Pro upgrade + payment refs replay-safe. Safe to re-run.
-- (Also included in current supabase/LAUNCH.sql)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirm_campaign_funding(
  p_campaign_id uuid,
  p_payment_ref text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_budget numeric;
  v_status text;
BEGIN
  SELECT brand_id, budget, status INTO v_brand_id, v_budget, v_status
  FROM campaigns WHERE id = p_campaign_id;

  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_status <> 'draft' THEN RETURN; END IF;
  IF v_budget <= 0 THEN RAISE EXCEPTION 'Budget must be positive'; END IF;

  IF p_payment_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns
    WHERE nardopay_payment_ref = p_payment_ref AND id <> p_campaign_id
  ) THEN
    RAISE EXCEPTION 'Payment ref already used';
  END IF;

  UPDATE campaigns
    SET status = 'open',
        funded_amount = budget,
        spent_amount = 0,
        started_at = now(),
        deadline = greatest(coalesce(deadline, now()), now() + interval '10 days'),
        nardopay_payment_ref = coalesce(p_payment_ref, nardopay_payment_ref)
    WHERE id = p_campaign_id AND status = 'draft';

  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (v_brand_id, 'campaign_funding', p_campaign_id, v_budget, 'Campaign funded via NardoPay');
  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (v_brand_id, 'escrow_hold', p_campaign_id, v_budget, 'Escrow hold for campaign');
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_campaign_funding(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_campaign_funding(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_campaign_funding(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_campaign_funding(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_plan_upgrade(
  p_user_id uuid,
  p_payment_ref text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_payment_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE plan_payment_ref = p_payment_ref AND id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Payment ref already used';
  END IF;

  UPDATE public.profiles
    SET plan = 'pro',
        plan_payment_ref = coalesce(p_payment_ref, plan_payment_ref)
  WHERE id = p_user_id
    AND plan IS DISTINCT FROM 'pro';
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_plan_upgrade(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_plan_upgrade(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_plan_upgrade(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_plan_upgrade(uuid, text) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_plan_payment_ref_uidx
  ON public.profiles (plan_payment_ref)
  WHERE plan_payment_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_nardopay_payment_ref_uidx
  ON public.campaigns (nardopay_payment_ref)
  WHERE nardopay_payment_ref IS NOT NULL;
