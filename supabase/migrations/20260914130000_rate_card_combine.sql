-- Combined rate card across TikTok + Instagram, and Book me for IG / staff.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_stats jsonb NOT NULL DEFAULT '{}'::jsonb;

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
    'account_stats', COALESCE(p.account_stats, '{}'::jsonb),
    'book_slug', COALESCE(
      public.book_me_norm(p.book_slug),
      public.book_me_norm(p.tiktok_handle),
      public.book_me_norm(p.instagram_handle)
    ),
    'work', COALESCE((
      SELECT json_agg(item ORDER BY verified_views DESC, created_at DESC)
      FROM (
        SELECT
          json_build_object(
            'id', s.id,
            'url', s.tiktok_url,
            'platform', s.platform,
            'verified_views', s.verified_views,
            'likes', s.likes,
            'comments', s.comments,
            'shares', s.shares,
            'engagement_rate', s.engagement_rate
          ) AS item,
          s.verified_views,
          s.created_at
        FROM public.submissions s
        WHERE s.creator_id = p.id
          AND s.status = 'approved'
          AND coalesce(s.tiktok_url, '') <> ''
        ORDER BY s.verified_views DESC, s.created_at DESC
        LIMIT 3
      ) ranked
    ), '[]'::json)
  )
  INTO result
  FROM public.profiles p
  WHERE p.role IN ('creator', 'admin', 'moderator')
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

REVOKE ALL ON FUNCTION public.book_me_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_me_profile(text) TO anon, authenticated;

UPDATE public.profiles p
SET book_slug = public.book_me_norm(p.instagram_handle)
WHERE p.role IN ('creator', 'admin', 'moderator')
  AND (p.book_slug IS NULL OR btrim(p.book_slug) = '')
  AND public.book_me_norm(p.instagram_handle) IS NOT NULL
  AND length(public.book_me_norm(p.instagram_handle)) >= 3
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles x
    WHERE x.id <> p.id
      AND lower(x.book_slug) = public.book_me_norm(p.instagram_handle)
  );
