-- Next plan charge date for My Profile → Billing.
-- Paste in Supabase → SQL Editor → Run. Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_renews_at timestamptz;

UPDATE public.profiles
SET plan_renews_at = updated_at + interval '1 month'
WHERE plan = 'pro'
  AND plan_renews_at IS NULL;

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
        plan_payment_ref = coalesce(p_payment_ref, plan_payment_ref),
        plan_renews_at = coalesce(plan_renews_at, now() + interval '1 month')
  WHERE id = p_user_id
    AND plan IS DISTINCT FROM 'pro';
END;
$$;
