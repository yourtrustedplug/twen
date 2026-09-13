-- Book me public portfolios. See supabase/BOOK_ME.sql for the pasteable copy.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS book_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_book_slug_uidx
  ON public.profiles (lower(book_slug))
  WHERE book_slug IS NOT NULL AND btrim(book_slug) <> '';

CREATE OR REPLACE FUNCTION public.book_me_profile(p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slug text;
  result json;
BEGIN
  slug := lower(btrim(p_slug));
  slug := regexp_replace(slug, '^@+', '');
  IF slug IS NULL OR slug = '' THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'bio', p.bio,
    'avatar_url', p.avatar_url,
    'city', p.city,
    'country', p.country,
    'location', p.location,
    'rate_per_video', p.rate_per_video,
    'avg_views', p.avg_views,
    'engagement_rate', p.engagement_rate,
    'follower_count', p.follower_count,
    'platforms', p.platforms,
    'tiktok_handle', p.tiktok_handle,
    'instagram_handle', p.instagram_handle,
    'book_slug', p.book_slug
  )
  INTO result
  FROM public.profiles p
  WHERE p.role = 'creator'
    AND p.book_slug IS NOT NULL
    AND lower(p.book_slug) = slug
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.book_me_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_me_profile(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anon read public avatars" ON storage.objects;
CREATE POLICY "Anon read public avatars"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[2] = 'avatars'
  );
