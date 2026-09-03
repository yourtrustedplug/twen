create or replace function public.seed_demo_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_anon boolean;
  v_c1 uuid;
  v_c2 uuid;
  v_s1 uuid;
begin
  select coalesce(is_anonymous, false) into v_is_anon from auth.users where id = p_user_id;
  if v_is_anon is not true then
    raise exception 'seed_demo_data can only be used for demo accounts';
  end if;

  -- Idempotent: don't duplicate sample data if it was already seeded.
  if exists (select 1 from campaigns where brand_id = p_user_id) then
    return;
  end if;

  insert into profiles (id, role, full_name, tiktok_handle, payout_provider, payout_number, id_verification_status)
  values (p_user_id, 'creator', 'Demo Creator', '@democreator', 'mtn_momo', '+256770000000', 'verified')
  on conflict (id) do nothing;

  insert into campaigns (brand_id, brand_name, title, topic, angle, must_include, avoid, hashtags, budget, rate_per_1k, deadline, status, funded_amount, spent_amount)
  values (
    p_user_id, 'Sparkling Drinks Co.', 'Sparkling Yuzu Soda — Summer Push',
    'Taste-test the new Sparkling Yuzu Soda and react honestly.',
    'First-sip reaction, no script, outdoors or in a kitchen.',
    'Show the can clearly, mention it has 40% less sugar.',
    'No energy-drink comparisons, no health claims.',
    '#sparklingyuzu #ad',
    800, 1.50, now() + interval '14 days', 'open', 800, 216.50),
  (
    p_user_id, 'Kampala Eats', 'Kampala Street Food Crawl',
    'Feature one street-food vendor and their most popular dish.',
    'Fast-paced montage with price reveal at the end.',
    'Name the vendor and location, show the transaction.',
    'No politics, no alcohol.',
    '#kampalafood #streetfood',
    500, 1.00, now() + interval '21 days', 'open', 500, 62.00),
  (
    p_user_id, 'PixelWorks', 'Budget Phone Photography Challenge',
    'Take three photos on a mid-range phone and let people guess the price.',
    'Reveal the phone price only at the end.',
    'Use natural light, tag the phone brand.',
    'No mocking the brand, no edited images.',
    '#shotonabudget #photography',
    1200, 2.00, now() + interval '30 days', 'open', 1200, 0);

  select id into v_c1 from campaigns where brand_id = p_user_id order by created_at asc limit 1;
  select id into v_c2 from campaigns where brand_id = p_user_id and id <> v_c1 order by created_at asc limit 1;

  insert into submissions (campaign_id, creator_id, tiktok_url, status, verified_views, last_verified_at, earnings, creator_name, tiktok_handle)
  values (
    v_c1, p_user_id, 'https://www.tiktok.com/@democreator/video/7301000000000000001', 'approved',
    84000, now() - interval '1 hour', 126.50, 'Demo Creator', '@democreator'),
  (
    v_c2, p_user_id, 'https://www.tiktok.com/@democreator/video/7301000000000000002', 'submitted',
    0, null, 0, 'Demo Creator', '@democreator');

  select id into v_s1 from submissions where creator_id = p_user_id and status = 'approved' order by created_at asc limit 1;

  insert into earnings (submission_id, campaign_id, creator_id, views_delta, amount)
  values (v_s1, v_c1, p_user_id, 84000, 126.50);
  insert into wallet_transactions (user_id, type, campaign_id, amount, description)
  values (p_user_id, 'earnings_credit', v_c1, 126.50, 'Earnings for verified views');
end;
$$;