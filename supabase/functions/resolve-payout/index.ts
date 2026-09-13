/**
 * resolve-payout — staff mark a withdrawal sent or failed, then email the creator.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PUBLIC_APP_URL
 */
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'
import { earningsUrl, payoutAccountUrl, payoutFailedMail, payoutSentMail } from '../_shared/mail.ts'
import { appUrl, emailUser, greetingName, requireStaff } from '../_shared/resend.ts'

function destinationTail(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '')
  const tail = digits.slice(-3)
  return tail ? `${'*'.repeat(5)}${tail}` : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const staff = await requireStaff(req)
  if ('error' in staff) return jsonResponseFor(req, { error: staff.error }, staff.status)
  const { admin, userSb } = staff

  let body: { payout_id?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const payoutId = body.payout_id?.trim()
  const status = body.status
  if (!payoutId) return jsonResponseFor(req, { error: 'payout_id is required' }, 400)
  if (status !== 'completed' && status !== 'failed') {
    return jsonResponseFor(req, { error: 'status must be completed or failed' }, 400)
  }

  const { data: payout, error: loadError } = await admin
    .from('payouts')
    .select('id, status, amount, creator_id, provider, phone')
    .eq('id', payoutId)
    .maybeSingle()
  if (loadError) return jsonResponseFor(req, { error: loadError.message }, 500)
  if (!payout) return jsonResponseFor(req, { error: 'Payout not found' }, 404)
  if (!['pending', 'processing', 'queued'].includes(payout.status)) {
    return jsonResponseFor(req, { error: 'Payout already resolved' }, 409)
  }

  const { error: rpcError } = await userSb.rpc('resolve_payout', {
    p_payout_id: payoutId,
    p_status: status,
    p_note: status === 'completed' ? 'MoMo sent' : 'Payout failed',
  })
  if (rpcError) return jsonResponseFor(req, { error: rpcError.message }, 400)

  const { data: creatorProfile } = await admin
    .from('profiles')
    .select('first_name, full_name')
    .eq('id', payout.creator_id)
    .maybeSingle()
  const firstName = greetingName(creatorProfile)
  const creatorOrigin = roleScopedAppUrl(appUrl(), 'creator')
  const mail =
    status === 'completed'
      ? payoutSentMail({
          firstName,
          amount: payout.amount,
          method: payout.provider,
          destination: destinationTail(payout.phone),
          earningsUrl: earningsUrl(creatorOrigin),
        })
      : payoutFailedMail({
          firstName,
          amount: payout.amount,
          method: payout.provider,
          accountUrl: payoutAccountUrl(creatorOrigin),
        })
  const emailed = await emailUser(admin, payout.creator_id, mail)

  return jsonResponseFor(req, { ok: true, status, emailed })
})
