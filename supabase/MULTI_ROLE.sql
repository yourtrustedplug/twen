-- Multiple app roles on one profile.
-- role stays the marketplace identity (listings, RLS).
-- roles is the extra surfaces this account may open (creator / brand / admin).
-- Staff (admin/moderator) can already use every surface in the app; this column
-- lets a creator also be a brand without promoting them to staff.
--
-- Paste in the Supabase SQL editor. Do not run from the client.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles text[];

UPDATE public.profiles
SET roles = ARRAY[role]
WHERE roles IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN roles SET DEFAULT ARRAY['creator']::text[],
  ALTER COLUMN roles SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_roles_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_roles_check
  CHECK (
    roles <@ ARRAY['creator', 'brand', 'moderator', 'admin']::text[]
    AND cardinality(roles) >= 1
  );

-- Keep primary role inside the array
UPDATE public.profiles
SET roles = ARRAY(
  SELECT DISTINCT unnest(ARRAY[role] || roles)
);

CREATE OR REPLACE FUNCTION public.profiles_immutable_privs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
    IF NEW.roles IS DISTINCT FROM OLD.roles THEN
      RAISE EXCEPTION 'Cannot change roles';
    END IF;
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Cannot change plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Staff stay staff for RLS, and also keep creator/brand in roles.
-- Example: give the logged-in admin creator + brand surfaces in the data model too:
-- UPDATE public.profiles
-- SET roles = ARRAY['admin', 'creator', 'brand']
-- WHERE role IN ('admin', 'moderator');
