-- =============================================================================
-- Twen — minimal OAuth tables for Connect TikTok / Instagram + verify-views
-- Paste in Supabase SQL Editor → Run. Safe to re-run.
-- (Full profile pack is supabase/PROFILE_ABOUT.sql if you want names/ID docs too.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  code_verifier text,
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_oauth_tokens (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform)
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_oauth_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.oauth_states FROM authenticated, anon;
REVOKE ALL ON public.creator_oauth_tokens FROM authenticated, anon;
GRANT ALL ON public.oauth_states TO service_role;
GRANT ALL ON public.creator_oauth_tokens TO service_role;
