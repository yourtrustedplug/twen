-- Run in Supabase SQL editor: campaign cover image
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS cover_image text;
