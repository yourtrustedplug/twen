-- Ops payouts + lock free ledger funding (migration mirror of PAYOUTS_OPS.sql)

REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fund_campaign(uuid) TO service_role;

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
