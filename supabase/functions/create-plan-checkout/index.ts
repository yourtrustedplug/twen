/**
 * create-plan-checkout — reuse a stored NardoPay plan link, or create it once.
 *
 * Secrets: NARDOPAY_API_KEY, NARDOPAY_API_URL, PUBLIC_APP_URL,
 *          CREATOR_PRO_AMOUNT (default 9), PRO_PLAN_AMOUNT (brand, default 49)
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'
import { planAmountForRole } from '../_shared/plan-amounts.ts'
import { amountsMatch, createNardoPayPaymentLink } from '../_shared/nardopay.ts'

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
  if (profile.plan === 'pro') {
    const label = profile.role === 'brand' ? 'Twen Plus' : 'Creator Pro'
    return jsonResponseFor(req, { error: `Already on ${label}` }, 400)
  }
  if (profile.role !== 'brand' && profile.role !== 'creator') {
    return jsonResponseFor(req, { error: 'Only brands and creators can upgrade' }, 400)
  }

  const amount = planAmountForRole(profile.role)
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponseFor(req, { error: 'Plan amount is not configured' }, 500)
  }

  const { data: cached } = await admin
    .from('profiles')
    .select('nardopay_checkout_url, nardopay_checkout_amount')
    .eq('id', user.id)
    .maybeSingle()
  const cachedUrl = typeof cached?.nardopay_checkout_url === 'string'
    ? cached.nardopay_checkout_url.trim()
    : ''
  if (cachedUrl && amountsMatch(cached?.nardopay_checkout_amount, amount)) {
    return jsonResponseFor(req, { url: cachedUrl, amount, reused: true })
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
  const redirectUrl = `${roleOrigin}/${profile.role === 'brand' ? 'brand/profile' : 'creator/profile'}?tab=plan&upgraded=pending`

  const created = await createNardoPayPaymentLink({
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
      amount,
    },
  })
  if ('error' in created) {
    return jsonResponseFor(req, { error: created.error }, created.status)
  }

  await admin
    .from('profiles')
    .update({
      nardopay_checkout_url: created.url,
      nardopay_checkout_amount: amount,
      nardopay_link_code: created.link_code ?? null,
    })
    .eq('id', user.id)

  return jsonResponseFor(req, {
    url: created.url,
    link_code: created.link_code,
    amount,
    reused: false,
  })
})
