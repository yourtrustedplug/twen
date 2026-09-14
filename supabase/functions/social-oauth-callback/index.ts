/**
 * social-oauth-callback — exchange TikTok / Instagram auth code, store tokens,
 * and copy handle + reach onto the creator profile.
 *
 * Secrets: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET,
 *          INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import { roleScopedAppUrl } from '../_shared/hosts.ts'
import { suggestRatePerVideo } from '../_shared/suggest-rate.ts'
import {
  combineAccountStats,
  parseAccountStats,
  seedSiblingStats,
  upsertAccountStats,
} from '../_shared/account-stats.ts'

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
  displayName: string
  bio: string
  avatarUrl: string
  followerCount: number
  avgViews: number
  engagementRate: number
}

function expiryFromSeconds(seconds?: number) {
  if (!seconds) return undefined
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function splitName(full: string): { first: string; last: string } {
  const trimmed = full.trim()
  if (!trimmed) return { first: '', last: '' }
  const space = trimmed.indexOf(' ')
  if (space < 0) return { first: trimmed, last: '' }
  return { first: trimmed.slice(0, space), last: trimmed.slice(space + 1).trim() }
}

async function persistAvatar(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  platform: Platform,
  sourceUrl: string,
): Promise<string | null> {
  if (!sourceUrl) return null
  try {
    const res = await fetch(sourceUrl)
    if (!res.ok) return sourceUrl
    const bytes = new Uint8Array(await res.arrayBuffer())
    const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0]
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const path = `${userId}/social/${platform}.${ext}`
    const { error } = await admin.storage.from('campaign-assets').upload(path, bytes, {
      upsert: true,
      contentType,
    })
    return error ? sourceUrl : path
  } catch {
    return sourceUrl
  }
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
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,bio_description,avatar_url,follower_count,likes_count,video_count',
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
    displayName: typeof user.display_name === 'string' ? user.display_name : '',
    bio: typeof user.bio_description === 'string' ? user.bio_description : '',
    avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : '',
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
  meUrl.searchParams.set(
    'fields',
    'user_id,username,name,biography,profile_picture_url,followers_count,media_count',
  )
  meUrl.searchParams.set('access_token', access)
  const meRes = await fetch(meUrl)
  const me = await meRes.json()
  const handle = me.username ? `@${String(me.username).replace(/^@/, '')}` : ''
  const sampled = await sampleInstagramReach(access)

  return {
    accessToken: access,
    expiresAt: expiryFromSeconds(longJson.expires_in),
    handle,
    displayName: typeof me.name === 'string' && me.name.trim() ? me.name.trim() : handle.replace(/^@/, ''),
    bio: typeof me.biography === 'string' ? me.biography : '',
    avatarUrl: typeof me.profile_picture_url === 'string' ? me.profile_picture_url : '',
    followerCount: Number(me.followers_count) || 0,
    avgViews: sampled.avgViews,
    engagementRate: sampled.engagementRate,
  }
}

async function instagramInsightMap(
  access: string,
  mediaId: string,
  metrics: string[],
): Promise<Record<string, number>> {
  const insightsUrl = new URL(`https://graph.instagram.com/v21.0/${mediaId}/insights`)
  insightsUrl.searchParams.set('metric', metrics.join(','))
  insightsUrl.searchParams.set('access_token', access)
  const insightsRes = await fetch(insightsUrl)
  if (!insightsRes.ok) {
    await insightsRes.text()
    return {}
  }
  const insights = await insightsRes.json()
  const out: Record<string, number> = {}
  for (const row of (insights?.data ?? []) as Array<{ name?: string; values?: Array<{ value?: number }> }>) {
    const name = typeof row.name === 'string' ? row.name : ''
    const value = row.values?.[0]?.value
    if (name && typeof value === 'number') out[name] = value
  }
  return out
}

/** Last ~20 Reels/videos → avg views + (likes+comments)/views, same as TikTok video.list. */
async function sampleInstagramReach(access: string): Promise<{ avgViews: number; engagementRate: number }> {
  try {
    const mediaUrl = new URL('https://graph.instagram.com/v21.0/me/media')
    mediaUrl.searchParams.set('fields', 'id,media_type,media_product_type,like_count,comments_count')
    mediaUrl.searchParams.set('limit', '25')
    mediaUrl.searchParams.set('access_token', access)
    let mediaRes = await fetch(mediaUrl)
    if (!mediaRes.ok) {
      mediaUrl.searchParams.set('fields', 'id,media_type,media_product_type')
      mediaRes = await fetch(mediaUrl)
    }
    if (!mediaRes.ok) {
      console.error('instagram me/media sample', mediaRes.status, await mediaRes.text())
      return { avgViews: 0, engagementRate: 0 }
    }
    const mediaJson = await mediaRes.json()
    const items = (mediaJson?.data ?? []) as Array<{
      id?: string
      media_type?: string
      media_product_type?: string
      like_count?: number
      comments_count?: number
    }>
    const videos = items.filter(
      (item) => item.id && (item.media_type === 'VIDEO' || item.media_product_type === 'REELS'),
    )
    const pool = (videos.length ? videos : items).filter((item) => item.id).slice(0, 20)
    const rows = await Promise.all(
      pool.map(async (item) => {
        let map = await instagramInsightMap(access, item.id!, ['views', 'likes', 'comments'])
        if (!(map.views > 0)) {
          map = { ...map, ...(await instagramInsightMap(access, item.id!, ['views'])) }
        }
        if (!(map.views > 0)) {
          const plays = await instagramInsightMap(access, item.id!, ['plays'])
          if (plays.plays > 0) map = { ...map, views: plays.plays }
        }
        const views = map.views || 0
        if (views <= 0) return null
        const eng =
          (Number(item.like_count) || map.likes || 0) + (Number(item.comments_count) || map.comments || 0)
        return { views, eng }
      }),
    )
    let viewsTotal = 0
    let viewsN = 0
    let engTotal = 0
    for (const row of rows) {
      if (!row) continue
      viewsTotal += row.views
      viewsN += 1
      engTotal += row.eng
    }
    if (!viewsN) return { avgViews: 0, engagementRate: 0 }
    return {
      avgViews: Math.round(viewsTotal / viewsN),
      engagementRate: viewsTotal > 0 ? Math.min(engTotal / viewsTotal, 1) : 0,
    }
  } catch (e) {
    console.error('sampleInstagramReach', e)
    return { avgViews: 0, engagementRate: 0 }
  }
}

function bookSlugFromHandle(handle: string): string {
  return handle
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
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

  const previousStats = parseAccountStats(profile?.account_stats)
  const sampled = {
    followerCount: result.followerCount,
    avgViews: result.avgViews,
    engagementRate: result.engagementRate,
  }
  const otherConnected = Boolean(
    platform === 'tiktok'
      ? profile?.instagram_connected_at || profile?.instagram_handle
      : profile?.tiktok_connected_at || profile?.tiktok_handle,
  )
  const seeded = seedSiblingStats(
    previousStats,
    platform,
    otherConnected,
    {
      followerCount: Number(profile?.follower_count) || 0,
      avgViews: Number(profile?.avg_views) || 0,
      engagementRate: Number(profile?.engagement_rate) || 0,
    },
    sampled,
  )
  const keepPrevious = !sampled.followerCount && !sampled.avgViews && seeded[platform]
  const accountStats = upsertAccountStats(seeded, platform, keepPrevious ? seeded[platform]! : sampled)
  const combined = combineAccountStats(accountStats)
  const followerCount = combined.followerCount
  const avgViews = combined.avgViews
  const engagementRate = combined.engagementRate
  const suggested = suggestRatePerVideo({ followerCount, avgViews, engagementRate })
  const overridden = Boolean(profile?.rate_overridden)
  const now = new Date().toISOString()
  const avatarPath = await persistAvatar(admin, row.user_id, platform, result.avatarUrl)

  const patch: Record<string, unknown> = {
    platforms,
    account_stats: accountStats,
    follower_count: followerCount,
    avg_views: avgViews,
    engagement_rate: engagementRate,
    rate_suggested: suggested,
    rate_per_video: overridden ? profile?.rate_per_video : suggested,
  }
  if (platform === 'tiktok') {
    patch.tiktok_handle = result.handle || profile?.tiktok_handle
    patch.tiktok_connected_at = now
    if (avatarPath) patch.tiktok_avatar_url = avatarPath
  } else {
    patch.instagram_handle = result.handle || profile?.instagram_handle
    patch.instagram_connected_at = now
    if (avatarPath) patch.instagram_avatar_url = avatarPath
  }

  if (!String(profile?.first_name ?? '').trim() && result.displayName) {
    const names = splitName(result.displayName)
    if (names.first) {
      patch.first_name = names.first
      if (names.last && !String(profile?.last_name ?? '').trim()) patch.last_name = names.last
      const full = [names.first, names.last || profile?.last_name].filter(Boolean).join(' ')
      if (full && !String(profile?.full_name ?? '').trim()) patch.full_name = full
    }
  }
  if (!String(profile?.bio ?? '').trim() && result.bio.trim()) {
    patch.bio = result.bio.trim()
  }

  const existingSlug = typeof profile?.book_slug === 'string' ? profile.book_slug.trim() : ''
  if (!existingSlug && result.handle) {
    const slug = bookSlugFromHandle(result.handle)
    if (slug.length >= 3) {
      const { data: taken } = await admin
        .from('profiles')
        .select('id')
        .eq('book_slug', slug)
        .neq('id', row.user_id)
        .maybeSingle()
      if (!taken) patch.book_slug = slug
    }
  }

  const { error: updateError } = await admin.from('profiles').update(patch).eq('id', row.user_id)
  if (updateError) {
    console.error('profile update', updateError.message)
    const withoutAvatars = { ...patch }
    delete withoutAvatars.tiktok_avatar_url
    delete withoutAvatars.instagram_avatar_url
    const retry = await admin.from('profiles').update(withoutAvatars).eq('id', row.user_id)
    if (retry.error) {
      console.error('profile update without avatars', retry.error.message)
      const last = { ...withoutAvatars }
      delete last.account_stats
      const finalTry = await admin.from('profiles').update(last).eq('id', row.user_id)
      if (finalTry.error) return jsonResponseFor(req, { error: finalTry.error.message }, 500)
    }
  }

  const appUrl = (Deno.env.get('PUBLIC_APP_URL') || 'https://twen.app').replace(/\/$/, '')
  const next = `${roleScopedAppUrl(appUrl, 'creator')}/creator/profile?tab=rate&connected=${platform}`

  return jsonResponseFor(req, {
    ok: true,
    platform,
    handle: result.handle,
    followerCount,
    avgViews,
    engagementRate,
    rateSuggested: suggested,
    next,
  })
})
