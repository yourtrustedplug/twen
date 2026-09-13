-- Reuse one NardoPay checkout URL per plan / campaign instead of minting a new link on every click.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nardopay_checkout_url text,
  ADD COLUMN IF NOT EXISTS nardopay_checkout_amount numeric,
  ADD COLUMN IF NOT EXISTS nardopay_link_code text;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS nardopay_checkout_url text,
  ADD COLUMN IF NOT EXISTS nardopay_checkout_amount numeric;
