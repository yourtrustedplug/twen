-- Run in Supabase SQL editor: campaign niche + platforms for creator filters
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS niche text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS platforms jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS campaigns_niche_idx ON public.campaigns (niche)
  WHERE niche <> '';
