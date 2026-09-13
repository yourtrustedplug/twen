-- Contact form inbox. Paste in Supabase → SQL Editor → Run. Safe to re-run.
-- Requires public.is_staff().
-- The send-contact-email function writes here with the service role even when Resend fails.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

DROP POLICY IF EXISTS "Staff read contact messages" ON public.contact_messages;
CREATE POLICY "Staff read contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_staff());
