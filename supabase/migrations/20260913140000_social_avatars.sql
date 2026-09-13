-- Profile photos from connected TikTok / Instagram accounts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tiktok_avatar_url text,
  ADD COLUMN IF NOT EXISTS instagram_avatar_url text;
