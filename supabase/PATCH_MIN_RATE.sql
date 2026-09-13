-- Campaign floors: $1 per 1,000 views, and a $10 fund on create.
-- Paste in Supabase → SQL Editor → Run. Safe to re-run.
-- Existing campaigns below the floors stay as-is (view accrual still works).
-- New inserts / rate or budget edits cannot go below the floors. Under-floor drafts cannot be funded.

CREATE OR REPLACE FUNCTION public.enforce_min_rate_per_1k()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rate_per_1k IS NULL OR NEW.rate_per_1k < 1 THEN
    RAISE EXCEPTION 'Rate must be at least $1.00 per 1,000 views';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_min_rate_per_1k ON public.campaigns;
CREATE TRIGGER campaigns_min_rate_per_1k
  BEFORE INSERT OR UPDATE OF rate_per_1k ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_min_rate_per_1k();

CREATE OR REPLACE FUNCTION public.enforce_min_campaign_budget()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.budget IS NULL OR NEW.budget < 10 THEN
    RAISE EXCEPTION 'Budget is too low';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_min_budget ON public.campaigns;
CREATE TRIGGER campaigns_min_budget
  BEFORE INSERT OR UPDATE OF budget ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_min_campaign_budget();

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
  v_rate numeric;
BEGIN
  SELECT brand_id, budget, status, rate_per_1k
    INTO v_brand_id, v_budget, v_status, v_rate
    FROM campaigns WHERE id = p_campaign_id;

  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_status <> 'draft' THEN RETURN; END IF;
  IF coalesce(v_budget, 0) < 10 THEN RAISE EXCEPTION 'Budget is too low'; END IF;
  IF coalesce(v_rate, 0) < 1 THEN
    RAISE EXCEPTION 'Rate must be at least $1.00 per 1,000 views';
  END IF;

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
        deadline = greatest(coalesce(deadline, now()), now() + interval '15 days'),
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

CREATE OR REPLACE FUNCTION public.fund_campaign(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_budget numeric;
  v_rate numeric;
BEGIN
  SELECT brand_id, budget, rate_per_1k
    INTO v_brand_id, v_budget, v_rate
    FROM campaigns WHERE id = p_campaign_id;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_brand_id <> auth.uid() THEN RAISE EXCEPTION 'Not your campaign'; END IF;
  IF coalesce(v_budget, 0) < 10 THEN RAISE EXCEPTION 'Budget is too low'; END IF;
  IF coalesce(v_rate, 0) < 1 THEN
    RAISE EXCEPTION 'Rate must be at least $1.00 per 1,000 views';
  END IF;
  UPDATE campaigns
    SET status = 'open',
        funded_amount = budget,
        spent_amount = 0,
        started_at = now(),
        deadline = greatest(coalesce(deadline, now()), now() + interval '15 days')
    WHERE id = p_campaign_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign is not in draft state'; END IF;
  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (auth.uid(), 'campaign_funding', p_campaign_id, v_budget, 'Campaign funded (escrow)');
  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (auth.uid(), 'escrow_hold', p_campaign_id, v_budget, 'Escrow hold for campaign');
END;
$$;
