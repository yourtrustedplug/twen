-- =============================================================================
-- Twen — Book me public portfolios
-- Paste in Supabase SQL Editor → Run. Safe to re-run.
-- Public page is /@slug (link-in-bio). Does not expose payout or ID fields.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS book_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_book_slug_uidx
  ON public.profiles (lower(book_slug))
  WHERE book_slug IS NOT NULL AND btrim(book_slug) <> '';

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
        LIMIT 9
      ) ranked
    ), '[]'::json)
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

-- Anonymous visitors need to see the profile photo on /@slug.
DROP POLICY IF EXISTS "Anon read public avatars" ON storage.objects;
CREATE POLICY "Anon read public avatars"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[2] = 'avatars'
  );
