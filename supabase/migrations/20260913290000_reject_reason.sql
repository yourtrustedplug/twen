-- Rejected submissions must include a reason (shown in-app and emailed to the creator).

CREATE OR REPLACE FUNCTION public.submissions_rejection_reason_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'rejected' AND btrim(coalesce(NEW.rejection_reason, '')) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_rejection_reason_guard ON public.submissions;
CREATE TRIGGER submissions_rejection_reason_guard
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.submissions_rejection_reason_guard();
