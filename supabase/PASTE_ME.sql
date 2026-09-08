-- =============================================================================
-- Unignored — FULL SCHEMA (empty database)
-- Paste into Supabase → SQL Editor → Run
-- =============================================================================

-- Helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'brand', 'moderator', 'admin')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  full_name text,
  phone text,
  tiktok_handle text,
  payout_provider text CHECK (payout_provider IN ('mtn_momo', 'airtel_money')),
  payout_number text,
  id_verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (id_verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  company_name text,
  avatar_url text,
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  rate_per_video numeric NOT NULL DEFAULT 0,
  avg_views bigint NOT NULL DEFAULT 0,
  engagement_rate numeric NOT NULL DEFAULT 0,
  follower_count bigint NOT NULL DEFAULT 0,
  marketplace_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Anyone can view visible creator profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (role = 'creator' AND marketplace_visible = true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock role + plan (clients cannot self-promote)
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
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Cannot change plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_immutable_privs
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_immutable_privs();

-- =============================================================================
-- CAMPAIGNS
-- =============================================================================
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text NOT NULL DEFAULT '',
  title text NOT NULL,
  topic text NOT NULL DEFAULT '',
  angle text NOT NULL DEFAULT '',
  must_include text NOT NULL DEFAULT '',
  avoid text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  disclosure text NOT NULL DEFAULT 'Include ad disclosure (#ad) in the caption.',
  asset_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  niche text NOT NULL DEFAULT '',
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image text,
  budget numeric(12,2) NOT NULL DEFAULT 0,
  rate_per_1k numeric(10,2) NOT NULL DEFAULT 0,
  deadline timestamptz,
  started_at timestamptz,
  extended_days integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'completed')),
  funded_amount numeric(12,2) NOT NULL DEFAULT 0,
  spent_amount numeric(12,2) NOT NULL DEFAULT 0,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_status_idx ON public.campaigns (status);
CREATE INDEX campaigns_niche_idx ON public.campaigns (niche) WHERE niche <> '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands manage their own campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = brand_id) WITH CHECK (auth.uid() = brand_id);

CREATE POLICY "Anyone can view open campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (status = 'open');

CREATE POLICY "Moderators view campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('moderator', 'admin')
    )
  );

-- Staff can list all profiles (admin panel stats)
CREATE POLICY "Staff view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('moderator', 'admin')
    )
  );

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SUBMISSIONS
-- =============================================================================
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tiktok_url text NOT NULL,
  platform text NOT NULL DEFAULT 'tiktok',
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected')),
  verified_views bigint NOT NULL DEFAULT 0,
  last_verified_at timestamptz,
  earnings numeric(12,2) NOT NULL DEFAULT 0,
  likes bigint NOT NULL DEFAULT 0,
  comments bigint NOT NULL DEFAULT 0,
  shares bigint NOT NULL DEFAULT 0,
  engagement_rate numeric NOT NULL DEFAULT 0,
  checklist_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejection_reason text,
  creator_name text NOT NULL DEFAULT '',
  tiktok_handle text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);

CREATE INDEX submissions_campaign_idx ON public.submissions (campaign_id);
CREATE INDEX submissions_creator_idx ON public.submissions (creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage their own submissions"
  ON public.submissions FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Brands view submissions to their campaigns"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.brand_id = auth.uid()
    )
  );

CREATE POLICY "Moderators view all submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators review submissions"
  ON public.submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('moderator', 'admin')
    )
  );

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only moderators (or service role) may change status
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
      WHERE p.id = auth.uid() AND p.role IN ('moderator', 'admin')
    ) THEN
      RAISE EXCEPTION 'Only staff can change submission status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_status_guard
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_status_guard();

-- Creators cannot edit money fields
CREATE OR REPLACE FUNCTION public.submissions_money_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.creator_id THEN
    IF NEW.verified_views IS DISTINCT FROM OLD.verified_views
       OR NEW.earnings IS DISTINCT FROM OLD.earnings THEN
      RAISE EXCEPTION 'Creators cannot change verified_views or earnings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_money_guard
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_money_guard();

-- =============================================================================
-- EARNINGS
-- =============================================================================
CREATE TABLE public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  views_delta bigint NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX earnings_creator_idx ON public.earnings (creator_id);
CREATE INDEX earnings_campaign_idx ON public.earnings (campaign_id);

GRANT SELECT, INSERT ON public.earnings TO authenticated;
GRANT ALL ON public.earnings TO service_role;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view their own earnings"
  ON public.earnings FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Brands view earnings for their campaigns"
  ON public.earnings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.brand_id = auth.uid()
    )
  );

-- =============================================================================
-- PAYOUTS
-- =============================================================================
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  provider text NOT NULL CHECK (provider IN ('mtn_momo', 'airtel_money')),
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  release_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payouts_creator_idx ON public.payouts (creator_id);

GRANT SELECT, INSERT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view their own payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

-- =============================================================================
-- WALLET TRANSACTIONS
-- =============================================================================
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'campaign_funding', 'escrow_hold', 'refund', 'earnings_credit', 'payout_debit'
  )),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions (user_id);

GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- MESSAGING
-- =============================================================================
CREATE TABLE public.conversations (
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

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX conversations_creator_idx ON public.conversations (creator_id);
CREATE INDEX conversations_brand_idx ON public.conversations (brand_id);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = brand_id OR auth.uid() = creator_id);

CREATE POLICY "Brands start conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = brand_id);

CREATE POLICY "Participants touch conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = brand_id OR auth.uid() = creator_id)
  WITH CHECK (auth.uid() = brand_id OR auth.uid() = creator_id);

CREATE POLICY "Participants view messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.brand_id = auth.uid() OR c.creator_id = auth.uid())
    )
  );

CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.brand_id = auth.uid() OR c.creator_id = auth.uid())
    )
  );

-- =============================================================================
-- MONEY / ESCROW RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fund_campaign(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_budget numeric;
BEGIN
  SELECT brand_id, budget INTO v_brand_id, v_budget FROM campaigns WHERE id = p_campaign_id;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_brand_id <> auth.uid() THEN RAISE EXCEPTION 'Not your campaign'; END IF;
  IF v_budget <= 0 THEN RAISE EXCEPTION 'Budget must be positive'; END IF;
  UPDATE campaigns
    SET status = 'open',
        funded_amount = budget,
        spent_amount = 0,
        started_at = now(),
        deadline = greatest(coalesce(deadline, now()), now() + interval '10 days')
    WHERE id = p_campaign_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign is not in draft state'; END IF;
  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (auth.uid(), 'campaign_funding', p_campaign_id, v_budget, 'Campaign funded (escrow)');
  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (auth.uid(), 'escrow_hold', p_campaign_id, v_budget, 'Escrow hold for campaign');
END;
$$;

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
  IF p_days IS NULL OR p_days < 1 OR p_days > 90 THEN
    RAISE EXCEPTION 'Extend by between 1 and 90 days';
  END IF;
  SELECT brand_id INTO v_brand_id FROM campaigns WHERE id = p_campaign_id;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_brand_id <> auth.uid() THEN RAISE EXCEPTION 'Not your campaign'; END IF;
  UPDATE campaigns
    SET deadline = greatest(coalesce(deadline, now()), now()) + (p_days || ' days')::interval,
        extended_days = extended_days + p_days
    WHERE id = p_campaign_id AND status IN ('open', 'draft')
    RETURNING deadline INTO v_deadline;
  IF v_deadline IS NULL THEN RAISE EXCEPTION 'Only live campaigns can be extended'; END IF;
  RETURN v_deadline;
END;
$$;

CREATE OR REPLACE FUNCTION public.accrue_views(p_submission_id uuid, p_new_views bigint)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub record;
  v_rate numeric;
  v_remaining numeric;
  v_delta bigint;
  v_gross numeric;
  v_payable numeric;
BEGIN
  SELECT s.*, c.rate_per_1k, (c.funded_amount - c.spent_amount) AS remaining, c.status AS campaign_status
    INTO v_sub
    FROM submissions s JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.id = p_submission_id;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF v_sub.status <> 'approved' OR v_sub.campaign_status <> 'open' THEN RETURN 0; END IF;
  IF p_new_views <= v_sub.verified_views THEN RETURN 0; END IF;

  v_delta := p_new_views - v_sub.verified_views;
  v_rate := v_sub.rate_per_1k;
  v_gross := v_delta * v_rate / 1000.0;
  v_remaining := v_sub.remaining;
  v_payable := least(v_gross, v_remaining);
  IF v_payable <= 0 THEN RETURN 0; END IF;

  UPDATE submissions
    SET verified_views = verified_views + ceil(v_payable / nullif(v_rate, 0) * 1000)::bigint,
        earnings = earnings + v_payable,
        last_verified_at = now()
    WHERE id = p_submission_id;

  UPDATE campaigns
    SET spent_amount = spent_amount + v_payable,
        status = CASE WHEN spent_amount + v_payable >= funded_amount THEN 'completed' ELSE status END
    WHERE id = v_sub.campaign_id;

  INSERT INTO earnings (submission_id, campaign_id, creator_id, views_delta, amount)
    VALUES (
      p_submission_id,
      v_sub.campaign_id,
      v_sub.creator_id,
      ceil(v_payable / nullif(v_rate, 0) * 1000)::bigint,
      v_payable
    );

  INSERT INTO wallet_transactions (user_id, type, campaign_id, amount, description)
    VALUES (v_sub.creator_id, 'earnings_credit', v_sub.campaign_id, v_payable, 'Earnings for verified views');

  RETURN v_payable;
END;
$$;

-- Payouts only after campaign closed + 7 days
CREATE OR REPLACE FUNCTION public.request_payout(p_amount numeric, p_provider text, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_withdrawn numeric;
  v_available numeric;
  v_id uuid;
BEGIN
  SELECT coalesce(sum(amount), 0) INTO v_withdrawn
  FROM payouts
  WHERE creator_id = auth.uid() AND status <> 'failed';

  SELECT coalesce(sum(e.amount), 0) INTO v_available
  FROM earnings e
  JOIN campaigns c ON c.id = e.campaign_id
  WHERE e.creator_id = auth.uid()
    AND c.closed_at IS NOT NULL
    AND c.closed_at + interval '7 days' <= now();

  v_available := v_available - v_withdrawn;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_amount > v_available THEN RAISE EXCEPTION 'Amount exceeds released balance'; END IF;

  INSERT INTO payouts (creator_id, amount, provider, phone)
  VALUES (auth.uid(), p_amount, p_provider, p_phone)
  RETURNING id INTO v_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description)
  VALUES (auth.uid(), 'payout_debit', p_amount, 'Withdrawal request to ' || p_provider);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fund_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_campaign(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.accrue_views(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accrue_views(uuid, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.accrue_views(uuid, bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.accrue_views(uuid, bigint) TO service_role;

-- =============================================================================
-- STORAGE (campaign assets)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-assets', 'campaign-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Signed in users read campaign assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-assets');

CREATE POLICY "Users upload their own campaign assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete their own campaign assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- After first signup, promote yourself to moderator (replace UUID):
--   UPDATE public.profiles SET role = 'moderator' WHERE id = '<your-user-uuid>';
-- (Must be run as service role / SQL editor — trigger blocks self-update.)
-- For SQL editor: temporarily disable trigger, update, re-enable:
--
--   ALTER TABLE public.profiles DISABLE TRIGGER profiles_immutable_privs;
--   UPDATE public.profiles SET role = 'moderator' WHERE id = '<uuid>';
--   ALTER TABLE public.profiles ENABLE TRIGGER profiles_immutable_privs;
-- =============================================================================
