-- Moderators review submissions (approve / reject). Brands view only.

-- Allow moderator role on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('creator', 'brand', 'moderator'));

-- New submissions wait in queue
ALTER TABLE public.submissions ALTER COLUMN status SET DEFAULT 'submitted';

-- Brands no longer approve/reject
DROP POLICY IF EXISTS "Brands review submissions to their campaigns" ON public.submissions;

-- Moderators can list every submission and update status/rejection_reason
DROP POLICY IF EXISTS "Moderators view all submissions" ON public.submissions;
CREATE POLICY "Moderators view all submissions"
ON public.submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'moderator'
  )
);

DROP POLICY IF EXISTS "Moderators review submissions" ON public.submissions;
CREATE POLICY "Moderators review submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'moderator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'moderator'
  )
);

-- Moderators need campaign titles when reviewing the queue
DROP POLICY IF EXISTS "Moderators view campaigns" ON public.campaigns;
CREATE POLICY "Moderators view campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'moderator'
  )
);

-- Only moderators (or service role with null uid) may change status
CREATE OR REPLACE FUNCTION public.submissions_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'moderator'
    ) THEN
      RAISE EXCEPTION 'Only moderators can change submission status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_status_guard ON public.submissions;
CREATE TRIGGER submissions_status_guard
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.submissions_status_guard();
