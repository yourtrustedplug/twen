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
