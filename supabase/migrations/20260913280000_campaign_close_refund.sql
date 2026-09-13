-- Align funding floor with the 15-day UI, restore campaign close, and queue unused escrow for return.
-- Paste in Supabase → SQL Editor → Run. Safe to re-run.
-- Requires public.is_staff().

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
BEGIN
  SELECT brand_id, budget INTO v_brand_id, v_budget FROM campaigns WHERE id = p_campaign_id;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_brand_id <> auth.uid() THEN RAISE EXCEPTION 'Not your campaign'; END IF;
  IF v_budget <= 0 THEN RAISE EXCEPTION 'Budget must be positive'; END IF;
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

CREATE TABLE IF NOT EXISTS public.brand_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'queued', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id)
);

CREATE INDEX IF NOT EXISTS brand_refunds_status_idx
  ON public.brand_refunds (status, created_at DESC);

ALTER TABLE public.brand_refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.brand_refunds FROM anon, authenticated;
GRANT SELECT ON public.brand_refunds TO authenticated;
GRANT ALL ON public.brand_refunds TO service_role;

DROP POLICY IF EXISTS "Brands view own refunds" ON public.brand_refunds;
CREATE POLICY "Brands view own refunds"
  ON public.brand_refunds FOR SELECT TO authenticated
  USING (brand_id = auth.uid() OR public.is_staff());

CREATE OR REPLACE FUNCTION public.close_campaign(p_campaign_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_refund numeric;
  v_status text;
  v_deadline timestamptz;
BEGIN
  SELECT brand_id, funded_amount - spent_amount, status, deadline
    INTO v_brand_id, v_refund, v_status, v_deadline
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_brand_id THEN
    RAISE EXCEPTION 'Not your campaign';
  END IF;
  IF v_status = 'closed' THEN
    RETURN 0;
  END IF;
  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'Only funded campaigns can be closed';
  END IF;
  IF v_deadline IS NULL OR v_deadline >= ((timezone('utc', now()))::date) THEN
    RAISE EXCEPTION 'Campaigns close when the deadline passes. You can extend, not cancel early.';
  END IF;

  UPDATE campaigns
    SET status = 'closed', closed_at = now()
    WHERE id = p_campaign_id AND status = 'open';
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_refund > 0 THEN
    INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
      VALUES (v_brand_id, 'refund', p_campaign_id, v_refund, 'Unspent escrow returned when campaign ended');
    INSERT INTO brand_refunds (brand_id, campaign_id, amount, status)
      VALUES (v_brand_id, p_campaign_id, v_refund, 'pending')
      ON CONFLICT (campaign_id) DO NOTHING;
  END IF;

  RETURN greatest(coalesce(v_refund, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.close_campaign(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_campaign(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.close_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_campaign(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.close_expired_campaigns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM campaigns
    WHERE status = 'open'
      AND deadline IS NOT NULL
      AND deadline < ((timezone('utc', now()))::date)
  LOOP
    BEGIN
      PERFORM public.close_campaign(r.id);
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'close_campaign % failed: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.close_expired_campaigns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_expired_campaigns() FROM anon;
REVOKE ALL ON FUNCTION public.close_expired_campaigns() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_campaigns() TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_brand_refund(
  p_refund_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can resolve brand refunds';
  END IF;
  IF p_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'Status must be completed or failed';
  END IF;

  UPDATE public.brand_refunds
    SET status = p_status
  WHERE id = p_refund_id
    AND status IN ('pending', 'processing', 'queued');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found or already resolved';
  END IF;

  IF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    SELECT brand_id, 'refund_ops', campaign_id, 0,
           'Refund ' || p_status || ': ' || left(trim(p_note), 200)
    FROM brand_refunds WHERE id = p_refund_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_brand_refund(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_brand_refund(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_brand_refund(uuid, text, text) TO authenticated;

-- Queue returns for campaigns already closed without a refund row (verify-views used to close without money).
INSERT INTO public.brand_refunds (brand_id, campaign_id, amount, status)
SELECT c.brand_id, c.id, c.funded_amount - c.spent_amount, 'pending'
FROM public.campaigns c
WHERE c.status = 'closed'
  AND c.funded_amount - c.spent_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.brand_refunds r WHERE r.campaign_id = c.id
  );

INSERT INTO public.wallet_transactions (user_id, type, campaign_id, amount, description)
SELECT c.brand_id, 'refund', c.id, c.funded_amount - c.spent_amount,
       'Unspent escrow returned when campaign ended'
FROM public.campaigns c
WHERE c.status = 'closed'
  AND c.funded_amount - c.spent_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions t
    WHERE t.campaign_id = c.id AND t.type = 'refund'
  );
