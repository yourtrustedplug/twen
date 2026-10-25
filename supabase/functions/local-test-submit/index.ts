/**
 * local-test-submit — LOCAL HARNESS ONLY.
 *
 * Creates a submitted video row without calling TikTok/Meta. The real
 * verify-submission function requires OAuth tokens and a live platform API;
 * this endpoint lets the local harness exercise review, view accrual, and
 * payout end to end.
 *
 * Hard guards:
 *   - LOCAL_TEST_MODE must be exactly "true"
 *   - SUPABASE_URL must point at a local runtime
 *   - caller must be an onboarded creator
 *   - campaign must be open and accepting submissions
 *
 * Never add this function to scripts/deploy-functions.sh or the production
 * deploy workflow. Even if deployed, production does not set LOCAL_TEST_MODE.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

function isLocalRuntime(): boolean {
  if (Deno.env.get('LOCAL_TEST_MODE') !== 'true') return false
  const raw = Deno.env.get('SUPABASE_URL') ?? ''
  try {
    const host = new URL(raw).hostname
    return host === '127.0.0.1'
      || host === 'localhost'
      || host === '::1'
      || host === '[::1]'
      || host === 'kong'
      || host === 'host.docker.internal'
  } catch {
    return false
  }
}

function fakeUrl(platform: string, handle: string | null): string {
  if (platform === 'instagram') return 'https://www.instagram.com/reel/LOCALTEST01/'
  const normalized = (handle ?? 'twen_test_creator').replace(/^@/, '') || 'twen_test_creator'
  return `https://www.tiktok.com/@${normalized}/video/7000000000000000001`
}

Deno.serve(async (req) => {
  if (!isLocalRuntime()) return jsonResponseFor(req, { error: 'Not found' }, 404)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponseFor(req, { error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? Deno.env.get('SUPABASE_SECRET_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return jsonResponseFor(req, { error: 'Unauthorized' }, 401)

  let body: { campaignId?: string; platform?: string; checklistResults?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const campaignId = body.campaignId?.trim()
  const platform = body.platform === 'instagram' ? 'instagram' : 'tiktok'
  if (!campaignId) return jsonResponseFor(req, { error: 'campaignId required' }, 400)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, full_name, first_name, tiktok_handle, instagram_handle, plan')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !profile) return jsonResponseFor(req, { error: 'Profile not found' }, 404)
  if (profile.role !== 'creator') {
    return jsonResponseFor(req, { error: 'Only creators can submit' }, 403)
  }

  const { data: onboarded, error: onboardError } = await admin.rpc('profile_onboarding_complete', {
    uid: user.id,
  })
  if (onboardError) return jsonResponseFor(req, { error: onboardError.message }, 500)
  if (!onboarded) {
    return jsonResponseFor(req, { error: 'Complete your creator profile first' }, 400)
  }

  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('id, status, deadline, platforms')
    .eq('id', campaignId)
    .maybeSingle()
  if (campaignError || !campaign) return jsonResponseFor(req, { error: 'Campaign not found' }, 404)
  if (campaign.status !== 'open') {
    return jsonResponseFor(req, { error: 'Campaign is not open' }, 400)
  }
  if (campaign.deadline && new Date(campaign.deadline).getTime() < Date.now()) {
    return jsonResponseFor(req, { error: 'Campaign deadline has passed' }, 400)
  }

  const { data: existing, error: existingError } = await admin
    .from('submissions')
    .select('id, status')
    .eq('campaign_id', campaignId)
    .eq('creator_id', user.id)
    .in('status', ['submitted', 'approved'])
    .maybeSingle()
  if (existingError) return jsonResponseFor(req, { error: existingError.message }, 500)
  if (existing) {
    return jsonResponseFor(req, { error: 'You already have an active submission' }, 409)
  }

  const handle = platform === 'instagram' ? profile.instagram_handle : profile.tiktok_handle
  const { data: submission, error: insertError } = await admin
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      creator_id: user.id,
      tiktok_url: fakeUrl(platform, handle),
      platform,
      status: 'submitted',
      creator_name: profile.full_name ?? [profile.first_name].filter(Boolean).join(' '),
      tiktok_handle: handle ?? '',
      checklist_results: Array.isArray(body.checklistResults) ? body.checklistResults : [],
    })
    .select('id, campaign_id, creator_id, status, platform, tiktok_url')
    .maybeSingle()
  if (insertError || !submission) {
    return jsonResponseFor(req, { error: insertError?.message ?? 'Could not create submission' }, 500)
  }

  return jsonResponseFor(req, {
    simulated: true,
    submission,
    message: 'Simulated video submitted for review.',
  })
})
