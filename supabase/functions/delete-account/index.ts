/**
 * delete-account — signed-in user permanently deletes their Twen account.
 *
 * Removes storage files, then the auth user (profiles and related rows cascade).
 * Optionally deletes the Privy user when privy_did is on auth metadata.
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

async function removePrefix(
  admin: ReturnType<typeof adminClient>,
  bucket: string,
  prefix: string,
) {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!data?.length) return
  const files = data.filter((o) => o.id).map((o) => `${prefix}/${o.name}`)
  if (files.length) await admin.storage.from(bucket).remove(files)
  for (const dir of data.filter((o) => !o.id && o.name)) {
    await removePrefix(admin, bucket, `${prefix}/${dir.name}`)
  }
}

async function deletePrivyUser(privyDid: string) {
  const appId = Deno.env.get('PRIVY_APP_ID')
  const secret = Deno.env.get('PRIVY_APP_SECRET')
  if (!appId || !secret || !privyDid) return
  const basic = btoa(`${appId}:${secret}`)
  await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(privyDid)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${basic}`,
      'privy-app-id': appId,
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsForRequest(req) })
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const userSb = userClient(req)
  const { data: authData, error: authError } = await userSb.auth.getUser()
  if (authError || !authData.user) return jsonResponseFor(req, { error: 'Sign in first' }, 401)

  const userId = authData.user.id
  const privyDid = typeof authData.user.user_metadata?.privy_did === 'string'
    ? authData.user.user_metadata.privy_did
    : ''

  const admin = adminClient()
  await removePrefix(admin, 'campaign-assets', userId)
  await removePrefix(admin, 'id-documents', userId)

  // Leftover invoice tables (if present) may not cascade from auth.users.
  await admin.from('invoices').delete().eq('user_id', userId)
  await admin.from('clients').delete().eq('user_id', userId)

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    return jsonResponseFor(req, { error: deleteError.message || 'Could not delete account' }, 500)
  }

  try {
    await deletePrivyUser(privyDid)
  } catch {
    // Account data is already gone; Privy cleanup is best-effort.
  }

  return jsonResponseFor(req, { ok: true })
})
