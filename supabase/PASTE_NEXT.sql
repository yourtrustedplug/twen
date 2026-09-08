-- =============================================================================
-- Twen PASTE_NEXT — run once in Supabase SQL Editor (safe to re-run)
-- Includes: profile columns, OAuth tables, id-documents bucket, onboarding gates
-- =============================================================================

-- Creator profile: names, geo, Instagram, ID docs, OAuth state, verification guard.
-- Paste in Supabase → SQL Editor → Run. Safe to re-run.
-- Requires public.is_staff() from supabase/LAUNCH.sql (or ADMIN_STAFF.sql).

-- -----------------------------------------------------------------------------
-- Columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS continent text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_document_type text,
  ADD COLUMN IF NOT EXISTS id_document_path text,
  ADD COLUMN IF NOT EXISTS id_document_back_path text,
  ADD COLUMN IF NOT EXISTS rate_suggested numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate_overridden boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_document_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_document_type_check
  CHECK (id_document_type IS NULL OR id_document_type IN ('passport', 'national_id'));

-- Split existing full_name into first / last where missing
UPDATE public.profiles
SET
  first_name = COALESCE(NULLIF(btrim(first_name), ''), NULLIF(split_part(btrim(full_name), ' ', 1), '')),
  last_name = COALESCE(
    NULLIF(btrim(last_name), ''),
    NULLIF(btrim(regexp_replace(btrim(full_name), '^\S+\s*', '')), '')
  )
WHERE full_name IS NOT NULL AND btrim(full_name) <> '';

-- Split "City, Country" into city / country where missing
UPDATE public.profiles
SET
  city = COALESCE(NULLIF(btrim(city), ''), NULLIF(btrim(split_part(location, ',', 1)), '')),
  country = COALESCE(
    NULLIF(btrim(country), ''),
    NULLIF(btrim(substring(location from position(',' in location || ',') + 1)), '')
  )
WHERE COALESCE(location, '') <> '';

-- -----------------------------------------------------------------------------
-- Clients cannot self-verify. They may only move to pending / unverified.
-- Staff and service role (auth.uid() is null) can set verified / rejected.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_verification_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF NEW.id_verification_status IS DISTINCT FROM OLD.id_verification_status
       AND NEW.id_verification_status NOT IN ('unverified', 'pending') THEN
      RAISE EXCEPTION 'Cannot change verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_verification_guard ON public.profiles;
CREATE TRIGGER profiles_verification_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_verification_guard();

-- Staff can update any profile (ID review)
DROP POLICY IF EXISTS "Staff update profiles" ON public.profiles;
CREATE POLICY "Staff update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- OAuth (service role only — never expose tokens to the browser)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Private ID document bucket (owner + staff only)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owners read own id documents" ON storage.objects;
CREATE POLICY "Owners read own id documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff read id documents" ON storage.objects;
CREATE POLICY "Staff read id documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-documents' AND public.is_staff());

DROP POLICY IF EXISTS "Owners upload id documents" ON storage.objects;
CREATE POLICY "Owners upload id documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners update id documents" ON storage.objects;
CREATE POLICY "Owners update id documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners delete id documents" ON storage.objects;
CREATE POLICY "Owners delete id documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Onboarding gates (from ONBOARDING.sql)
-- =============================================================================

-- Gate campaigns and submissions behind a completed profile.
-- Paste in Supabase → SQL Editor after PROFILE_ABOUT.sql. Safe to re-run.

CREATE OR REPLACE FUNCTION public.profile_onboarding_complete(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = uid;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p.role IN ('moderator', 'admin') THEN
    RETURN true;
  END IF;

  IF p.role = 'brand' THEN
    RETURN
      coalesce(btrim(p.company_name), '') <> ''
      AND coalesce(btrim(p.first_name), '') <> ''
      AND coalesce(btrim(p.last_name), '') <> ''
      AND coalesce(btrim(p.city), '') <> ''
      AND coalesce(btrim(p.country), '') <> '';
  END IF;

  RETURN
    coalesce(btrim(p.first_name), '') <> ''
    AND coalesce(btrim(p.last_name), '') <> ''
    AND coalesce(btrim(p.city), '') <> ''
    AND coalesce(btrim(p.country), '') <> ''
    AND (
      p.tiktok_connected_at IS NOT NULL
      OR p.instagram_connected_at IS NOT NULL
      OR coalesce(btrim(p.tiktok_handle), '') <> ''
      OR coalesce(btrim(p.instagram_handle), '') <> ''
    )
    AND p.id_verification_status IN ('pending', 'verified');
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_campaign_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.profile_onboarding_complete(NEW.brand_id) THEN
    RAISE EXCEPTION 'Complete your brand profile before creating a campaign';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_require_onboarding ON public.campaigns;
CREATE TRIGGER campaigns_require_onboarding
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_campaign_onboarding();

CREATE OR REPLACE FUNCTION public.guard_submission_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.profile_onboarding_complete(NEW.creator_id) THEN
    RAISE EXCEPTION 'Complete your creator profile before submitting';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_require_onboarding ON public.submissions;
CREATE TRIGGER submissions_require_onboarding
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_submission_onboarding();

-- Callable for health checks / staff tooling; triggers use SECURITY DEFINER.
GRANT EXECUTE ON FUNCTION public.profile_onboarding_complete(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.profile_onboarding_complete(uuid) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- VERIFY_SUBMISSION — platform proof columns + block client INSERT
-- =============================================================================
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS platform_media_id text,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS submissions_platform_media_uidx
  ON public.submissions (platform, platform_media_id)
  WHERE platform_media_id IS NOT NULL;

DROP POLICY IF EXISTS "Creators manage their own submissions" ON public.submissions;

DROP POLICY IF EXISTS "Creators view own submissions" ON public.submissions;
CREATE POLICY "Creators view own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators update own open submissions" ON public.submissions;

REVOKE INSERT ON public.submissions FROM authenticated;
GRANT SELECT ON public.submissions TO authenticated;
