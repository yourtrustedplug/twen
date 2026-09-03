-- ============ Unignored schema ============

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'creator' check (role in ('creator','brand')),
  full_name text,
  phone text,
  tiktok_handle text,
  payout_provider text check (payout_provider in ('mtn_momo','airtel_money')),
  payout_number text,
  id_verification_status text not null default 'unverified' check (id_verification_status in ('unverified','pending','verified','rejected')),
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users can view their own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- CAMPAIGNS
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null default '',
  angle text not null default '',
  must_include text not null default '',
  avoid text not null default '',
  hashtags text not null default '',
  disclosure text not null default 'Include ad disclosure (#ad) in the caption.',
  asset_urls jsonb not null default '[]'::jsonb,
  budget numeric(12,2) not null default 0,
  rate_per_1k numeric(10,2) not null default 0,
  deadline timestamptz,
  status text not null default 'draft' check (status in ('draft','open','closed','completed')),
  funded_amount numeric(12,2) not null default 0,
  spent_amount numeric(12,2) not null default 0,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_status_idx on public.campaigns (status);
grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "Brands manage their own campaigns" on public.campaigns for all to authenticated using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
create policy "Anyone can view open campaigns" on public.campaigns for select to authenticated using (status = 'open');

-- SUBMISSIONS
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  tiktok_url text not null,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  verified_views bigint not null default 0,
  last_verified_at timestamptz,
  earnings numeric(12,2) not null default 0,
  rejection_reason text,
  creator_name text not null default '',
  tiktok_handle text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
create index submissions_campaign_idx on public.submissions (campaign_id);
create index submissions_creator_idx on public.submissions (creator_id);
grant select, insert, update, delete on public.submissions to authenticated;
grant all on public.submissions to service_role;
alter table public.submissions enable row level security;
create policy "Creators manage their own submissions" on public.submissions for all to authenticated using (auth.uid() = creator_id) with check (auth.uid() = creator_id);
create policy "Brands view submissions to their campaigns" on public.submissions for select to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = auth.uid()));

-- EARNINGS LEDGER
create table public.earnings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  views_delta bigint not null default 0,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index earnings_creator_idx on public.earnings (creator_id);
create index earnings_campaign_idx on public.earnings (campaign_id);
grant select, insert on public.earnings to authenticated;
grant all on public.earnings to service_role;
alter table public.earnings enable row level security;
create policy "Creators view their own earnings" on public.earnings for select to authenticated using (auth.uid() = creator_id);
create policy "Brands view earnings for their campaigns" on public.earnings for select to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = auth.uid()));

-- PAYOUTS
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  provider text not null check (provider in ('mtn_momo','airtel_money')),
  phone text not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed')),
  release_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create index payouts_creator_idx on public.payouts (creator_id);
grant select, insert on public.payouts to authenticated;
grant all on public.payouts to service_role;
alter table public.payouts enable row level security;
create policy "Creators view their own payouts" on public.payouts for select to authenticated using (auth.uid() = creator_id);

-- WALLET TRANSACTIONS
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('campaign_funding','escrow_hold','refund','earnings_credit','payout_debit')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  amount numeric(12,2) not null default 0,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index wallet_tx_user_idx on public.wallet_transactions (user_id);
grant select, insert on public.wallet_transactions to authenticated;
grant all on public.wallet_transactions to service_role;
alter table public.wallet_transactions enable row level security;
create policy "Users view their own transactions" on public.wallet_transactions for select to authenticated using (auth.uid() = user_id);

-- ============ Escrow / money functions ============

-- Fund a campaign: move full budget into escrow and open it to creators.
create or replace function public.fund_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand_id uuid;
  v_budget numeric;
begin
  select brand_id, budget into v_brand_id, v_budget from campaigns where id = p_campaign_id;
  if v_brand_id is null then raise exception 'Campaign not found'; end if;
  if v_brand_id <> auth.uid() then raise exception 'Not your campaign'; end if;
  if v_budget <= 0 then raise exception 'Budget must be positive'; end if;
  update campaigns
    set status = 'open', funded_amount = budget, spent_amount = 0
    where id = p_campaign_id and status = 'draft';
  if not found then raise exception 'Campaign is not in draft state'; end if;
  insert into wallet_transactions (user_id, type, campaign_id, amount, description)
    values (auth.uid(), 'campaign_funding', p_campaign_id, v_budget, 'Campaign funded (escrow)');
  insert into wallet_transactions (user_id, type, campaign_id, amount, description)
    values (auth.uid(), 'escrow_hold', p_campaign_id, v_budget, 'Escrow hold for campaign');
end;
$$;

-- Close a campaign: stop accrual, refund unspent escrow.
create or replace function public.close_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand_id uuid;
  v_refund numeric;
begin
  select brand_id, funded_amount - spent_amount into v_brand_id, v_refund from campaigns where id = p_campaign_id;
  if v_brand_id is null then raise exception 'Campaign not found'; end if;
  if v_brand_id <> auth.uid() then raise exception 'Not your campaign'; end if;
  update campaigns
    set status = 'closed', closed_at = now()
    where id = p_campaign_id and status in ('open','draft');
  if not found then raise exception 'Campaign already closed'; end if;
  if v_refund > 0 then
    insert into wallet_transactions (user_id, type, campaign_id, amount, description)
      values (auth.uid(), 'refund', p_campaign_id, v_refund, 'Unspent budget refunded from escrow');
  end if;
end;
$$;

-- Accrue earnings for a submission given a new verified view count.
-- Caps spend at the campaign budget. Callable by the verification edge function (service role).
create or replace function public.accrue_views(p_submission_id uuid, p_new_views bigint)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_rate numeric;
  v_remaining numeric;
  v_delta bigint;
  v_gross numeric;
  v_payable numeric;
begin
  select s.*, c.rate_per_1k, (c.funded_amount - c.spent_amount) as remaining, c.status as campaign_status
    into v_sub
    from submissions s join campaigns c on c.id = s.campaign_id
    where s.id = p_submission_id;
  if v_sub.id is null then raise exception 'Submission not found'; end if;
  if v_sub.status <> 'approved' or v_sub.campaign_status <> 'open' then return 0; end if;
  if p_new_views <= v_sub.verified_views then return 0; end if;

  v_delta := p_new_views - v_sub.verified_views;
  v_rate := v_sub.rate_per_1k;
  v_gross := v_delta * v_rate / 1000.0;
  v_remaining := v_sub.remaining;
  v_payable := least(v_gross, v_remaining);
  if v_payable <= 0 then return 0; end if;

  update submissions
    set verified_views = verified_views + ceil(v_payable / nullif(v_rate,0) * 1000)::bigint,
        earnings = earnings + v_payable,
        last_verified_at = now()
    where id = p_submission_id;

  update campaigns
    set spent_amount = spent_amount + v_payable,
        status = case when spent_amount + v_payable >= funded_amount then 'completed' else status end
    where id = v_sub.campaign_id;

  insert into earnings (submission_id, campaign_id, creator_id, views_delta, amount)
    values (p_submission_id, v_sub.campaign_id, v_sub.creator_id,
            ceil(v_payable / nullif(v_rate,0) * 1000)::bigint, v_payable);

  insert into wallet_transactions (user_id, type, campaign_id, amount, description)
    values (v_sub.creator_id, 'earnings_credit', v_sub.campaign_id, v_payable, 'Earnings for verified views');

  return v_payable;
end;
$$;

-- Request a payout: validates available (released) balance with the 7-day hold.
create or replace function public.request_payout(p_amount numeric, p_provider text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_withdrawn numeric;
  v_available numeric;
  v_id uuid;
begin
  select coalesce(sum(amount),0) into v_total from earnings where creator_id = auth.uid();
  select coalesce(sum(amount),0) into v_withdrawn from payouts where creator_id = auth.uid() and status <> 'failed';
  select coalesce(sum(amount),0) into v_available
    from earnings e join campaigns c on c.id = e.campaign_id
    where e.creator_id = auth.uid() and (c.closed_at is null or c.closed_at + interval '7 days' <= now());
  v_available := v_available - v_withdrawn;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_amount > v_available then raise exception 'Amount exceeds released balance'; end if;
  insert into payouts (creator_id, amount, provider, phone)
    values (auth.uid(), p_amount, p_provider, p_phone)
    returning id into v_id;
  insert into wallet_transactions (user_id, type, amount, description)
    values (auth.uid(), 'payout_debit', p_amount, 'Withdrawal request to ' || p_provider);
  return v_id;
end;
$$;

grant execute on function public.fund_campaign(uuid) to authenticated;
grant execute on function public.close_campaign(uuid) to authenticated;
grant execute on function public.request_payout(numeric, text, text) to authenticated;
grant execute on function public.accrue_views(uuid, bigint) to service_role;

-- updated_at triggers
create trigger update_profiles_updated_at before update on public.profiles for each row execute function update_updated_at_column();
create trigger update_campaigns_updated_at before update on public.campaigns for each row execute function update_updated_at_column();
create trigger update_submissions_updated_at before update on public.submissions for each row execute function update_updated_at_column();