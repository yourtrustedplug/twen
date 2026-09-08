-- Ops payouts + lock free ledger funding
-- Paste in Supabase SQL Editor (Unignored)

-- 1) Brands must fund via NardoPay checkout → webhook (confirm_campaign_funding)
REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fund_campaign(uuid) FROM authenticated;
-- Keep for service_role only (emergency/admin tools)
GRANT EXECUTE ON FUNCTION public.fund_campaign(uuid) TO service_role;

-- 2) Clients must not INSERT payouts directly — only via request_payout RPC
REVOKE INSERT ON public.payouts FROM authenticated;
REVOKE UPDATE ON public.payouts FROM authenticated;

DROP POLICY IF EXISTS "Staff view all payouts" ON public.payouts;
CREATE POLICY "Staff view all payouts"
ON public.payouts FOR SELECT TO authenticated
USING (public.is_staff());

-- 3) Staff mark payouts completed/failed after sending MoMo manually
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
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_payout(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_payout(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_payout(uuid, text, text) TO authenticated;
