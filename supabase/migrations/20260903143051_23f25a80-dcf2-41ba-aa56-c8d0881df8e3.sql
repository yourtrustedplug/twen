-- 1. Creator marketplace fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rate_per_video numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_views bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_visible boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone can view visible creator profiles" ON public.profiles;
CREATE POLICY "Anyone can view visible creator profiles"
ON public.profiles FOR SELECT TO authenticated
USING (role = 'creator' AND marketplace_visible = true);

-- 2. Campaign assets, links, socials, checklist, minimum duration
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS extended_days integer NOT NULL DEFAULT 0;

-- 3. Submission platform + engagement metrics + checklist results
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'tiktok',
  ADD COLUMN IF NOT EXISTS likes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist_results jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.submissions ALTER COLUMN status SET DEFAULT 'approved';

DROP POLICY IF EXISTS "Brands review submissions to their campaigns" ON public.submissions;
CREATE POLICY "Brands review submissions to their campaigns"
ON public.submissions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = submissions.campaign_id AND c.brand_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = submissions.campaign_id AND c.brand_id = auth.uid()));

-- 4. Funding sets start date and enforces a 10-day minimum run
CREATE OR REPLACE FUNCTION public.fund_campaign(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_brand_id uuid;
  v_budget numeric;
begin
  select brand_id, budget into v_brand_id, v_budget from campaigns where id = p_campaign_id;
  if v_brand_id is null then raise exception 'Campaign not found'; end if;
  if v_brand_id <> auth.uid() then raise exception 'Not your campaign'; end if;
  if v_budget <= 0 then raise exception 'Budget must be positive'; end if;
  update campaigns
    set status = 'open',
        funded_amount = budget,
        spent_amount = 0,
        started_at = now(),
        deadline = greatest(coalesce(deadline, now()), now() + interval '10 days')
    where id = p_campaign_id and status = 'draft';
  if not found then raise exception 'Campaign is not in draft state'; end if;
  insert into wallet_transactions (user_id, type, campaign_id, amount, description)
    values (auth.uid(), 'campaign_funding', p_campaign_id, v_budget, 'Campaign funded (escrow)');
  insert into wallet_transactions (user_id, type, campaign_id, amount, description)
    values (auth.uid(), 'escrow_hold', p_campaign_id, v_budget, 'Escrow hold for campaign');
end;
$function$;

-- 5. Extend a live campaign instead of closing it
CREATE OR REPLACE FUNCTION public.extend_campaign(p_campaign_id uuid, p_days integer)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_brand_id uuid;
  v_deadline timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'Extend by between 1 and 90 days';
  end if;
  select brand_id into v_brand_id from campaigns where id = p_campaign_id;
  if v_brand_id is null then raise exception 'Campaign not found'; end if;
  if v_brand_id <> auth.uid() then raise exception 'Not your campaign'; end if;
  update campaigns
    set deadline = greatest(coalesce(deadline, now()), now()) + (p_days || ' days')::interval,
        extended_days = extended_days + p_days
    where id = p_campaign_id and status in ('open', 'draft')
    returning deadline into v_deadline;
  if v_deadline is null then raise exception 'Only live campaigns can be extended'; end if;
  return v_deadline;
end;
$function$;

REVOKE ALL ON FUNCTION public.extend_campaign(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_campaign(uuid, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.close_campaign(uuid);

-- 6. Brand-initiated messaging
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  brand_name text NOT NULL DEFAULT '',
  creator_name text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, creator_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view conversations" ON public.conversations;
CREATE POLICY "Participants view conversations" ON public.conversations
FOR SELECT TO authenticated USING (auth.uid() = brand_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Brands start conversations" ON public.conversations;
CREATE POLICY "Brands start conversations" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Participants touch conversations" ON public.conversations;
CREATE POLICY "Participants touch conversations" ON public.conversations
FOR UPDATE TO authenticated USING (auth.uid() = brand_id OR auth.uid() = creator_id)
WITH CHECK (auth.uid() = brand_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
CREATE POLICY "Participants view messages" ON public.messages
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id AND (c.brand_id = auth.uid() OR c.creator_id = auth.uid())
));

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND (c.brand_id = auth.uid() OR c.creator_id = auth.uid())
  )
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_creator_idx ON public.conversations (creator_id);
CREATE INDEX IF NOT EXISTS conversations_brand_idx ON public.conversations (brand_id);

-- 7. Storage policies for campaign assets / avatars (private bucket, signed URLs)
DROP POLICY IF EXISTS "Signed in users read campaign assets" ON storage.objects;
CREATE POLICY "Signed in users read campaign assets" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'campaign-assets');

DROP POLICY IF EXISTS "Users upload their own campaign assets" ON storage.objects;
CREATE POLICY "Users upload their own campaign assets" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete their own campaign assets" ON storage.objects;
CREATE POLICY "Users delete their own campaign assets" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text
);
