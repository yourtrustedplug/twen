-- NardoPay funding columns + confirm RPC
-- Same as supabase/NARDOPAY_FUNDING.sql (for migration history)

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS nardopay_link_code text,
  ADD COLUMN IF NOT EXISTS nardopay_payment_ref text;

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
  IF v_status <> 'draft' THEN
    RETURN;
  END IF;
  IF v_budget <= 0 THEN RAISE EXCEPTION 'Budget must be positive'; END IF;

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
