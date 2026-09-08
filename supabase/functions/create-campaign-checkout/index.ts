/**
 * create-campaign-checkout — create a NardoPay payment link for campaign funding.
 *
 * Secrets:
 *   NARDOPAY_API_KEY
 *   NARDOPAY_API_URL (default: https://mczqwqsvumfsneoknlep.supabase.co/functions/v1/create-payment-link-api)
 *   PUBLIC_APP_URL (e.g. https://twen.app) — redirect + webhook host
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponseFor(req, { error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
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

  const campaignId = body.campaignId
  if (!campaignId) return jsonResponseFor(req, { error: 'campaignId required' }, 400)

  const { data: campaign, error: campError } = await admin
    .from('campaigns')
    .select('id, brand_id, title, budget, status, brand_name')
    .eq('id', campaignId)
    .maybeSingle()

  if (campError || !campaign) return jsonResponseFor(req, { error: 'Campaign not found' }, 404)
  if (campaign.brand_id !== user.id) return jsonResponseFor(req, { error: 'Not your campaign' }, 403)
  if (campaign.status !== 'draft') return jsonResponseFor(req, { error: 'Campaign is not draft' }, 400)
  if (!campaign.budget || Number(campaign.budget) <= 0) {
    return jsonResponseFor(req, { error: 'Budget must be positive' }, 400)
  }

  const apiKey = Deno.env.get('NARDOPAY_API_KEY')
  if (!apiKey) return jsonResponseFor(req, { error: 'NardoPay is not configured' }, 500)

  const defaultNardoUrl =
    'https://mczqwqsvumfsneoknlep.supabase.co/functions/v1/create-payment-link-api'
  const apiUrl = Deno.env.get('NARDOPAY_API_URL')?.trim() ||
    (Deno.env.get('ALLOW_DEFAULT_NARDOPAY_URL') === 'true' ? defaultNardoUrl : '')
  if (!apiUrl) {
    return jsonResponseFor(req, { error: 'NARDOPAY_API_URL is not configured' }, 500)
  }

  const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? '').replace(/\/$/, '')
  const allowLocal = Deno.env.get('ALLOW_LOCAL_CHECKOUT') === 'true'
  if (!appUrl || (/localhost|127\.0\.0\.1/i.test(appUrl) && !allowLocal)) {
    return jsonResponseFor(
      req,
      { error: 'PUBLIC_APP_URL must be a production https URL (or set ALLOW_LOCAL_CHECKOUT=true)' },
      503,
    )
  }
  const functionsBase = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
  const nardopayWebhook = `${functionsBase}/nardopay-webhook`
  const brandOrigin = roleScopedAppUrl(appUrl, 'brand')
  const redirectUrl = `${brandOrigin}/brand/campaigns/${campaignId}?funded=pending`

  const npRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      link_type: 'payment',
      product_name: `Fund campaign: ${campaign.title}`,
      amount: Number(campaign.budget),
      amount_mode: 'fixed',
      description: `Escrow funding for Twen campaign (${campaign.brand_name || 'brand'})`,
      webhook_url: nardopayWebhook,
      redirect_url: redirectUrl,
      metadata: {
        source: 'unignored',
        campaign_id: campaign.id,
        brand_id: campaign.brand_id,
      },
    }),
  })

  const npJson = await npRes.json().catch(() => ({}))
  if (!npRes.ok || !npJson?.url) {
    console.error('NardoPay create link failed', npRes.status, npJson)
    return jsonResponseFor(req, { error: npJson?.message || 'Could not create payment link' }, 502)
  }

  await admin
    .from('campaigns')
    .update({ nardopay_link_code: npJson.link_code })
    .eq('id', campaign.id)

  return jsonResponseFor(req, {
    url: npJson.url,
    link_code: npJson.link_code,
    link_id: npJson.link_id,
  })
})
