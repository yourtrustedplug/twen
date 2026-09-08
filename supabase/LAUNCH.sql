-- =============================================================================
-- Unignored LAUNCH SQL — paste once in Supabase SQL Editor (Unignored project)
-- Safe to re-run. Prerequisite: base schema (PASTE_ME.sql or prior migrations).
-- =============================================================================

-- 0) Staff roles (admin = moderator)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('creator', 'brand', 'moderator', 'admin'));

CREATE OR REPLACE FUNCTION public.is_staff(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role IN ('moderator', 'admin')
  );
$$;

DROP POLICY IF EXISTS "Moderators view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Staff view all submissions" ON public.submissions;
CREATE POLICY "Staff view all submissions"
ON public.submissions FOR SELECT TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "Moderators review submissions" ON public.submissions;
DROP POLICY IF EXISTS "Staff review submissions" ON public.submissions;
CREATE POLICY "Staff review submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Moderators view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Staff view campaigns" ON public.campaigns;
CREATE POLICY "Staff view campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "Staff view all profiles" ON public.profiles;
CREATE POLICY "Staff view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_staff());

CREATE OR REPLACE FUNCTION public.submissions_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
      RAISE EXCEPTION 'Only staff can change submission status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_status_guard ON public.submissions;
CREATE TRIGGER submissions_status_guard
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.submissions_status_guard();

-- A) NardoPay funding
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

-- B) Pro plan upgrade
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_payment_ref text;

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

  -- Idempotent: already-pro users are a no-op (replay-safe)
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

-- C) Lock free ledger funding + payout ops
DO $$
BEGIN
  IF to_regprocedure('public.fund_campaign(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.fund_campaign(uuid) TO service_role;
  END IF;
END $$;

REVOKE INSERT ON public.payouts FROM authenticated;
REVOKE UPDATE ON public.payouts FROM authenticated;

DROP POLICY IF EXISTS "Staff view all payouts" ON public.payouts;
CREATE POLICY "Staff view all payouts"
ON public.payouts FOR SELECT TO authenticated
USING (public.is_staff());

CREATE OR REPLACE FUNCTION public.resolve_payout(
  p_payout_id uuid,
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
    RAISE EXCEPTION 'Only staff can resolve payouts';
  END IF;
  IF p_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'Status must be completed or failed';
  END IF;

  UPDATE public.payouts
    SET status = p_status
  WHERE id = p_payout_id
    AND status IN ('pending', 'processing', 'queued');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found or already resolved';
  END IF;

  IF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO wallet_transactions (user_id, type, amount, description)
    SELECT creator_id, 'payout_debit', 0,
           'Payout ' || p_status || ': ' || left(trim(p_note), 200)
    FROM payouts WHERE id = p_payout_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_payout(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_payout(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_payout(uuid, text, text) TO authenticated;

-- D) Hardening + Creator Pro instant payout (skip 7-day hold when plan = pro)
CREATE OR REPLACE FUNCTION public.profiles_immutable_privs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Cannot change plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_immutable_privs ON public.profiles;
CREATE TRIGGER profiles_immutable_privs
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_immutable_privs();

CREATE OR REPLACE FUNCTION public.submissions_money_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.creator_id THEN
    IF NEW.verified_views IS DISTINCT FROM OLD.verified_views
       OR NEW.earnings IS DISTINCT FROM OLD.earnings THEN
      RAISE EXCEPTION 'Creators cannot change verified_views or earnings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_money_guard ON public.submissions;
CREATE TRIGGER submissions_money_guard
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.submissions_money_guard();

CREATE OR REPLACE FUNCTION public.request_payout(p_amount numeric, p_provider text, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_withdrawn numeric;
  v_available numeric;
  v_id uuid;
  v_is_pro boolean;
BEGIN
  SELECT coalesce(plan, 'free') = 'pro' INTO v_is_pro
  FROM profiles WHERE id = auth.uid();

  SELECT coalesce(sum(amount), 0) INTO v_withdrawn
  FROM payouts
  WHERE creator_id = auth.uid() AND status <> 'failed';

  SELECT coalesce(sum(e.amount), 0) INTO v_available
  FROM earnings e
  JOIN campaigns c ON c.id = e.campaign_id
  WHERE e.creator_id = auth.uid()
    AND c.closed_at IS NOT NULL
    AND (
      v_is_pro
      OR c.closed_at + interval '7 days' <= now()
    );

  v_available := v_available - v_withdrawn;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_amount > v_available THEN RAISE EXCEPTION 'Amount exceeds released balance'; END IF;

  INSERT INTO payouts (creator_id, amount, provider, phone)
  VALUES (auth.uid(), p_amount, p_provider, p_phone)
  RETURNING id INTO v_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description)
  VALUES (
    auth.uid(),
    'payout_debit',
    p_amount,
    CASE WHEN v_is_pro
      THEN 'Creator Pro instant withdrawal to ' || p_provider
      ELSE 'Withdrawal request to ' || p_provider
    END
  );

  RETURN v_id;
END;
$$;

-- Promote an admin after first signup (replace UUID):
-- ALTER TABLE public.profiles DISABLE TRIGGER profiles_immutable_privs;
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
-- ALTER TABLE public.profiles ENABLE TRIGGER profiles_immutable_privs;
