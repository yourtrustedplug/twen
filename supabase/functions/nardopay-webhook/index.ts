/**
 * nardopay-webhook — payment.completed → campaign escrow or Pro upgrade.
 *
 * Expects X-NardoPay-Signature = HMAC-SHA256 hex of raw body
 * using NARDOPAY_WEBHOOK_SECRET (must match NardoPay project secret).
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

async function hmacHex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const secret = Deno.env.get('NARDOPAY_WEBHOOK_SECRET')?.trim()
  if (!secret) {
    return jsonResponse({ error: 'NARDOPAY_WEBHOOK_SECRET is not configured' }, 503)
  }

  const raw = await req.text()
  const signature = req.headers.get('X-NardoPay-Signature') || ''
  const expected = await hmacHex(secret, raw)

  if (!signature || !timingSafeEqual(signature, expected)) {
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }

  let body: {
    event?: string
    transaction_id?: string
    reference?: string
    status?: string
    amount?: number
    metadata?: {
      campaign_id?: string
      brand_id?: string
      source?: string
      kind?: string
      user_id?: string
    }
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  if (body.event !== 'payment.completed' || body.status !== 'completed') {
    return jsonResponse({ ok: true, ignored: true })
  }

  if (body.metadata?.source !== 'unignored') {
    return jsonResponse({ ok: true, ignored: true, reason: 'foreign_source' })
  }

  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount)) {
    return jsonResponse({ error: 'Missing amount' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const paymentRef = (body.transaction_id ?? body.reference ?? '').trim()
  if (!paymentRef) {
    return jsonResponse({ error: 'Missing payment reference' }, 400)
  }

  // Absolute tolerance only (reject percentage underpayments that slip past OR-logic).
  const amountMismatch = (expected: number, got: number) => Math.abs(got - expected) > 0.01

  // Pro plan upgrade
  if (body.metadata?.kind === 'plan_upgrade' && body.metadata.user_id) {
    const expectedAmount = Number(Deno.env.get('PRO_PLAN_AMOUNT') ?? '49')
    if (Number.isFinite(expectedAmount) && amountMismatch(expectedAmount, Number(body.amount))) {
      return jsonResponse({ error: 'Plan amount mismatch' }, 400)
    }
    const { error } = await admin.rpc('confirm_plan_upgrade', {
      p_user_id: body.metadata.user_id,
      p_payment_ref: paymentRef,
    })
    if (error) {
      console.error('confirm_plan_upgrade', error)
      return jsonResponse({ error: error.message }, 500)
    }
    return jsonResponse({ ok: true, kind: 'plan_upgrade', user_id: body.metadata.user_id })
  }

  const campaignId = body.metadata?.campaign_id
  if (!campaignId) {
    return jsonResponse({ error: 'Missing campaign_id in metadata' }, 400)
  }

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, brand_id, budget, status')
    .eq('id', campaignId)
    .maybeSingle()

  if (!campaign) return jsonResponse({ error: 'Campaign not found' }, 404)

  const metaBrand = body.metadata?.brand_id
  if (metaBrand && campaign.brand_id && metaBrand !== campaign.brand_id) {
    return jsonResponse({ error: 'brand_id mismatch' }, 400)
  }

  if (Number(campaign.budget) > 0 && amountMismatch(Number(campaign.budget), Number(body.amount))) {
    console.error('Amount mismatch', { expected: campaign.budget, got: body.amount })
    return jsonResponse({ error: 'Amount mismatch' }, 400)
  }

  const { error } = await admin.rpc('confirm_campaign_funding', {
    p_campaign_id: campaignId,
    p_payment_ref: paymentRef,
  })

  if (error) {
    console.error('confirm_campaign_funding', error)
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({ ok: true, campaign_id: campaignId })
})
