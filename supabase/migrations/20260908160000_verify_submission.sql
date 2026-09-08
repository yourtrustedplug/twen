-- Migration mirror of VERIFY_SUBMISSION.sql (paste file is source of truth for prod).
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
