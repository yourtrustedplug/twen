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
