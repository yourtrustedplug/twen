-- Admin = moderator (same people). Allow both roles + staff RLS.
-- Paste in Supabase SQL Editor after PASTE_ME.sql (or on existing DB).

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('creator', 'brand', 'moderator', 'admin'));

-- Staff helper: policies treat moderator and admin the same
CREATE OR REPLACE FUNCTION public.is_staff(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role IN ('moderator', 'admin')
  );
$$;

-- Submissions: replace role = 'moderator' checks with is_staff()
DROP POLICY IF EXISTS "Moderators view all submissions" ON public.submissions;
CREATE POLICY "Staff view all submissions"
ON public.submissions FOR SELECT TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "Moderators review submissions" ON public.submissions;
CREATE POLICY "Staff review submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Campaigns
DROP POLICY IF EXISTS "Moderators view campaigns" ON public.campaigns;
CREATE POLICY "Staff view campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (public.is_staff());

-- Profiles (admin panel stats)
DROP POLICY IF EXISTS "Staff view all profiles" ON public.profiles;
CREATE POLICY "Staff view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_staff());

-- Status guard: staff only
CREATE OR REPLACE FUNCTION public.submissions_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
      RAISE EXCEPTION 'Only staff can change submission status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Promote yourself (after signup). Replace UUID.
-- ALTER TABLE public.profiles DISABLE TRIGGER profiles_immutable_privs;
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
-- ALTER TABLE public.profiles ENABLE TRIGGER profiles_immutable_privs;
