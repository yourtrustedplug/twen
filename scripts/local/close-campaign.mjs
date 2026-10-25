#!/usr/bin/env node
/**
 * Expire and close an open local campaign so payout/refund behavior can be
 * tested without waiting for the real deadline.
 *
 * Usage:
 *   npm run local:close
 *   npm run local:close -- --campaign <uuid>
 *
 * The real close_campaign function refuses to close a campaign before its
 * deadline. This script first backdates the deadline, then calls that same
 * function with the service role. Local-only: it refuses any non-local
 * Supabase URL.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

function parseArgs() {
  const argv = process.argv.slice(2);
  let campaign = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--campaign') campaign = argv[++i];
    else if (!campaign && !argv[i].startsWith('-')) campaign = argv[i];
  }
  return { campaign };
}

const status = statusEnv();
const supabaseUrl = status.API_URL;
const serviceKey = status.SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Local Supabase is not running. Start it with: npm run local:start');
  process.exit(1);
}

const host = new URL(supabaseUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
  console.error(`Refusing to close a campaign against non-local Supabase: ${supabaseUrl}`);
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { campaign: requestedId } = parseArgs();
let query = admin
  .from('campaigns')
  .select('id, title, status, deadline, funded_amount, spent_amount')
  .order('created_at', { ascending: false })
  .limit(1);

if (requestedId) query = query.eq('id', requestedId);
else query = query.eq('status', 'open');

const { data: campaign, error: lookupError } = await query.maybeSingle();
if (lookupError) throw lookupError;
if (!campaign) {
  console.error(
    requestedId
      ? `Campaign not found: ${requestedId}`
      : 'No open campaign found. Fund a campaign first or pass --campaign <uuid>.',
  );
  process.exit(1);
}

if (campaign.status === 'closed') {
  console.log(`Campaign ${campaign.id} is already closed.`);
  process.exit(0);
}

const yesterday = new Date(Date.now() - 86400_000).toISOString();
const { error: updateError } = await admin
  .from('campaigns')
  .update({ deadline: yesterday })
  .eq('id', campaign.id);
if (updateError) throw updateError;

const { data: refund, error: closeError } = await admin.rpc('close_campaign', {
  p_campaign_id: campaign.id,
});
if (closeError) throw closeError;

const { data: after, error: readError } = await admin
  .from('campaigns')
  .select('id, title, status, deadline, funded_amount, spent_amount, closed_at')
  .eq('id', campaign.id)
  .maybeSingle();
if (readError) throw readError;

console.log(`Closed campaign ${after.id}`);
console.log(`Refund queued: $${Number(refund ?? 0).toFixed(2)}`);
console.log(`Campaign: ${JSON.stringify(after)}`);
