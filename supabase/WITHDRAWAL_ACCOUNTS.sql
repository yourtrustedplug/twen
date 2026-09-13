-- Withdrawal accounts: country + payout method destination for creator payouts.
-- Paste in Supabase → SQL Editor → Run. Safe to re-run.
-- Requires public.is_staff().

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT '';

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%payout_provider%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.payouts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%provider%'
  LOOP
    EXECUTE format('ALTER TABLE public.payouts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.withdrawal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country text NOT NULL,
  method text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id)
);

CREATE INDEX IF NOT EXISTS withdrawal_accounts_creator_idx
  ON public.withdrawal_accounts (creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_accounts TO authenticated;
GRANT ALL ON public.withdrawal_accounts TO service_role;

ALTER TABLE public.withdrawal_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage their withdrawal account" ON public.withdrawal_accounts;
CREATE POLICY "Creators manage their withdrawal account"
  ON public.withdrawal_accounts FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Staff view withdrawal accounts" ON public.withdrawal_accounts;
CREATE POLICY "Staff view withdrawal accounts"
  ON public.withdrawal_accounts FOR SELECT TO authenticated
  USING (public.is_staff());

INSERT INTO public.withdrawal_accounts (creator_id, country, method, account_number)
SELECT
  p.id,
  p.country,
  p.payout_provider,
  p.payout_number
FROM public.profiles p
WHERE p.role = 'creator'
  AND coalesce(p.payout_provider, '') <> ''
  AND coalesce(p.payout_number, '') <> ''
  AND coalesce(p.country, '') <> ''
ON CONFLICT (creator_id) DO NOTHING;

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
  v_country text;
  v_provider text;
  v_phone text;
BEGIN
  SELECT coalesce(plan, 'free') = 'pro' INTO v_is_pro
  FROM profiles WHERE id = auth.uid();

  SELECT country, method, account_number
    INTO v_country, v_provider, v_phone
  FROM withdrawal_accounts
  WHERE creator_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set up a withdrawal account first';
  END IF;

  -- Saved account is the destination. Incoming provider/phone are ignored.
  v_country := coalesce(v_country, '');

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

  INSERT INTO payouts (creator_id, amount, provider, phone, country)
  VALUES (auth.uid(), p_amount, v_provider, v_phone, v_country)
  RETURNING id INTO v_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description)
  VALUES (
    auth.uid(),
    'payout_debit',
    p_amount,
    CASE WHEN v_is_pro
      THEN 'Creator Pro instant withdrawal to ' || v_provider
      ELSE 'Withdrawal request to ' || v_provider
    END
  );

  RETURN v_id;
END;
$$;
