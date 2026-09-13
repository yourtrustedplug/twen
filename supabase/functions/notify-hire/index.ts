/**
 * notify-hire — email the creator when a brand books or hires them.
 *
 * Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, PUBLIC_APP_URL
 */
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'
import { hireMail, messagesUrl } from '../_shared/mail.ts'
import { appUrl, emailUser, greetingName, requireAuthedUser } from '../_shared/resend.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const authed = await requireAuthedUser(req)
  if ('error' in authed) return jsonResponseFor(req, { error: authed.error }, authed.status)
  const { admin, user } = authed

  let body: { conversation_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const conversationId = body.conversation_id?.trim()
  if (!conversationId) return jsonResponseFor(req, { error: 'conversation_id is required' }, 400)

  const { data: conversation, error: loadError } = await admin
    .from('conversations')
    .select('id, brand_id, creator_id, brand_name, kind')
    .eq('id', conversationId)
    .maybeSingle()
  if (loadError) return jsonResponseFor(req, { error: loadError.message }, 500)
  if (!conversation) return jsonResponseFor(req, { error: 'Conversation not found' }, 404)
  if (conversation.kind === 'twen') {
    return jsonResponseFor(req, { error: 'Not a hire conversation' }, 400)
  }
  if (conversation.brand_id !== user.id) {
    return jsonResponseFor(req, { error: 'Only the brand can send this notice' }, 403)
  }

  const { data: creatorProfile } = await admin
    .from('profiles')
    .select('first_name, full_name, rate_per_video')
    .eq('id', conversation.creator_id)
    .maybeSingle()
  const { data: brandProfile } = await admin
    .from('profiles')
    .select('company_name, full_name')
    .eq('id', conversation.brand_id)
    .maybeSingle()

  const brandName =
    conversation.brand_name?.trim() ||
    brandProfile?.company_name?.trim() ||
    brandProfile?.full_name?.trim() ||
    'A brand'
  const creatorOrigin = roleScopedAppUrl(appUrl(), 'creator')
  const emailed = await emailUser(
    admin,
    conversation.creator_id,
    hireMail({
      firstName: greetingName(creatorProfile),
      brandName,
      ratePerVideo: creatorProfile?.rate_per_video,
      messagesUrl: messagesUrl(creatorOrigin, conversation.id),
    }),
  )

  return jsonResponseFor(req, { ok: true, emailed })
})
