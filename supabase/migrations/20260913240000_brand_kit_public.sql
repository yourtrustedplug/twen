-- Snapshot public brand info onto campaigns so creators can see
-- company, about, location, website, socials, and colors
-- (creators cannot read brand profiles).

UPDATE public.campaigns c
SET
  brand_kit = coalesce(c.brand_kit, '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
         'logo', nullif(btrim(p.avatar_url), ''),
         'logo_dark', nullif(btrim(p.logo_dark_url), ''),
         'primary', nullif(btrim(p.brand_primary_color), ''),
         'secondary', nullif(btrim(p.brand_secondary_color), ''),
         'website', nullif(btrim(p.website), ''),
         'socials', CASE
           WHEN p.brand_socials IS NULL OR p.brand_socials = '{}'::jsonb THEN NULL
           ELSE p.brand_socials
         END,
         'company', nullif(btrim(p.company_name), ''),
         'bio', nullif(btrim(p.bio), ''),
         'city', nullif(btrim(p.city), ''),
         'country', nullif(btrim(p.country), '')
       )),
  brand_name = coalesce(nullif(btrim(p.company_name), ''), c.brand_name),
  links = CASE
    WHEN coalesce(btrim(p.website), '') <> ''
      AND (c.links IS NULL OR c.links = '[]'::jsonb)
    THEN to_jsonb(ARRAY[p.website])
    ELSE c.links
  END,
  socials = CASE
    WHEN p.brand_socials IS NOT NULL
      AND p.brand_socials <> '{}'::jsonb
      AND (c.socials IS NULL OR c.socials = '[]'::jsonb)
    THEN (
      SELECT coalesce(jsonb_agg(value), '[]'::jsonb)
      FROM jsonb_each_text(p.brand_socials)
      WHERE btrim(value) <> ''
    )
    ELSE c.socials
  END
FROM public.profiles p
WHERE p.id = c.brand_id
  AND p.role = 'brand';

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
           'logo_dark', nullif(btrim(NEW.logo_dark_url), ''),
           'primary', nullif(btrim(NEW.brand_primary_color), ''),
           'secondary', nullif(btrim(NEW.brand_secondary_color), ''),
           'website', nullif(btrim(NEW.website), ''),
           'socials', CASE
             WHEN NEW.brand_socials IS NULL OR NEW.brand_socials = '{}'::jsonb THEN NULL
             ELSE NEW.brand_socials
           END,
           'company', nullif(btrim(NEW.company_name), ''),
           'bio', nullif(btrim(NEW.bio), ''),
           'city', nullif(btrim(NEW.city), ''),
           'country', nullif(btrim(NEW.country), '')
         )),
    brand_name = coalesce(nullif(btrim(NEW.company_name), ''), c.brand_name),
    links = CASE
      WHEN coalesce(btrim(NEW.website), '') <> ''
      THEN to_jsonb(ARRAY[NEW.website])
      ELSE c.links
    END,
    socials = CASE
      WHEN NEW.brand_socials IS NOT NULL AND NEW.brand_socials <> '{}'::jsonb
      THEN (
        SELECT coalesce(jsonb_agg(value), '[]'::jsonb)
        FROM jsonb_each_text(NEW.brand_socials)
        WHERE btrim(value) <> ''
      )
      ELSE c.socials
    END
  WHERE c.brand_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_campaign_brand_kit ON public.profiles;
CREATE TRIGGER profiles_sync_campaign_brand_kit
  AFTER INSERT OR UPDATE OF
    avatar_url,
    logo_dark_url,
    company_name,
    website,
    brand_primary_color,
    brand_secondary_color,
    brand_socials,
    bio,
    city,
    country
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_brand_kit_onto_campaigns();
