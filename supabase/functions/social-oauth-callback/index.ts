/**
 * social-oauth-callback — exchange TikTok / Instagram auth code, store tokens,
 * and copy handle + reach onto the creator profile.
 *
 * Secrets: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET,
 *          INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { suggestRatePerVideo } from '../_shared/suggest-rate.ts'

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type Platform = 'tiktok' | 'instagram'

type TokenResult = {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  handle: string
  followerCount: number
  avgViews: number
  engagementRate: number
}

function expiryFromSeconds(seconds?: number) {
  if (!seconds) return undefined
  return new Date(Date.now() + seconds * 1000).toISOString()
}

async function exchangeTikTok(code: string, verifier: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: Deno.env.get('TIKTOK_CLIENT_KEY') ?? '',
      client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET') ?? '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })
  const json = await res.json()
  const access = json.access_token as string | undefined
  if (!res.ok || !access) {
    throw new Error(json.error_description || json.error || 'TikTok token exchange failed')
  }

  const infoRes = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,follower_count,likes_count,video_count',
    { headers: { Authorization: `Bearer ${access}` } },
  )
  const info = await infoRes.json()
  const user = info?.data?.user ?? {}
  const handle = user.username ? `@${String(user.username).replace(/^@/, '')}` : ''
  const followerCount = Number(user.follower_count) || 0

  let avgViews = 0
  let engagementRate = 0
  const listRes = await fetch(
    'https://open.tiktokapis.com/v2/video/list/?fields=id,view_count,like_count,comment_count,share_count',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 20 }),
    },
  )
  if (listRes.ok) {
    const list = await listRes.json()
    const videos = (list?.data?.videos ?? []) as Array<{
      view_count?: number
      like_count?: number
      comment_count?: number
      share_count?: number
    }>
    if (videos.length) {
      const views = videos.reduce((s, v) => s + (Number(v.view_count) || 0), 0)
      const eng = videos.reduce(
        (s, v) => s + (Number(v.like_count) || 0) + (Number(v.comment_count) || 0) + (Number(v.share_count) || 0),
        0,
      )
      avgViews = Math.round(views / videos.length)
      engagementRate = views > 0 ? Math.min(eng / views, 1) : 0
    }
  }

  return {
    accessToken: access,
    refreshToken: json.refresh_token,
    expiresAt: expiryFromSeconds(json.expires_in),
    handle,
    followerCount,
    avgViews,
    engagementRate,
  }
}

async function exchangeInstagram(code: string, redirectUri: string): Promise<TokenResult> {
  const appId = Deno.env.get('INSTAGRAM_APP_ID') ?? ''
  const secret = Deno.env.get('INSTAGRAM_APP_SECRET') ?? ''
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: (() => {
      const form = new FormData()
      form.set('client_id', appId)
      form.set('client_secret', secret)
      form.set('grant_type', 'authorization_code')
      form.set('redirect_uri', redirectUri)
      form.set('code', code)
      return form
    })(),
  })
  const shortJson = await shortRes.json()
  const shortToken = shortJson.access_token as string | undefined
  if (!shortRes.ok || !shortToken) {
    throw new Error(shortJson.error_message || shortJson.error || 'Instagram token exchange failed')
  }

  const longUrl = new URL('https://graph.instagram.com/access_token')
  longUrl.searchParams.set('grant_type', 'ig_exchange_token')
  longUrl.searchParams.set('client_secret', secret)
  longUrl.searchParams.set('access_token', shortToken)
  const longRes = await fetch(longUrl)
  const longJson = await longRes.json()
  const access = (longJson.access_token as string | undefined) ?? shortToken

  const meUrl = new URL('https://graph.instagram.com/v21.0/me')
  meUrl.searchParams.set('fields', 'user_id,username,followers_count,media_count')
  meUrl.searchParams.set('access_token', access)
  const meRes = await fetch(meUrl)
  const me = await meRes.json()
  const handle = me.username ? `@${String(me.username).replace(/^@/, '')}` : ''

  return {
    accessToken: access,
    expiresAt: expiryFromSeconds(longJson.expires_in),
    handle,
    followerCount: Number(me.followers_count) || 0,
    avgViews: 0,
    engagementRate: 0,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  let body: { code?: string; state?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }
  const code = body.code?.trim()
  const state = body.state?.trim()
  if (!code || !state) return jsonResponseFor(req, { error: 'Missing code or state' }, 400)

  const admin = adminClient()
  const { data: row, error: rowError } = await admin
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .maybeSingle()
  if (rowError || !row) return jsonResponseFor(req, { error: 'OAuth state expired. Try Connect again.' }, 400)
  await admin.from('oauth_states').delete().eq('state', state)
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return jsonResponseFor(req, { error: 'OAuth state expired. Try Connect again.' }, 400)
  }

  const platform = row.platform as Platform

  if (platform === 'tiktok') {
    if (!Deno.env.get('TIKTOK_CLIENT_KEY')?.trim() || !Deno.env.get('TIKTOK_CLIENT_SECRET')?.trim()) {
      return jsonResponseFor(req, { error: 'TikTok Login Kit is not configured' }, 503)
    }
  } else if (platform === 'instagram') {
    if (!Deno.env.get('INSTAGRAM_APP_ID')?.trim() || !Deno.env.get('INSTAGRAM_APP_SECRET')?.trim()) {
      return jsonResponseFor(req, { error: 'Instagram Login is not configured' }, 503)
    }
  }

  let result: TokenResult
  try {
    result =
      platform === 'tiktok'
        ? await exchangeTikTok(code, row.code_verifier ?? '', row.redirect_uri)
        : await exchangeInstagram(code, row.redirect_uri)
  } catch (e) {
    return jsonResponseFor(req, { error: e instanceof Error ? e.message : 'OAuth exchange failed' }, 400)
  }

  await admin.from('creator_oauth_tokens').upsert({
    user_id: row.user_id,
    platform,
    access_token: result.accessToken,
    refresh_token: result.refreshToken ?? null,
    expires_at: result.expiresAt ?? null,
    updated_at: new Date().toISOString(),
  })

  const { data: profile } = await admin.from('profiles').select('*').eq('id', row.user_id).maybeSingle()
  const platforms = Array.isArray(profile?.platforms) ? [...profile.platforms] : []
  if (!platforms.includes(platform)) platforms.push(platform)

  const followerCount = Math.max(Number(profile?.follower_count) || 0, result.followerCount)
  const avgViews = result.avgViews || Number(profile?.avg_views) || 0
  const engagementRate = result.engagementRate || Number(profile?.engagement_rate) || 0
  const suggested = suggestRatePerVideo({ followerCount, avgViews, engagementRate })
  const overridden = Boolean(profile?.rate_overridden)
  const now = new Date().toISOString()

  const patch: Record<string, unknown> = {
    platforms,
    follower_count: followerCount,
    avg_views: avgViews,
    engagement_rate: engagementRate,
    rate_suggested: suggested,
    rate_per_video: overridden ? profile?.rate_per_video : suggested,
  }
  if (platform === 'tiktok') {
    patch.tiktok_handle = result.handle || profile?.tiktok_handle
    patch.tiktok_connected_at = now
  } else {
    patch.instagram_handle = result.handle || profile?.instagram_handle
    patch.instagram_connected_at = now
  }

  const { error: updateError } = await admin.from('profiles').update(patch).eq('id', row.user_id)
  if (updateError) return jsonResponseFor(req, { error: updateError.message }, 500)

  return jsonResponseFor(req, { ok: true, platform, handle: result.handle })
})
