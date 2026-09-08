/**
 * verify-submission — confirm a TikTok / Instagram link via the creator's
 * connected OAuth token before insert:
 *   - URL must match the platform (no random sites)
 *   - Media must belong to the connected account
 *   - Publish date must fall inside the campaign window
 *   - View count is read from the platform API
 *
 * Requires creator_oauth_tokens (PROFILE_ABOUT / PASTE_NEXT) + Connect TikTok/IG.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'
import {
  detectPlatform,
  extractInstagramShortcode,
  extractTikTokHandle,
  extractTikTokVideoId,
  isValidPlatformUrl,
  normalizeHandle,
  resolveRedirectUrl,
  type SocialPlatform,
} from '../_shared/platform-links.ts'

type MediaProof = {
  mediaId: string
  views: number | null
  postedAt: string
  likes?: number
  comments?: number
  shares?: number
}

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

async function refreshTikTokToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string } | null> {
  const key = Deno.env.get('TIKTOK_CLIENT_KEY')?.trim()
  const secret = Deno.env.get('TIKTOK_CLIENT_SECRET')?.trim()
  if (!key || !secret) return null
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: key,
      client_secret: secret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    console.error('tiktok refresh failed', res.status, await res.text())
    return null
  }
  const data = await res.json()
  if (typeof data?.access_token !== 'string') return null
  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
      : undefined,
  }
}

async function loadCreatorToken(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  platform: SocialPlatform,
): Promise<string | null> {
  const { data } = await admin
    .from('creator_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()
  if (!data?.access_token) return null

  const expiresSoon =
    data.expires_at && new Date(data.expires_at).getTime() < Date.now() + 60_000
  if (expiresSoon && data.refresh_token && platform === 'tiktok') {
    const renewed = await refreshTikTokToken(data.refresh_token)
    if (renewed) {
      await admin.from('creator_oauth_tokens').upsert({
        user_id: userId,
        platform,
        access_token: renewed.accessToken,
        refresh_token: renewed.refreshToken ?? data.refresh_token,
        expires_at: renewed.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      })
      return renewed.accessToken
    }
  }
  return data.access_token
}

async function proveTikTok(url: string, accessToken: string, expectedHandle?: string | null): Promise<MediaProof> {
  const resolved = await resolveRedirectUrl(url)
  const videoId = extractTikTokVideoId(resolved)
  if (!videoId) {
    throw new Error('Could not read a TikTok video id from that link. Use the full video URL.')
  }

  const urlHandle = extractTikTokHandle(resolved)
  if (expectedHandle && urlHandle) {
    if (normalizeHandle(urlHandle) !== normalizeHandle(expectedHandle)) {
      throw new Error(
        `That TikTok link is for ${urlHandle}, but your connected account is ${expectedHandle}.`,
      )
    }
  }

  const fields = 'id,create_time,view_count,like_count,comment_count,share_count,share_url'
  const queryRes = await fetch(
    `https://open.tiktokapis.com/v2/video/query/?fields=${fields}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    },
  )

  let video: {
    id?: string
    create_time?: number
    view_count?: number
    like_count?: number
    comment_count?: number
    share_count?: number
  } | null = null

  if (queryRes.ok) {
    const data = await queryRes.json()
    video = data?.data?.videos?.[0] ?? null
  } else {
    console.error('tiktok video.query', queryRes.status, await queryRes.text())
  }

  // Fallback: page through video.list (same account) and match id.
  if (!video) {
    let cursor: string | undefined
    for (let page = 0; page < 5; page++) {
      const listRes = await fetch(
        `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
        },
      )
      if (!listRes.ok) {
        console.error('tiktok video.list', listRes.status, await listRes.text())
        break
      }
      const list = await listRes.json()
      const videos = (list?.data?.videos ?? []) as Array<typeof video>
      video = videos.find((v) => v && String(v.id) === videoId) ?? null
      if (video) break
      if (!list?.data?.has_more || !list?.data?.cursor) break
      cursor = String(list.data.cursor)
    }
  }

  if (!video?.id || !video.create_time) {
    throw new Error(
      'TikTok did not return that video on your connected account. Re-connect TikTok and submit a video you posted.',
    )
  }

  return {
    mediaId: String(video.id),
    views: typeof video.view_count === 'number' ? video.view_count : null,
    postedAt: new Date(Number(video.create_time) * 1000).toISOString(),
    likes: typeof video.like_count === 'number' ? video.like_count : undefined,
    comments: typeof video.comment_count === 'number' ? video.comment_count : undefined,
    shares: typeof video.share_count === 'number' ? video.share_count : undefined,
  }
}

async function proveInstagram(url: string, accessToken: string): Promise<MediaProof> {
  const shortcode = extractInstagramShortcode(url)
  if (!shortcode) {
    throw new Error('Use a full Instagram Reel or post link (instagram.com/reel/… or /p/…).')
  }

  let matched: {
    id: string
    timestamp?: string
    like_count?: number
    comments_count?: number
    permalink?: string
  } | null = null

  let after: string | undefined
  for (let page = 0; page < 10; page++) {
    const mediaUrl = new URL('https://graph.instagram.com/v21.0/me/media')
    mediaUrl.searchParams.set(
      'fields',
      'id,permalink,timestamp,media_type,media_product_type,like_count,comments_count',
    )
    mediaUrl.searchParams.set('limit', '50')
    mediaUrl.searchParams.set('access_token', accessToken)
    if (after) mediaUrl.searchParams.set('after', after)

    const mediaRes = await fetch(mediaUrl)
    if (!mediaRes.ok) {
      console.error('instagram me/media', mediaRes.status, await mediaRes.text())
      throw new Error(
        'Could not list Instagram media for your connected account. Re-connect Instagram and try again.',
      )
    }
    const mediaJson = await mediaRes.json()
    const items = (mediaJson?.data ?? []) as Array<{
      id: string
      permalink?: string
      timestamp?: string
      like_count?: number
      comments_count?: number
    }>
    matched =
      items.find((m) => typeof m.permalink === 'string' && m.permalink.includes(shortcode)) ?? null
    if (matched) break
    after = mediaJson?.paging?.cursors?.after
    if (!after) break
  }

  if (!matched?.id || !matched.timestamp) {
    throw new Error(
      'That Instagram link is not on your connected account. Submit a Reel you posted after connecting Instagram.',
    )
  }

  let views: number | null = null
  for (const metric of ['views', 'plays', 'ig_reels_aggregated_all_plays_count']) {
    const insightsUrl = new URL(`https://graph.instagram.com/v21.0/${matched.id}/insights`)
    insightsUrl.searchParams.set('metric', metric)
    insightsUrl.searchParams.set('access_token', accessToken)
    const insightsRes = await fetch(insightsUrl)
    if (!insightsRes.ok) {
      await insightsRes.text()
      continue
    }
    const insights = await insightsRes.json()
    const value = insights?.data?.[0]?.values?.[0]?.value
    if (typeof value === 'number') {
      views = value
      break
    }
  }

  return {
    mediaId: matched.id,
    views,
    postedAt: new Date(matched.timestamp).toISOString(),
    likes: typeof matched.like_count === 'number' ? matched.like_count : undefined,
    comments: typeof matched.comments_count === 'number' ? matched.comments_count : undefined,
  }
}

function assertPostedInCampaignWindow(
  postedAtIso: string,
  campaign: { created_at: string; started_at: string | null; deadline: string | null },
) {
  const posted = new Date(postedAtIso).getTime()
  if (Number.isNaN(posted)) throw new Error('Platform returned an invalid publish date.')

  const windowStart = new Date(campaign.started_at || campaign.created_at).getTime()
  // Allow 12h early (timezone / API skew) but not old recycled posts.
  const earliest = windowStart - 12 * 60 * 60 * 1000
  if (posted < earliest) {
    throw new Error(
      'That post is older than this campaign. Post a new video for this brief, then submit that link.',
    )
  }

  if (campaign.deadline) {
    const deadlineEnd = new Date(`${String(campaign.deadline).slice(0, 10)}T23:59:59.999Z`).getTime()
    if (posted > deadlineEnd) {
      throw new Error('That post was published after the campaign deadline.')
    }
  }

  if (posted > Date.now() + 60 * 60 * 1000) {
    throw new Error('Platform returned a future publish date — try again in a minute.')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'Method not allowed' }, 405)

  const supabase = userClient(req)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return jsonResponseFor(req, { error: 'Sign in first' }, 401)

  let body: {
    campaign_id?: string
    url?: string
    platform?: string
    checklist_results?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const campaignId = body.campaign_id?.trim()
  const rawUrl = body.url?.trim() ?? ''
  if (!campaignId || !rawUrl) {
    return jsonResponseFor(req, { error: 'campaign_id and url are required' }, 400)
  }

  const admin = adminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(
      'id, role, full_name, first_name, last_name, tiktok_handle, instagram_handle, tiktok_connected_at, instagram_connected_at',
    )
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError || !profile) return jsonResponseFor(req, { error: 'Profile not found' }, 400)
  if (profile.role !== 'creator') {
    return jsonResponseFor(req, { error: 'Only creators can submit campaign links' }, 403)
  }

  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('id, status, deadline, started_at, created_at, platforms, brand_name')
    .eq('id', campaignId)
    .maybeSingle()
  if (campaignError || !campaign) return jsonResponseFor(req, { error: 'Campaign not found' }, 404)
  if (campaign.status !== 'open') {
    return jsonResponseFor(req, { error: 'This campaign is not open for submissions' }, 400)
  }

  const platform = detectPlatform(body.platform, rawUrl)
  if (platform === 'unknown') {
    return jsonResponseFor(
      req,
      { error: 'Choose TikTok or Instagram and paste a link from that platform.' },
      400,
    )
  }
  if (!isValidPlatformUrl(platform, rawUrl)) {
    return jsonResponseFor(
      req,
      {
        error:
          platform === 'tiktok'
            ? 'Paste a TikTok video link (tiktok.com/@you/video/… or vm.tiktok.com/…).'
            : 'Paste an Instagram Reel or post link (instagram.com/reel/… or /p/…).',
      },
      400,
    )
  }

  const campaignPlatforms = Array.isArray(campaign.platforms)
    ? (campaign.platforms as string[]).map((p) => p.toLowerCase())
    : []
  if (campaignPlatforms.length && !campaignPlatforms.includes(platform)) {
    return jsonResponseFor(
      req,
      { error: `This campaign only accepts: ${campaignPlatforms.join(', ')}` },
      400,
    )
  }

  const connectedAt =
    platform === 'tiktok' ? profile.tiktok_connected_at : profile.instagram_connected_at
  if (!connectedAt) {
    return jsonResponseFor(
      req,
      {
        error:
          platform === 'tiktok'
            ? 'Connect TikTok in your profile first so we can confirm the video is yours.'
            : 'Connect Instagram in your profile first so we can confirm the Reel is yours.',
        code: 'social_not_connected',
        platform,
      },
      400,
    )
  }

  const { data: existing } = await admin
    .from('submissions')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('creator_id', authData.user.id)
    .maybeSingle()
  if (existing) {
    return jsonResponseFor(req, { error: 'You already submitted to this campaign' }, 409)
  }

  const accessToken = await loadCreatorToken(admin, authData.user.id, platform)
  if (!accessToken) {
    return jsonResponseFor(
      req,
      {
        error: `Reconnect ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} — we need your login to verify the link.`,
        code: 'social_token_missing',
        platform,
      },
      400,
    )
  }

  let proof: MediaProof
  try {
    proof =
      platform === 'tiktok'
        ? await proveTikTok(rawUrl, accessToken, profile.tiktok_handle)
        : await proveInstagram(rawUrl, accessToken)
  } catch (e) {
    return jsonResponseFor(
      req,
      { error: e instanceof Error ? e.message : 'Could not verify that link with the platform' },
      400,
    )
  }

  try {
    assertPostedInCampaignWindow(proof.postedAt, {
      created_at: campaign.created_at,
      started_at: campaign.started_at,
      deadline: campaign.deadline,
    })
  } catch (e) {
    return jsonResponseFor(
      req,
      { error: e instanceof Error ? e.message : 'Post date is outside the campaign window' },
      400,
    )
  }

  // Same media cannot be reused across campaigns.
  const { data: dup } = await admin
    .from('submissions')
    .select('id')
    .eq('platform', platform)
    .eq('platform_media_id', proof.mediaId)
    .maybeSingle()
  if (dup) {
    return jsonResponseFor(
      req,
      { error: 'That video was already submitted on Twen. Post a fresh one for this campaign.' },
      409,
    )
  }

  const handle =
    platform === 'tiktok'
      ? profile.tiktok_handle || '@unknown'
      : profile.instagram_handle || '@unknown'
  const creatorName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    profile.full_name ||
    'Creator'

  const { data: submission, error: insertError } = await admin
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      creator_id: authData.user.id,
      tiktok_url: rawUrl,
      creator_name: creatorName,
      tiktok_handle: handle,
      platform,
      status: 'submitted',
      checklist_results: body.checklist_results ?? [],
      platform_media_id: proof.mediaId,
      posted_at: proof.postedAt,
      link_verified_at: new Date().toISOString(),
      likes: proof.likes ?? 0,
      comments: proof.comments ?? 0,
      shares: proof.shares ?? 0,
      // Views accrue after moderator approval via verify-views; seed 0 here.
      verified_views: 0,
    })
    .select('*')
    .single()

  if (insertError) {
    console.error('submission insert', insertError)
    return jsonResponseFor(req, { error: insertError.message }, 500)
  }

  return jsonResponseFor(req, {
    ok: true,
    submission,
    verification: {
      platform,
      media_id: proof.mediaId,
      posted_at: proof.postedAt,
      views_at_submit: proof.views,
      likes: proof.likes ?? null,
      comments: proof.comments ?? null,
    },
  })
})
