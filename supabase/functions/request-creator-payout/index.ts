/**
 * request-creator-payout — creator withdrawal → ledger + ops email.
 *
 * Destination comes from the creator's saved withdrawal account.
 * Staff complete transfers manually, then resolve_payout in Admin.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PAYOUT_OPS_EMAIL (or CONTACT_TO_EMAIL)
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

const METHOD_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  airteltigo_money: 'AirtelTigo Money',
  ecocash: 'EcoCash',
  emola: 'e-Mola',
  innbucks: 'InnBucks',
  mixx_yas: 'Mixx by Yas',
  moov_money: 'Moov Money',
  mpesa: 'M-Pesa',
  mtn_momo: 'MTN MoMo',
  onemoney: 'OneMoney',
  opay: 'OPay',
  orange_money: 'Orange Money',
  palmpay: 'PalmPay',
  telecel_cash: 'Telecel Cash',
  tnm_mpamba: 'TNM Mpamba',
  wave: 'Wave',
}

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

  let body: { amount?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponseFor(req, { error: 'Amount must be positive' }, 400)
  }

  const { data: account, error: accountError } = await userClient
    .from('withdrawal_accounts')
    .select('country, method, account_number, account_name')
    .eq('creator_id', user.id)
    .maybeSingle()

  if (accountError) {
    return jsonResponseFor(req, { error: accountError.message }, 400)
  }
  if (!account) {
    return jsonResponseFor(req, { error: 'Set up a withdrawal account first' }, 400)
  }

  const { data: payoutId, error: rpcError } = await userClient.rpc('request_payout', {
    p_amount: amount,
    p_provider: account.method,
    p_phone: account.account_number,
  })

  if (rpcError) {
    return jsonResponseFor(req, { error: rpcError.message }, 400)
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Twen <hello@twen.app>'
  const to =
    Deno.env.get('PAYOUT_OPS_EMAIL') ??
    Deno.env.get('CONTACT_TO_EMAIL') ??
    'hello@twen.app'

  if (apiKey) {
    const label = METHOD_LABELS[account.method] ?? account.method
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
            <p><strong>Country:</strong> ${account.country}</p>
            <p><strong>Method:</strong> ${label}</p>
            <p><strong>Number:</strong> ${account.account_number}</p>
            <p><strong>Account name:</strong> ${account.account_name || '—'}</p>
            <p>Send mobile money, then mark completed in Admin → Payouts.</p>
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
    message: `Paying out ${METHOD_LABELS[account.method] ?? account.method} now.`,
  })
})
