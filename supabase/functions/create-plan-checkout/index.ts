/**
 * create-plan-checkout — NardoPay payment link for Brands/Creator Pro.
 *
 * Secrets: NARDOPAY_API_KEY, NARDOPAY_API_URL, PUBLIC_APP_URL,
 *          PRO_PLAN_AMOUNT (default 49), PRO_PLAN_CURRENCY optional via NardoPay profile
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

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, plan, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return jsonResponseFor(req, { error: 'Profile not found' }, 404)
  if (profile.plan === 'pro') return jsonResponseFor(req, { error: 'Already on Pro' }, 400)
  if (profile.role !== 'brand' && profile.role !== 'creator') {
    return jsonResponseFor(req, { error: 'Only brands and creators can upgrade' }, 400)
  }

  const amount = Number(Deno.env.get('PRO_PLAN_AMOUNT') ?? '49')
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponseFor(req, { error: 'PRO_PLAN_AMOUNT is not configured' }, 500)
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
  const planLabel = profile.role === 'brand' ? 'Twen Plus' : 'Creator Pro'
  const roleOrigin = roleScopedAppUrl(
    appUrl,
    profile.role === 'brand' ? 'brand' : 'creator',
  )
  const redirectUrl = `${roleOrigin}/${profile.role === 'brand' ? 'brand' : 'creator'}?upgraded=pending`

  const npRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      link_type: 'payment',
      product_name: profile.role === 'brand' ? 'Twen Plus' : 'Twen Creator Pro',
      amount,
      amount_mode: 'fixed',
      description: `Monthly ${planLabel} subscription`,
      webhook_url: `${functionsBase}/nardopay-webhook`,
      redirect_url: redirectUrl,
      metadata: {
        source: 'unignored',
        kind: 'plan_upgrade',
        user_id: user.id,
        role: profile.role,
      },
    }),
  })

  const npJson = await npRes.json().catch(() => ({}))
  if (!npRes.ok || !npJson?.url) {
    console.error('NardoPay plan link failed', npRes.status, npJson)
    return jsonResponseFor(req, { error: npJson?.message || 'Could not create payment link' }, 502)
  }

  return jsonResponseFor(req, {
    url: npJson.url,
    link_code: npJson.link_code,
    amount,
  })
})
