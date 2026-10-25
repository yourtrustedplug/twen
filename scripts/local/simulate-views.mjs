#!/usr/bin/env node
/**
 * Simulate verified views on an approved local submission.
 *
 * Usage:
 *   npm run local:views -- --views 25000
 *   npm run local:views -- --submission <uuid> --views 25000
 *
 * This calls the same accrue_views database function the production view
 * verifier uses. It is local-only and refuses any non-local Supabase URL.
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

function args() {
  const result = { views: 25_000, submission: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--views') result.views = Number(argv[++i]);
    else if (argv[i] === '--submission') result.submission = argv[++i];
  }
  return result;
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
  console.error(`Refusing to simulate views against non-local Supabase: ${supabaseUrl}`);
  process.exit(1);
}

const { views, submission: requestedId } = args();
if (!Number.isFinite(views) || views <= 0) {
  console.error('--views must be a positive number');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let submission = null;
if (requestedId) {
  const { data, error } = await admin.from('submissions').select('*').eq('id', requestedId).maybeSingle();
  if (error) throw error;
  submission = data;
} else {
  const { data, error } = await admin
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  submission = data;
}

if (!submission) {
  console.error('No approved submission found. Sign in as creator, submit a video, then approve it as admin.');
  process.exit(1);
}

const current = Number(submission.verified_views) || 0;
const target = Math.max(views, current + Math.max(1_000, Math.round(views * 0.25)));

const { data, error } = await admin.rpc('accrue_views', {
  p_submission_id: submission.id,
  p_new_views: target,
});
if (error) throw error;

const { data: updated, error: readError } = await admin
  .from('submissions')
  .select('id, status, verified_views, earnings, campaign_id')
  .eq('id', submission.id)
  .maybeSingle();
if (readError) throw readError;

console.log(`Simulated views for submission ${submission.id}`);
console.log(`Target views: ${target}`);
console.log(`Accrued this run: $${Number(data ?? 0).toFixed(2)}`);
console.log(`Submission: ${JSON.stringify(updated)}`);
