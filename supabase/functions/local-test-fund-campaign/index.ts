/**
 * local-test-fund-campaign — LOCAL HARNESS ONLY.
 *
 * Simulates a successful NardoPay payment by calling the same trusted database
 * function the real webhook uses. It never calls NardoPay and never moves money.
 *
 * Hard guards:
 *   - LOCAL_TEST_MODE must be exactly "true"
 *   - SUPABASE_URL must point at localhost / 127.0.0.1 / ::1
 *   - caller must be signed in and own a draft campaign
 *
 * This function is intentionally excluded from scripts/deploy-functions.sh and
 * .github/workflows/deploy-functions.yml. Even if it were deployed by mistake,
 * production does not set LOCAL_TEST_MODE and the URL is not local, so it 404s.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

function isLocalRuntime(): boolean {
  if (Deno.env.get('LOCAL_TEST_MODE') !== 'true') return false
  const raw = Deno.env.get('SUPABASE_URL') ?? ''
  try {
    const host = new URL(raw).hostname
    // Supabase's local edge runtime resolves SUPABASE_URL to the internal
    // kong service (http://kong:8000). Production always resolves to a real
    // *.supabase.co host. LOCAL_TEST_MODE is the primary gate.
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

Deno.serve(async (req) => {
  if (!isLocalRuntime()) {
    return jsonResponseFor(req, { error: 'Not found' }, 404)
  }
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

  let body: { campaignId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const campaignId = body.campaignId?.trim()
  if (!campaignId) return jsonResponseFor(req, { error: 'campaignId required' }, 400)

  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('id, brand_id, title, budget, rate_per_1k, status')
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignError || !campaign) {
    return jsonResponseFor(req, { error: 'Campaign not found' }, 404)
  }
  if (campaign.brand_id !== user.id) {
    return jsonResponseFor(req, { error: 'Not your campaign' }, 403)
  }
  if (campaign.status !== 'draft') {
    return jsonResponseFor(req, { error: 'Campaign is not a draft' }, 400)
  }
  if (!campaign.budget || Number(campaign.budget) < 10) {
    return jsonResponseFor(req, { error: 'Budget is too low' }, 400)
  }
  if (!campaign.rate_per_1k || Number(campaign.rate_per_1k) < 1) {
    return jsonResponseFor(req, { error: 'Rate must be at least $1.00 per 1,000 views' }, 400)
  }

  const paymentRef = `local-test-${crypto.randomUUID()}`
  const { error: fundError } = await admin.rpc('confirm_campaign_funding', {
    p_campaign_id: campaignId,
    p_payment_ref: paymentRef,
  })
  if (fundError) {
    console.error('local-test-fund-campaign', fundError)
    return jsonResponseFor(req, { error: fundError.message }, 500)
  }

  const { data: updated } = await admin
    .from('campaigns')
    .select('id, status, funded_amount, budget, nardopay_payment_ref')
    .eq('id', campaignId)
    .maybeSingle()

  return jsonResponseFor(req, {
    simulated: true,
    payment_ref: paymentRef,
    campaign: updated,
  })
})
