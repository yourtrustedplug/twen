/**
 * connect-social — start TikTok or Instagram OAuth for the signed-in creator.
 *
 * Secrets: TIKTOK_CLIENT_KEY, INSTAGRAM_APP_ID, PUBLIC_APP_URL
 * Redirect URI (add in TikTok + Meta dashboards):
 *   {PUBLIC_APP_URL}/auth/social-callback
 *   http://localhost:8080/auth/social-callback
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

type Platform = 'tiktok' | 'instagram'

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

function randomString(bytes = 32) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Base64Url(input: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const raw = String.fromCharCode(...new Uint8Array(hash))
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const supabase = userClient(req)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return jsonResponseFor(req, { error: 'Sign in first' }, 401)

  let body: { platform?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const platform = body.platform as Platform
  if (platform !== 'tiktok' && platform !== 'instagram') {
    return jsonResponseFor(req, { error: 'platform must be tiktok or instagram' }, 400)
  }

  // Prefer production PUBLIC_APP_URL; Origin only for local dev so Login Kit redirect matches.
  const configured = (Deno.env.get('PUBLIC_APP_URL') || '').replace(/\/$/, '')
  const originHdr = (req.headers.get('Origin') || '').replace(/\/$/, '')
  const isLocal = (u: string) => /localhost|127\.0\.0\.1/i.test(u)
  let base = ''
  if (configured && !isLocal(configured)) base = configured
  else if (originHdr && isLocal(originHdr)) base = originHdr
  else base = configured || originHdr
  if (!base) return jsonResponseFor(req, { error: 'PUBLIC_APP_URL is not set' }, 500)
  const redirectUri = `${base}/auth/social-callback`

  const state = randomString(16)
  const codeVerifier = randomString(48)
  const admin = adminClient()
  const { error: stateError } = await admin.from('oauth_states').insert({
    state,
    user_id: authData.user.id,
    platform,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  })
  if (stateError) return jsonResponseFor(req, { error: stateError.message }, 500)

  if (platform === 'tiktok') {
    const key = Deno.env.get('TIKTOK_CLIENT_KEY')
    if (!key) {
      return jsonResponseFor(
        req,
        { error: 'TikTok Login Kit is not configured. Set TIKTOK_CLIENT_KEY on the edge function.' },
        503,
      )
    }
    const challenge = await sha256Base64Url(codeVerifier)
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/')
    url.searchParams.set('client_key', key)
    url.searchParams.set('scope', 'user.info.basic,user.info.profile,user.info.stats,video.list')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    return jsonResponseFor(req, { url: url.toString() })
  }

  const appId = Deno.env.get('INSTAGRAM_APP_ID')
  if (!appId) {
    return jsonResponseFor(
      req,
      { error: 'Instagram Login is not configured. Set INSTAGRAM_APP_ID on the edge function.' },
      503,
    )
  }
  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  // basic = media ownership + timestamp; manage_insights = view/play counts
  url.searchParams.set(
    'scope',
    'instagram_business_basic,instagram_business_manage_insights',
  )
  url.searchParams.set('state', state)
  return jsonResponseFor(req, { url: url.toString() })
})
