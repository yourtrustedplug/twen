-- Paste in Supabase SQL editor.
-- Cache NardoPay checkout URLs so upgrade / fund buttons reuse one link.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nardopay_checkout_url text,
  ADD COLUMN IF NOT EXISTS nardopay_checkout_amount numeric,
  ADD COLUMN IF NOT EXISTS nardopay_link_code text;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS nardopay_checkout_url text,
  ADD COLUMN IF NOT EXISTS nardopay_checkout_amount numeric;
