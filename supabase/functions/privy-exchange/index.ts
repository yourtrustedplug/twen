/**
 * privy-exchange — verify a Privy access token and return a Supabase session.
 *
 * Secrets:
 *   PRIVY_APP_ID, PRIVY_APP_SECRET
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *
 * Deploy with verify_jwt = false (caller authenticates via Privy token).
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as jose from 'npm:jose@5'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

type ExchangeBody = {
  accessToken?: string
  role?: 'creator' | 'brand'
  fullName?: string
  tiktokHandle?: string
  companyName?: string
}

type PrivyUser = {
  id: string
  linked_accounts?: Array<{
    type: string
    address?: string
    email?: string
    name?: string
  }>
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY')!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function verifyPrivyAccessToken(token: string) {
  const appId = Deno.env.get('PRIVY_APP_ID')!
  const jwks = jose.createRemoteJWKSet(
    new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`),
  )
  const { payload } = await jose.jwtVerify(token, jwks, {
    audience: appId,
  })
  const sub = typeof payload.sub === 'string' ? payload.sub : null
  if (!sub) throw new Error('Privy token missing sub')
  return sub
}

async function fetchPrivyUser(userId: string): Promise<PrivyUser> {
  const appId = Deno.env.get('PRIVY_APP_ID')!
  const secret = Deno.env.get('PRIVY_APP_SECRET')!
  const basic = btoa(`${appId}:${secret}`)
  const res = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
    headers: {
      Authorization: `Basic ${basic}`,
      'privy-app-id': appId,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Privy user fetch failed: ${res.status} ${text}`)
  }
  return (await res.json()) as PrivyUser
}

function emailFromPrivyUser(user: PrivyUser): string | null {
  const accounts = user.linked_accounts ?? []
  for (const a of accounts) {
    if (a.type === 'email' && (a.address || a.email)) {
      return (a.address ?? a.email)!.toLowerCase()
    }
    if (a.type === 'google_oauth' && a.email) {
      return a.email.toLowerCase()
    }
  }
  // Some payloads nest email on google as address
  for (const a of accounts) {
    if (a.type.includes('google') && a.email) return a.email.toLowerCase()
    if (a.type.includes('google') && a.address?.includes('@')) {
      return a.address.toLowerCase()
    }
  }
  return null
}

function nameFromPrivyUser(user: PrivyUser): string | null {
  for (const a of user.linked_accounts ?? []) {
    if (a.name) return a.name
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }
  if (req.method !== 'POST') {
    return jsonResponseFor(req, { error: 'Method not allowed' }, 405)
  }

  if (!Deno.env.get('PRIVY_APP_ID') || !Deno.env.get('PRIVY_APP_SECRET')) {
    return jsonResponseFor(req, { error: 'Privy is not configured' }, 500)
  }

  let body: ExchangeBody
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const accessToken = body.accessToken?.trim()
  if (!accessToken) {
    return jsonResponseFor(req, { error: 'accessToken required' }, 400)
  }

  try {
    const privyDid = await verifyPrivyAccessToken(accessToken)
    const privyUser = await fetchPrivyUser(privyDid)
    const email = emailFromPrivyUser(privyUser)
    if (!email) {
      return jsonResponseFor(req, { error: 'Privy user has no email' }, 400)
    }

    const role = body.role === 'brand' ? 'brand' : 'creator'
    const fullName = body.fullName?.trim() || nameFromPrivyUser(privyUser) || null
    const metadata = {
      privy_did: privyDid,
      full_name: fullName,
      role,
      tiktok_handle: body.tiktokHandle ?? null,
      company_name: body.companyName ?? null,
    }

    const supabase = adminClient()

    // Ensure auth user exists (idempotent via generateLink)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { data: metadata },
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink', linkError)
      return jsonResponseFor(req, { error: 'Could not create Supabase user' }, 500)
    }

    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: linkData.properties.hashed_token,
    })
    if (otpError || !otpData.session) {
      console.error('verifyOtp', otpError)
      return jsonResponseFor(req, { error: 'Could not create Supabase session' }, 500)
    }

    // Ensure profile row (trigger may not exist for admin-created users)
    const userId = otpData.session.user.id
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    if (!existing) {
      await supabase.from('profiles').insert({
        id: userId,
        role,
        full_name: fullName,
        tiktok_handle: body.tiktokHandle ?? null,
        company_name: body.companyName ?? null,
      })
    }

    return jsonResponseFor(req, {
      access_token: otpData.session.access_token,
      refresh_token: otpData.session.refresh_token,
      expires_in: otpData.session.expires_in,
      user: otpData.session.user,
    })
  } catch (e) {
    console.error('privy-exchange', e)
    return jsonResponseFor(req, { error: 'Authentication failed' }, 401)
  }
})
