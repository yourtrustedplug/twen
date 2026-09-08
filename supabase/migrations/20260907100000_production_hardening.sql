-- Production hardening: lock role/plan, lock submission money fields, fix payout hold.
-- Run in Supabase SQL editor after pending feature migrations.

-- 1) Users cannot escalate role or plan
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

-- 2) Creators cannot edit verified_views / earnings
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

-- 3) Payouts only after campaign closed + 7 days
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
BEGIN
  SELECT coalesce(sum(amount), 0) INTO v_withdrawn
  FROM payouts
  WHERE creator_id = auth.uid() AND status <> 'failed';

  SELECT coalesce(sum(e.amount), 0) INTO v_available
  FROM earnings e
  JOIN campaigns c ON c.id = e.campaign_id
  WHERE e.creator_id = auth.uid()
    AND c.closed_at IS NOT NULL
    AND c.closed_at + interval '7 days' <= now();

  v_available := v_available - v_withdrawn;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_amount > v_available THEN RAISE EXCEPTION 'Amount exceeds released balance'; END IF;

  INSERT INTO payouts (creator_id, amount, provider, phone)
  VALUES (auth.uid(), p_amount, p_provider, p_phone)
  RETURNING id INTO v_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description)
  VALUES (auth.uid(), 'payout_debit', p_amount, 'Withdrawal request to ' || p_provider);

  RETURN v_id;
END;
$$;

-- 4) Promote a moderator (replace UUID)
-- UPDATE public.profiles SET role = 'moderator' WHERE id = '<your-user-uuid>';
