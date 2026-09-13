-- Copy brand logos onto campaigns (creators cannot read brand profiles).
-- Also keep campaign kits in sync when a brand updates their logo.

UPDATE public.campaigns c
SET brand_kit = jsonb_set(
  coalesce(c.brand_kit, '{}'::jsonb),
  '{logo}',
  to_jsonb(p.avatar_url)
)
FROM public.profiles p
WHERE p.id = c.brand_id
  AND coalesce(btrim(p.avatar_url), '') <> ''
  AND coalesce(btrim(c.brand_kit->>'logo'), '') = '';

CREATE OR REPLACE FUNCTION public.campaign_brand_logos(p_ids uuid[])
RETURNS TABLE(campaign_id uuid, logo_path text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    coalesce(
      nullif(btrim(c.brand_kit->>'logo'), ''),
      nullif(btrim(c.brand_kit->>'logo_dark'), ''),
      nullif(btrim(c.brand_kit->>'avatar_url'), ''),
      nullif(btrim(p.avatar_url), ''),
      nullif(btrim(p.logo_dark_url), '')
    )
  FROM public.campaigns c
  LEFT JOIN public.profiles p ON p.id = c.brand_id
  WHERE c.id = ANY(p_ids)
    AND (
      c.status = 'open'
      OR c.brand_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role IN ('moderator', 'admin')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.campaign_brand_logos(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campaign_brand_logos(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_brand_kit_onto_campaigns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'brand' THEN
    RETURN NEW;
  END IF;

  UPDATE public.campaigns c
  SET
    brand_kit = coalesce(c.brand_kit, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
           'logo', nullif(btrim(NEW.avatar_url), ''),
           'logo_dark', nullif(btrim(NEW.logo_dark_url), '')
         )),
    brand_name = coalesce(nullif(btrim(NEW.company_name), ''), c.brand_name)
  WHERE c.brand_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_campaign_brand_kit ON public.profiles;
CREATE TRIGGER profiles_sync_campaign_brand_kit
  AFTER INSERT OR UPDATE OF avatar_url, logo_dark_url, company_name
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_brand_kit_onto_campaigns();
