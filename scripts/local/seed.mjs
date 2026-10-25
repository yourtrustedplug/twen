#!/usr/bin/env node
/**
 * Seed local test accounts and a draft campaign.
 *
 * This script refuses to run unless Supabase is the local stack. It uses the
 * local service-role key from `supabase status`, so it must never be pointed at
 * production.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PASSWORD = 'TwenLocalTest!2026';

function statusEnv() {
  const raw = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function assertLocal(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Supabase URL: ${url}`);
  }
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname)) {
    throw new Error(`Refusing to seed non-local Supabase URL: ${url}`);
  }
}

const status = statusEnv();
const supabaseUrl = status.API_URL;
const serviceKey = status.SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Could not read local Supabase URL/service key from `supabase status -o env`.');
  console.error('Start the stack first: npm run local:start');
  process.exit(1);
}
assertLocal(supabaseUrl);

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    email: 'brand@twen.test',
    role: 'brand',
    roles: ['brand'],
    full_name: 'Twen Test Brand',
    first_name: 'Twen',
    last_name: 'Brand',
    company_name: 'Twen Test Co.',
    city: 'Kampala',
    country: 'Uganda',
    avatar_url: 'https://twen.app/twen-logo.png',
    website: 'https://twen.test',
    brand_primary_color: '#0A101D',
    brand_secondary_color: '#FFB0B6',
    brand_socials: {
      instagram: 'https://instagram.com/twentest',
      tiktok: 'https://tiktok.com/@twentest',
    },
    plan: 'free',
    id_verification_status: 'verified',
  },
  {
    email: 'creator@twen.test',
    role: 'creator',
    roles: ['creator'],
    full_name: 'Twen Test Creator',
    first_name: 'Twen',
    last_name: 'Creator',
    company_name: null,
    city: 'Kampala',
    country: 'Uganda',
    tiktok_handle: '@twen_test_creator',
    tiktok_connected_at: new Date().toISOString(),
    payout_provider: 'mtn_momo',
    payout_number: '+256770000001',
    plan: 'pro',
    id_verification_status: 'verified',
  },
  {
    email: 'admin@twen.test',
    role: 'admin',
    roles: ['admin', 'moderator', 'creator', 'brand'],
    full_name: 'Twen Test Admin',
    first_name: 'Twen',
    last_name: 'Admin',
    company_name: null,
    city: 'Kampala',
    country: 'Uganda',
    plan: 'free',
    id_verification_status: 'verified',
  },
];

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(account) {
  const existing = await findUserByEmail(account.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: account.full_name,
        role: account.role,
      },
    });
    if (error) throw error;
    return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.full_name,
      role: account.role,
    },
  });
  if (error || !data.user) throw error ?? new Error('Could not create local test user');
  return data.user;
}

const created = {};
for (const account of accounts) {
  const user = await ensureUser(account);
  created[account.role] = user;

  const profile = {
    id: user.id,
    role: account.role,
    roles: account.roles,
    full_name: account.full_name,
    first_name: account.first_name,
    last_name: account.last_name,
    company_name: account.company_name,
    city: account.city,
    country: account.country,
    avatar_url: account.avatar_url ?? null,
    website: account.website ?? '',
    brand_primary_color: account.brand_primary_color ?? '',
    brand_secondary_color: account.brand_secondary_color ?? '',
    brand_socials: account.brand_socials ?? {},
    tiktok_handle: account.tiktok_handle ?? null,
    tiktok_connected_at: account.tiktok_connected_at ?? null,
    payout_provider: account.payout_provider ?? null,
    payout_number: account.payout_number ?? null,
    id_verification_status: account.id_verification_status,
    plan: account.plan,
    plan_renews_at: account.plan === 'pro' ? new Date(Date.now() + 30 * 86400_000).toISOString() : null,
    marketplace_visible: account.role === 'creator',
  };

  const { error } = await admin.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

const brandId = created.brand.id;
const creatorId = created.creator.id;

const { error: accountError } = await admin.from('withdrawal_accounts').upsert(
  {
    creator_id: creatorId,
    country: 'Uganda',
    method: 'mtn_momo',
    account_number: '+256770000001',
    account_name: 'Twen Test Creator',
  },
  { onConflict: 'creator_id' },
);
if (accountError) throw accountError;

const { data: existingCampaigns, error: campaignLookupError } = await admin
  .from('campaigns')
  .select('id')
  .eq('brand_id', brandId)
  .limit(1);
if (campaignLookupError) throw campaignLookupError;

let campaignId = existingCampaigns?.[0]?.id ?? null;
if (!campaignId) {
  const now = Date.now();
  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .insert({
      brand_id: brandId,
      brand_name: 'Twen Test Co.',
      title: 'Local Test — Coffee Launch',
      topic: 'Taste-test the new coffee and react honestly.',
      angle: 'First-sip reaction, no script.',
      must_include: 'Show the bag clearly and say it is a local test.',
      avoid: 'No health claims.',
      hashtags: '#local #ad',
      budget: 100,
      rate_per_1k: 2,
      deadline: new Date(now + 14 * 86400_000).toISOString(),
      status: 'draft',
      niche: 'Food & beverage',
      platforms: ['tiktok'],
      checklist: [],
      asset_urls: [],
      links: [],
      socials: {},
    })
    .select('id')
    .maybeSingle();
  if (campaignError || !campaign) throw campaignError ?? new Error('Could not create test campaign');
  campaignId = campaign.id;
}

console.log('\nLocal test accounts seeded');
console.log('──────────────────────────');
for (const account of accounts) {
  console.log(`${account.role.padEnd(8)} ${account.email}  /  ${PASSWORD}`);
}
console.log(`\nDraft campaign: ${campaignId}`);
console.log('Open: http://localhost:8080/local-test');
console.log('Everything here is in the local Supabase database only.\n');
