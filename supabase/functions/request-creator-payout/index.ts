/**
 * request-creator-payout — creator withdrawal → ledger + ops email.
 *
 * Real MoMo auto-disburse is not available via NardoPay API key.
 * Staff complete transfers manually, then resolve_payout in Admin.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PAYOUT_OPS_EMAIL (or CONTACT_TO_EMAIL)
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponseFor(req, { error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return jsonResponseFor(req, { error: 'Unauthorized' }, 401)

  let body: { amount?: number; provider?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const amount = Number(body.amount)
  const provider = (body.provider ?? '').trim()
  const phone = (body.phone ?? '').trim()

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponseFor(req, { error: 'Amount must be positive' }, 400)
  }
  if (!['mtn_momo', 'airtel_money'].includes(provider)) {
    return jsonResponseFor(req, { error: 'Invalid provider' }, 400)
  }
  if (!phone || phone.length < 8) {
    return jsonResponseFor(req, { error: 'Valid mobile money number required' }, 400)
  }

  const { data: payoutId, error: rpcError } = await userClient.rpc('request_payout', {
    p_amount: amount,
    p_provider: provider,
    p_phone: phone,
  })

  if (rpcError) {
    return jsonResponseFor(req, { error: rpcError.message }, 400)
  }

  // Best-effort ops email
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Twen <onboarding@resend.dev>'
  const to =
    Deno.env.get('PAYOUT_OPS_EMAIL') ??
    Deno.env.get('CONTACT_TO_EMAIL') ??
    'hello@twen.app'

  if (apiKey) {
    const label = provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Payout request · ${amount} · ${label}`,
          html: `
            <h2>Creator payout queued</h2>
            <p><strong>Payout id:</strong> ${payoutId}</p>
            <p><strong>Creator:</strong> ${user.id}</p>
            <p><strong>Amount:</strong> ${amount}</p>
            <p><strong>Provider:</strong> ${label}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p>Send MoMo, then mark completed in Admin → Payouts.</p>
          `,
        }),
      })
    } catch (e) {
      console.error('payout ops email failed', e)
    }
  }

  return jsonResponseFor(req, {
    ok: true,
    payout_id: payoutId,
    message: 'Queued for mobile money. Staff will process within 1–2 business days.',
  })
})
