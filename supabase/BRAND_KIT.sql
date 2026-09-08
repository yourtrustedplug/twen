-- Brand kit: colors, logos, website, socials. Updates onboarding gate.
-- Paste in Supabase → SQL Editor after ONBOARDING.sql. Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_primary_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_secondary_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS brand_socials jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS brand_kit jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_brand_primary_color_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_brand_primary_color_check
  CHECK (brand_primary_color = '' OR brand_primary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_brand_secondary_color_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_brand_secondary_color_check
  CHECK (brand_secondary_color = '' OR brand_secondary_color ~ '^#[0-9A-Fa-f]{6}$');

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
      AND coalesce(btrim(p.country), '') <> ''
      AND coalesce(btrim(p.avatar_url), '') <> ''
      AND p.brand_primary_color ~ '^#[0-9A-Fa-f]{6}$'
      AND coalesce(btrim(p.website), '') <> ''
      AND (
        coalesce(btrim(p.brand_socials->>'tiktok'), '') <> ''
        OR coalesce(btrim(p.brand_socials->>'instagram'), '') <> ''
        OR coalesce(btrim(p.brand_socials->>'facebook'), '') <> ''
        OR coalesce(btrim(p.brand_socials->>'x'), '') <> ''
        OR coalesce(btrim(p.brand_socials->>'youtube'), '') <> ''
        OR coalesce(btrim(p.brand_socials->>'linkedin'), '') <> ''
      );
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

GRANT EXECUTE ON FUNCTION public.profile_onboarding_complete(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.profile_onboarding_complete(uuid) FROM PUBLIC, anon, authenticated;
