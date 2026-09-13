-- Twen welcome chat: Hi {name}, payouts after the 7-day hold go out immediately.
-- Paste in Supabase → SQL Editor. Safe to re-run.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'direct';

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_kind_check CHECK (kind IN ('direct', 'twen'));

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS twen_stage text;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS from_twen boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS conversations_twen_idx
  ON public.conversations (brand_id)
  WHERE kind = 'twen';

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND coalesce(from_twen, false) = false
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.brand_id = auth.uid() OR c.creator_id = auth.uid())
      AND c.kind IS DISTINCT FROM 'twen'
  )
);

CREATE OR REPLACE FUNCTION public.twen_welcome_bodies(p_role text, p_name text DEFAULT '')
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_role = 'brand' THEN ARRAY[
      (CASE WHEN coalesce(btrim(p_name), '') <> '' THEN 'Hi ' || btrim(p_name) || E'.\n\n' ELSE E'Hi.\n\n' END)
      || E'Welcome to Twen.\n\nFund a campaign, brief creators across Africa, and pay only for verified views. Unused budget can come back when the campaign closes.\n\nFinish your brand profile first — company, your name, location, logo, color, website, and a social. You can''t create a campaign until that''s done. The checklist is on your profile.',
      E'How money moves\n\n1. You fund a campaign. That money sits in escrow.\n2. Creators post. We verify the views and pay them from escrow.\n3. After the 7-day hold (Creator Pro skips it), we pay creators immediately to mobile money.\n\nTwen Plus lets you message and hire specific people. Free brands run open bounty campaigns.'
    ]
    ELSE ARRAY[
      (CASE WHEN coalesce(btrim(p_name), '') <> '' THEN 'Hi ' || btrim(p_name) || E'.\n\n' ELSE E'Hi.\n\n' END)
      || E'Welcome to Twen.\n\nPick a campaign, post the brief on TikTok or Instagram, and we pay you for verified views — sent to mobile money.\n\nFinish your profile first — first and last name, city and country, connect TikTok or Instagram, and upload your passport or national ID. You can''t submit until that''s done. The checklist is on your profile.',
      E'How payouts work\n\n1. You post. We verify the views on the platform.\n2. Earnings accrue while the campaign is open.\n3. When the campaign closes, funds sit for 7 days (Creator Pro skips the wait).\n4. After that, withdraw from Earnings — we pay out immediately to EcoCash, MTN MoMo, Airtel Money, M-Pesa, and other mobile money.\n\nAdd your payout number on Earnings when you''re ready.'
    ]
  END;
$$;

CREATE OR REPLACE FUNCTION public.twen_ready_body(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_role = 'brand' THEN 'You''re set. Your profile is complete — create a campaign when you''re ready.'
    ELSE 'You''re set. Your profile is complete — go pick a campaign and post.'
  END;
$$;

CREATE OR REPLACE FUNCTION public._ensure_twen_welcome(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := p_user_id;
  v_role text;
  v_name text;
  v_conv public.conversations%ROWTYPE;
  v_bodies text[];
  v_body text;
  v_ids uuid[];
  v_i int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    role,
    coalesce(
      nullif(btrim(first_name), ''),
      nullif(btrim(split_part(coalesce(full_name, ''), ' ', 1)), ''),
      nullif(btrim(company_name), ''),
      ''
    )
  INTO v_role, v_name
  FROM public.profiles
  WHERE id = v_uid;

  IF v_role IS NULL OR v_role IN ('moderator', 'admin') THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_conv
  FROM public.conversations
  WHERE kind = 'twen' AND brand_id = v_uid AND creator_id = v_uid
  LIMIT 1;

  IF v_conv.id IS NULL THEN
    INSERT INTO public.conversations (brand_id, creator_id, brand_name, creator_name, kind, twen_stage)
    VALUES (v_uid, v_uid, 'Twen', 'Twen', 'twen', 'welcome')
    RETURNING * INTO v_conv;
  END IF;

  v_bodies := public.twen_welcome_bodies(v_role, v_name);
  v_body := public.twen_ready_body(v_role);

  SELECT coalesce(array_agg(id ORDER BY created_at), ARRAY[]::uuid[])
  INTO v_ids
  FROM public.messages
  WHERE conversation_id = v_conv.id AND from_twen AND body IS DISTINCT FROM v_body;

  IF array_length(v_ids, 1) IS NULL THEN
    FOR v_i IN 1 .. array_length(v_bodies, 1) LOOP
      INSERT INTO public.messages (conversation_id, sender_id, body, from_twen)
      VALUES (v_conv.id, v_uid, v_bodies[v_i], true);
    END LOOP;
  ELSE
    FOR v_i IN 1 .. array_length(v_bodies, 1) LOOP
      IF v_i <= array_length(v_ids, 1) THEN
        UPDATE public.messages SET body = v_bodies[v_i] WHERE id = v_ids[v_i];
      ELSE
        INSERT INTO public.messages (conversation_id, sender_id, body, from_twen)
        VALUES (v_conv.id, v_uid, v_bodies[v_i], true);
      END IF;
    END LOOP;
  END IF;

  IF public.profile_onboarding_complete(v_uid)
     AND coalesce(v_conv.twen_stage, 'welcome') IS DISTINCT FROM 'ready' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.messages
      WHERE conversation_id = v_conv.id AND from_twen AND body = v_body
    ) THEN
      INSERT INTO public.messages (conversation_id, sender_id, body, from_twen)
      VALUES (v_conv.id, v_uid, v_body, true);
    END IF;
    UPDATE public.conversations
      SET last_message_at = now(), twen_stage = 'ready'
      WHERE id = v_conv.id;
  ELSE
    UPDATE public.conversations
      SET last_message_at = now(), twen_stage = coalesce(v_conv.twen_stage, 'welcome')
      WHERE id = v_conv.id;
  END IF;

  RETURN v_conv.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_twen_welcome(p_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := coalesce(p_user_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  RETURN public._ensure_twen_welcome(v_uid);
END;
$$;

REVOKE ALL ON FUNCTION public._ensure_twen_welcome(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_twen_welcome(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_twen_welcome(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_twen_welcome(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._ensure_twen_welcome(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.twen_welcome_bodies(text);

CREATE OR REPLACE FUNCTION public.tg_twen_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public._ensure_twen_welcome(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_twen_welcome_insert ON public.profiles;
CREATE TRIGGER profiles_twen_welcome_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_twen_welcome();

DROP TRIGGER IF EXISTS profiles_twen_welcome_update ON public.profiles;
CREATE TRIGGER profiles_twen_welcome_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.tg_twen_welcome();

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE role IN ('creator', 'brand') LOOP
    PERFORM public._ensure_twen_welcome(r.id);
  END LOOP;
END;
$$;
