-- Book me: also resolve /@handle from connected TikTok / Instagram.
CREATE OR REPLACE FUNCTION public.book_me_norm(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(
      lower(regexp_replace(coalesce(raw, ''), '^@+', '')),
      '[^a-z0-9]+',
      '-',
      'g'
    )),
    ''
  );
$$;

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
  slug := public.book_me_norm(p_slug);
  IF slug IS NULL THEN
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
    'book_slug', COALESCE(
      public.book_me_norm(p.book_slug),
      public.book_me_norm(p.tiktok_handle),
      public.book_me_norm(p.instagram_handle)
    )
  )
  INTO result
  FROM public.profiles p
  WHERE p.role = 'creator'
    AND (
      public.book_me_norm(p.book_slug) = slug
      OR public.book_me_norm(p.tiktok_handle) = slug
      OR public.book_me_norm(p.instagram_handle) = slug
    )
  ORDER BY CASE
    WHEN public.book_me_norm(p.book_slug) = slug THEN 0
    ELSE 1
  END
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.book_me_norm(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_me_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_me_profile(text) TO anon, authenticated;

UPDATE public.profiles p
SET book_slug = public.book_me_norm(p.tiktok_handle)
WHERE p.role = 'creator'
  AND (p.book_slug IS NULL OR btrim(p.book_slug) = '')
  AND public.book_me_norm(p.tiktok_handle) IS NOT NULL
  AND length(public.book_me_norm(p.tiktok_handle)) >= 3
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles x
    WHERE x.id <> p.id
      AND lower(x.book_slug) = public.book_me_norm(p.tiktok_handle)
  );
