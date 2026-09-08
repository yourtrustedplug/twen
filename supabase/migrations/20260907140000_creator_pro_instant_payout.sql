-- Mirror of LAUNCH.sql request_payout Pro hold skip + staff (see supabase/LAUNCH.sql for full paste)

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
