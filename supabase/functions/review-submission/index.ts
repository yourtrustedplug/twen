/**
 * review-submission — staff approve or reject a queued creator video.
 *
 * Reject requires a written reason. That reason is stored on the row and emailed
 * to the creator via Resend. Approval does not email.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PUBLIC_APP_URL
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'

const MAX_REJECTION_REASON = 1000

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function userClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function creatorEmail(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): string | null {
  const fromAuth = user.email?.trim().toLowerCase()
  if (fromAuth && fromAuth.includes('@')) return fromAuth
  const meta = user.user_metadata?.email
  if (typeof meta === 'string' && meta.includes('@')) return meta.trim().toLowerCase()
  return null
}

function rejectionMail(opts: {
  firstName: string
  campaignTitle: string
  brandName: string
  reason: string
  campaignUrl: string
}) {
  const title = opts.campaignTitle.trim() || 'a campaign'
  const brief = opts.brandName.trim() ? `${title} (${opts.brandName.trim()})` : title
  const hi = opts.firstName.trim() ? `Hi ${opts.firstName.trim()},` : 'Hi,'
  const subject = `Your video for ${title} was not approved`
  const text = [
    hi,
    '',
    `A moderator reviewed your video for ${brief} and did not approve it.`,
    '',
    `Reason: ${opts.reason}`,
    '',
    'You can post a new video for this brief and submit that link instead:',
    opts.campaignUrl,
    '',
    '— Twen',
  ].join('\n')
  const html = `
    <p>${escapeHtml(hi)}</p>
    <p>A moderator reviewed your video for <strong>${escapeHtml(brief)}</strong> and did not approve it.</p>
    <p><strong>Reason:</strong><br />${escapeHtml(opts.reason).replaceAll('\n', '<br />')}</p>
    <p><a href="${escapeHtml(opts.campaignUrl)}">Submit a new video</a></p>
    <p>— Twen</p>
  `
  return { subject, text, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const userSb = userClient(req)
  const { data: authData, error: authError } = await userSb.auth.getUser()
  if (authError || !authData.user) return jsonResponseFor(req, { error: 'Sign in first' }, 401)

  const admin = adminClient()
  const { data: staffProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (staffProfile?.role !== 'moderator' && staffProfile?.role !== 'admin') {
    return jsonResponseFor(req, { error: 'Only staff can review submissions' }, 403)
  }

  let body: { submission_id?: string; status?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const submissionId = body.submission_id?.trim()
  const status = body.status
  if (!submissionId) return jsonResponseFor(req, { error: 'submission_id is required' }, 400)
  if (status !== 'approved' && status !== 'rejected') {
    return jsonResponseFor(req, { error: 'status must be approved or rejected' }, 400)
  }

  const reason = (body.reason ?? '').trim()
  if (status === 'rejected') {
    if (!reason) return jsonResponseFor(req, { error: 'Add a rejection reason' }, 400)
    if (reason.length > MAX_REJECTION_REASON) {
      return jsonResponseFor(req, { error: `Keep the reason under ${MAX_REJECTION_REASON} characters.` }, 400)
    }
  }

  const { data: submission, error: loadError } = await admin
    .from('submissions')
    .select('id, status, creator_id, campaign_id, campaigns(title, brand_name)')
    .eq('id', submissionId)
    .maybeSingle()
  if (loadError) return jsonResponseFor(req, { error: loadError.message }, 500)
  if (!submission) return jsonResponseFor(req, { error: 'Submission not found' }, 404)
  if (submission.status !== 'submitted') {
    return jsonResponseFor(req, { error: 'This submission is no longer waiting for review' }, 409)
  }

  const { data: written, error: writeError } = await admin
    .from('submissions')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason : null,
    })
    .eq('id', submissionId)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()
  if (writeError) return jsonResponseFor(req, { error: writeError.message }, 500)
  if (!written) {
    return jsonResponseFor(req, { error: 'This submission is no longer waiting for review' }, 409)
  }

  if (status !== 'rejected') {
    return jsonResponseFor(req, { ok: true, status, emailed: false })
  }

  const campaignRel = submission.campaigns as
    | { title?: string; brand_name?: string }
    | { title?: string; brand_name?: string }[]
    | null
  const campaign = Array.isArray(campaignRel) ? campaignRel[0] : campaignRel
  const { data: creatorProfile } = await admin
    .from('profiles')
    .select('first_name, full_name')
    .eq('id', submission.creator_id)
    .maybeSingle()
  const { data: creatorAuth, error: creatorAuthError } = await admin.auth.admin.getUserById(
    submission.creator_id,
  )
  if (creatorAuthError) console.error('creator email lookup', creatorAuthError.message)

  const to = creatorAuth?.user ? creatorEmail(creatorAuth.user) : null
  const appUrl = Deno.env.get('PUBLIC_APP_URL') ?? 'https://twen.app'
  const campaignUrl = `${roleScopedAppUrl(appUrl, 'creator')}/creator/campaigns/${submission.campaign_id}?submit=1`
  const firstName =
    creatorProfile?.first_name?.trim() ||
    creatorProfile?.full_name?.trim()?.split(/\s+/)[0] ||
    ''
  const mail = rejectionMail({
    firstName,
    campaignTitle: campaign?.title ?? 'this campaign',
    brandName: campaign?.brand_name ?? '',
    reason,
    campaignUrl,
  })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Twen <hello@twen.app>'
  let emailed = false
  if (!to) {
    console.error('reject email skipped — creator has no email', submission.creator_id)
  } else if (!apiKey) {
    console.error('reject email skipped — RESEND_API_KEY is not set')
  } else {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        }),
      })
      if (res.ok) {
        emailed = true
      } else {
        console.error('reject Resend error', res.status, (await res.text()).slice(0, 400))
      }
    } catch (e) {
      console.error('reject email failed', e)
    }
  }

  return jsonResponseFor(req, { ok: true, status, emailed })
})
