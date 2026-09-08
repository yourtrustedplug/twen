/**
 * verify-id — run Didit document verification, or queue for staff review.
 *
 * Secrets: DIDIT_API_KEY (optional). Without it, status stays pending.
 * Docs: https://docs.didit.me/standalone-apis/id-verification
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

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

async function download(admin: ReturnType<typeof adminClient>, path: string) {
  const { data, error } = await admin.storage.from('id-documents').download(path)
  if (error || !data) throw new Error(error?.message || 'Could not read ID image')
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const userSb = userClient(req)
  const { data: authData, error: authError } = await userSb.auth.getUser()
  if (authError || !authData.user) return jsonResponseFor(req, { error: 'Sign in first' }, 401)

  const admin = adminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id_document_path, id_document_back_path, id_document_type, first_name, last_name')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError || !profile?.id_document_path) {
    return jsonResponseFor(req, { error: 'Upload a passport or ID first' }, 400)
  }

  const apiKey = Deno.env.get('DIDIT_API_KEY')
  if (!apiKey) {
    await admin
      .from('profiles')
      .update({ id_verification_status: 'pending' })
      .eq('id', authData.user.id)
    return jsonResponseFor(req, {
      status: 'pending',
      message: 'Document received. A moderator will review it.',
    })
  }

  try {
    const front = await download(admin, profile.id_document_path)
    const form = new FormData()
    form.set('front_image', front, 'front.jpg')
    if (profile.id_document_back_path) {
      const back = await download(admin, profile.id_document_back_path)
      form.set('back_image', back, 'back.jpg')
    }
    form.set('perform_document_liveness', 'true')
    form.set('save_api_request', 'true')

    const res = await fetch('https://verification.didit.me/v3/id-verification/', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
    })
    const json = await res.json()
    if (!res.ok) {
      await admin
        .from('profiles')
        .update({ id_verification_status: 'pending' })
        .eq('id', authData.user.id)
      return jsonResponseFor(req, {
        status: 'pending',
        message: json.error || json.detail || 'Didit could not read the document. Staff will review it.',
      })
    }

    const verdict = json?.id_verification?.status as string | undefined
    const status = verdict === 'Approved' ? 'verified' : verdict === 'Declined' ? 'rejected' : 'pending'
    const extracted = json?.id_verification ?? {}
    const first =
      (extracted.first_name as string | undefined) ||
      (extracted.given_names as string | undefined) ||
      profile.first_name
    const last = (extracted.last_name as string | undefined) || (extracted.surname as string | undefined) || profile.last_name

    await admin
      .from('profiles')
      .update({
        id_verification_status: status,
        first_name: first ?? profile.first_name,
        last_name: last ?? profile.last_name,
        full_name: [first, last].filter(Boolean).join(' ') || undefined,
      })
      .eq('id', authData.user.id)

    return jsonResponseFor(req, {
      status,
      message:
        status === 'verified'
          ? 'ID verified.'
          : status === 'rejected'
            ? 'Didit declined this document. Try a clearer photo of the photo page.'
            : 'Document received. A moderator will review it.',
    })
  } catch (e) {
    await admin
      .from('profiles')
      .update({ id_verification_status: 'pending' })
      .eq('id', authData.user.id)
    return jsonResponseFor(req, {
      status: 'pending',
      message: e instanceof Error ? e.message : 'Verification queued for staff.',
    })
  }
})
