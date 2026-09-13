/**
 * review-id — staff verify or reject a queued identity document.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PUBLIC_APP_URL
 */
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { emailKycDecision, greetingName, requireStaff } from '../_shared/resend.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const staff = await requireStaff(req)
  if ('error' in staff) return jsonResponseFor(req, { error: staff.error }, staff.status)
  const { admin } = staff

  let body: { user_id?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const userId = body.user_id?.trim()
  const status = body.status
  if (!userId) return jsonResponseFor(req, { error: 'user_id is required' }, 400)
  if (status !== 'verified' && status !== 'rejected') {
    return jsonResponseFor(req, { error: 'status must be verified or rejected' }, 400)
  }

  const { data: profile, error: loadError } = await admin
    .from('profiles')
    .select('id, role, first_name, full_name, id_verification_status')
    .eq('id', userId)
    .maybeSingle()
  if (loadError) return jsonResponseFor(req, { error: loadError.message }, 500)
  if (!profile) return jsonResponseFor(req, { error: 'Profile not found' }, 404)
  if (profile.role !== 'creator') {
    return jsonResponseFor(req, { error: 'Only creator IDs are reviewed here' }, 400)
  }
  if (profile.id_verification_status !== 'pending') {
    return jsonResponseFor(req, { error: 'This ID is no longer waiting for review' }, 409)
  }

  const { data: written, error: writeError } = await admin
    .from('profiles')
    .update({ id_verification_status: status })
    .eq('id', userId)
    .eq('id_verification_status', 'pending')
    .select('id')
    .maybeSingle()
  if (writeError) return jsonResponseFor(req, { error: writeError.message }, 500)
  if (!written) {
    return jsonResponseFor(req, { error: 'This ID is no longer waiting for review' }, 409)
  }

  const emailed = await emailKycDecision(admin, {
    userId,
    firstName: greetingName(profile),
    status,
  })

  return jsonResponseFor(req, { ok: true, status, emailed })
})
