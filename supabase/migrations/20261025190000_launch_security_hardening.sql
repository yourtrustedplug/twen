-- Launch security hardening.
--
-- This migration closes the two launch-blocking database paths:
--   1. Brands could write campaign status / money fields directly through PostgREST.
--   2. Anonymous callers could execute extend_campaign (NULL-safe ownership check).
--
-- It also tightens profile self-insert, revokes legacy RPCs, caps upload buckets,
-- and adds the storage needed for contact-form rate limiting and client errors.

-- ---------------------------------------------------------------------------
-- 1. Campaign write lockdown
-- ---------------------------------------------------------------------------
-- Clients may read, create drafts, and edit draft presentation. They may not
-- delete campaigns or change funding/status fields directly.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.campaigns FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.campaigns FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaigns TO authenticated;

CREATE OR REPLACE FUNCTION public.campaigns_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Trusted database roles (service_role, dashboard SQL) and SECURITY DEFINER
  -- functions such as confirm_campaign_funding/close_campaign/extend_campaign
  -- run outside the authenticated/anon roles and are allowed through.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.is_staff() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Campaigns must be created as drafts';
    END IF;
    IF coalesce(NEW.funded_amount, 0) <> 0 OR coalesce(NEW.spent_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'Campaign funding is managed by Twen';
    END IF;
    IF NEW.started_at IS NOT NULL OR NEW.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Campaign dates are managed by Twen';
    END IF;
    IF NEW.nardopay_payment_ref IS NOT NULL
       OR NEW.nardopay_link_code IS NOT NULL
       OR NEW.nardopay_checkout_url IS NOT NULL
       OR NEW.nardopay_checkout_amount IS NOT NULL THEN
      RAISE EXCEPTION 'Campaign payment fields are managed by Twen';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Campaign status is managed by Twen';
  END IF;
  IF NEW.funded_amount IS DISTINCT FROM OLD.funded_amount
     OR NEW.spent_amount IS DISTINCT FROM OLD.spent_amount
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
     OR NEW.brand_id IS DISTINCT FROM OLD.brand_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.nardopay_payment_ref IS DISTINCT FROM OLD.nardopay_payment_ref
     OR NEW.nardopay_link_code IS DISTINCT FROM OLD.nardopay_link_code
     OR NEW.nardopay_checkout_url IS DISTINCT FROM OLD.nardopay_checkout_url
     OR NEW.nardopay_checkout_amount IS DISTINCT FROM OLD.nardopay_checkout_amount THEN
    RAISE EXCEPTION 'Campaign funding fields are managed by Twen';
  END IF;

  -- Once a campaign is funded, its commercial terms are frozen.
  IF OLD.status IS DISTINCT FROM 'draft'
     AND (
       NEW.budget IS DISTINCT FROM OLD.budget
       OR NEW.rate_per_1k IS DISTINCT FROM OLD.rate_per_1k
       OR NEW.deadline IS DISTINCT FROM OLD.deadline
       OR NEW.extended_days IS DISTINCT FROM OLD.extended_days
     ) THEN
    RAISE EXCEPTION 'Campaign budget and terms cannot change after funding';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_guard ON public.campaigns;
CREATE TRIGGER campaigns_guard
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.campaigns_guard();

REVOKE ALL ON FUNCTION public.campaigns_guard() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. extend_campaign authorization
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.extend_campaign(p_campaign_id uuid, p_days integer)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_deadline timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 90 THEN
    RAISE EXCEPTION 'Extend by between 1 and 90 days';
  END IF;
  SELECT brand_id INTO v_brand_id FROM public.campaigns WHERE id = p_campaign_id;
  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;
  IF v_brand_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your campaign';
  END IF;
  UPDATE public.campaigns
    SET deadline = greatest(coalesce(deadline, now()), now()) + (p_days || ' days')::interval,
        extended_days = extended_days + p_days
    WHERE id = p_campaign_id AND status IN ('open', 'draft')
    RETURNING deadline INTO v_deadline;
  IF v_deadline IS NULL THEN
    RAISE EXCEPTION 'Only live campaigns can be extended';
  END IF;
  RETURN v_deadline;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_campaign(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_campaign(uuid, integer) TO authenticated, service_role;

-- Legacy payment bypass: never exposed to clients, and no longer needed.
DROP FUNCTION IF EXISTS public.fund_campaign(uuid);

-- ---------------------------------------------------------------------------
-- 3. Other exposed RPCs
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.request_payout(numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_twen_welcome(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_twen_welcome(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public._ensure_twen_welcome(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._ensure_twen_welcome(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Profile self-insert guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service-role inserts (Privy exchange) and staff inserts are trusted.
  IF auth.uid() IS NULL OR public.is_staff() THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.role, '') NOT IN ('creator', 'brand') THEN
    RAISE EXCEPTION 'Invalid profile role';
  END IF;
  IF coalesce(NEW.plan, 'free') <> 'free' THEN
    RAISE EXCEPTION 'Cannot self-assign a paid plan';
  END IF;
  IF coalesce(NEW.id_verification_status, 'unverified') = 'verified' THEN
    RAISE EXCEPTION 'Identity verification is staff-managed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_insert_guard ON public.profiles;
CREATE TRIGGER profiles_insert_guard
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_insert_guard();

REVOKE ALL ON FUNCTION public.profiles_insert_guard() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND coalesce(role, '') IN ('creator', 'brand')
    AND coalesce(plan, 'free') = 'free'
    AND coalesce(id_verification_status, 'unverified') <> 'verified'
  );

-- ---------------------------------------------------------------------------
-- 5. Upload limits
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'campaign-assets';

UPDATE storage.buckets
SET
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf'
  ]
WHERE id = 'id-documents';

-- ---------------------------------------------------------------------------
-- 6. Contact rate limiting
-- ---------------------------------------------------------------------------
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS ip_hash text;

CREATE INDEX IF NOT EXISTS contact_messages_ip_created_idx
  ON public.contact_messages (ip_hash, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. Client error monitoring
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  stack text,
  component_stack text,
  path text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_errors FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.client_errors TO service_role;

CREATE INDEX IF NOT EXISTS client_errors_created_idx
  ON public.client_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS client_errors_ip_created_idx
  ON public.client_errors (ip_hash, created_at DESC);
