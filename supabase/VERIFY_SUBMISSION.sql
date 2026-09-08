-- VERIFY_SUBMISSION.sql
-- Paste in Supabase SQL Editor after PROFILE_ABOUT / PASTE_NEXT (oauth tables).
-- Adds platform proof columns and blocks direct client inserts (edge function inserts).

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS platform_media_id text,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS submissions_platform_media_uidx
  ON public.submissions (platform, platform_media_id)
  WHERE platform_media_id IS NOT NULL;

-- Creators may no longer INSERT submissions directly — verify-submission edge does.
DROP POLICY IF EXISTS "Creators manage their own submissions" ON public.submissions;

DROP POLICY IF EXISTS "Creators view own submissions" ON public.submissions;
CREATE POLICY "Creators view own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators update own open submissions" ON public.submissions;
-- Optional: allow creators to update checklist only while still 'submitted' — keep locked.
-- No creator UPDATE policy: status/money guards already exist for staff paths.

REVOKE INSERT ON public.submissions FROM authenticated;
GRANT SELECT ON public.submissions TO authenticated;
-- Staff / brand policies unchanged (SELECT / UPDATE).

COMMENT ON COLUMN public.submissions.platform_media_id IS
  'TikTok video id or Instagram media id confirmed via OAuth';
COMMENT ON COLUMN public.submissions.posted_at IS
  'Publish time from TikTok/Meta API at submit verification';
COMMENT ON COLUMN public.submissions.link_verified_at IS
  'When verify-submission confirmed ownership + date via platform APIs';
