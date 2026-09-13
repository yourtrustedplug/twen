/**
 * review-submission — staff approve or reject a queued creator video.
 *
 * Reject requires a written reason. That reason is stored on the row and emailed
 * to the creator. Approval emails the creator and the brand.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PUBLIC_APP_URL
 */
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'
import {
  approvalMail,
  brandCampaignUrl,
  brandGotCreatorMail,
  creatorCampaignUrl,
  rejectionMail,
} from '../_shared/mail.ts'
import { appUrl, emailUser, greetingName, requireStaff } from '../_shared/resend.ts'

const MAX_REJECTION_REASON = 1000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const staff = await requireStaff(req)
  if ('error' in staff) return jsonResponseFor(req, { error: staff.error }, staff.status)
  const { admin } = staff

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
    .select('id, status, creator_id, campaign_id, campaigns(title, brand_name, brand_id)')
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

  const campaignRel = submission.campaigns as
    | { title?: string; brand_name?: string; brand_id?: string }
    | { title?: string; brand_name?: string; brand_id?: string }[]
    | null
  const campaign = Array.isArray(campaignRel) ? campaignRel[0] : campaignRel
  const { data: creatorProfile } = await admin
    .from('profiles')
    .select('first_name, full_name')
    .eq('id', submission.creator_id)
    .maybeSingle()
  const creatorName =
    creatorProfile?.full_name?.trim() || greetingName(creatorProfile) || 'A creator'
  const firstName = greetingName(creatorProfile)
  const publicUrl = appUrl()
  const creatorOrigin = roleScopedAppUrl(publicUrl, 'creator')
  const brandOrigin = roleScopedAppUrl(publicUrl, 'brand')
  const campaignTitle = campaign?.title ?? 'this campaign'
  const brandName = campaign?.brand_name ?? ''

  let emailed = false
  let brandEmailed = false

  if (status === 'rejected') {
    emailed = await emailUser(
      admin,
      submission.creator_id,
      rejectionMail({
        firstName,
        campaignTitle,
        brandName,
        reason,
        campaignUrl: creatorCampaignUrl(creatorOrigin, submission.campaign_id, true),
      }),
    )
  } else {
    emailed = await emailUser(
      admin,
      submission.creator_id,
      approvalMail({
        firstName,
        campaignTitle,
        brandName,
        campaignUrl: creatorCampaignUrl(creatorOrigin, submission.campaign_id),
      }),
    )
    const brandId = campaign?.brand_id
    if (brandId) {
      const { data: brandProfile } = await admin
        .from('profiles')
        .select('first_name, full_name, company_name')
        .eq('id', brandId)
        .maybeSingle()
      brandEmailed = await emailUser(
        admin,
        brandId,
        brandGotCreatorMail({
          firstName: greetingName(brandProfile),
          creatorName,
          campaignTitle,
          campaignUrl: brandCampaignUrl(brandOrigin, submission.campaign_id),
        }),
      )
    }
  }

  return jsonResponseFor(req, { ok: true, status, emailed, brand_emailed: brandEmailed })
})
