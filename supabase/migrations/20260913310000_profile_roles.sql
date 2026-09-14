-- Multiple app roles on one profile (see supabase/MULTI_ROLE.sql).
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
