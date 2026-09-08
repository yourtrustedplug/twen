/**
 * verify-views — scheduled edge function.
 *
 * For every approved submission:
 *   1. Prefer creator_oauth_tokens (Connect TikTok/IG in profile).
 *   2. Fall back to global TIKTOK_* / INSTAGRAM_ACCESS_TOKEN if set.
 *   3. Call accrue_views RPC; close campaigns past deadline.
 *
 * Paste supabase/PROFILE_ABOUT.sql so creator_oauth_tokens exists.
 * Set ALLOW_SIMULATED_VIEWS=true only for non-prod testing.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticateCronRequest } from '../_shared/cron-auth.ts'
import {
  detectPlatform,
  extractInstagramShortcode,
  extractTikTokVideoId,
  resolveRedirectUrl,
} from '../_shared/platform-links.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!,
)

function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function simulatedViews(submissionId: string, submittedAt: string): number {
  const seed = hash32(submissionId)
  const start = 120 + (seed % 1800)
  const buckets = Math.max(
    0,
    Math.floor((Date.now() - new Date(submittedAt).getTime()) / (15 * 60 * 1000)),
  )
  let growth = 0
  for (let i = 1; i <= Math.min(buckets, 96); i++) {
    growth += hash32(`${submissionId}:${i}`) % 41
  }
  return start + growth
}

async function mintTikTokClientToken(clientKey: string, clientSecret: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    })
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body,
    })
    if (!res.ok) {
      console.error('tiktok client_credentials failed', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return typeof data?.access_token === 'string' ? data.access_token : null
  } catch (e) {
    console.error('tiktok client_credentials error', e)
    return null
  }
}

async function refreshTikTokUserToken(
  clientKey: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body,
    })
    if (!res.ok) {
      console.error('tiktok refresh_token failed', res.status, await res.text())
      return null
    }
    const data = await res.json()
    if (typeof data?.refresh_token === 'string') {
      console.log('tiktok refresh_token rotated — update TIKTOK_REFRESH_TOKEN edge secret')
    }
    return typeof data?.access_token === 'string' ? data.access_token : null
  } catch (e) {
    console.error('tiktok refresh_token error', e)
    return null
  }
}

async function resolveTikTokToken(): Promise<{ token: string | null; source: string }> {
  const key = Deno.env.get('TIKTOK_CLIENT_KEY')?.trim()
  const secret = Deno.env.get('TIKTOK_CLIENT_SECRET')?.trim()
  const userToken = Deno.env.get('TIKTOK_ACCESS_TOKEN')?.trim()
  const refresh = Deno.env.get('TIKTOK_REFRESH_TOKEN')?.trim()

  if (userToken) return { token: userToken, source: 'user' }

  if (key && secret && refresh) {
    const renewed = await refreshTikTokUserToken(key, secret, refresh)
    if (renewed) return { token: renewed, source: 'refresh' }
  }

  if (key && secret) {
    const minted = await mintTikTokClientToken(key, secret)
    return { token: minted, source: minted ? 'client' : 'client-failed' }
  }
  return { token: null, source: 'none' }
}

async function fetchTikTokViews(
  url: string,
  accessToken: string,
  knownMediaId?: string | null,
): Promise<number | null> {
  try {
    const resolved = await resolveRedirectUrl(url)
    const videoId = knownMediaId || extractTikTokVideoId(resolved)
    if (!videoId) return null

    const display = await fetch(
      'https://open.tiktokapis.com/v2/video/query/?fields=id,view_count',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: { video_ids: [videoId] },
        }),
      },
    )
    if (display.ok) {
      const data = await display.json()
      const views = data?.data?.videos?.[0]?.view_count
      if (typeof views === 'number') return views
    } else {
      console.error('tiktok display query', display.status, await display.text())
    }

    const end = new Date()
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 180)
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
    const research = await fetch(
      'https://open.tiktokapis.com/v2/research/video/query/?fields=id,view_count,like_count',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            and: [{ operation: 'EQ', field_name: 'video_id', field_values: [videoId] }],
          },
          max_count: 1,
          start_date: fmt(start),
          end_date: fmt(end),
        }),
      },
    )
    if (research.ok) {
      const data = await research.json()
      const views = data?.data?.videos?.[0]?.view_count
      if (typeof views === 'number') return views
    } else {
      console.error('tiktok research query', research.status, await research.text())
    }
    return null
  } catch (e) {
    console.error('fetchTikTokViews', e)
    return null
  }
}

/** Instagram: creator token → me/media match; else Graph oEmbed / business list. */
async function fetchInstagramViews(
  url: string,
  accessToken: string,
  opts?: { creatorToken?: boolean; knownMediaId?: string | null },
): Promise<number | null> {
  try {
    let mediaId: string | null = opts?.knownMediaId ?? null
    const shortcode = extractInstagramShortcode(url)

    if (!mediaId && opts?.creatorToken && shortcode) {
      let after: string | undefined
      for (let page = 0; page < 8; page++) {
        const mediaUrl = new URL('https://graph.instagram.com/v21.0/me/media')
        mediaUrl.searchParams.set('fields', 'id,permalink')
        mediaUrl.searchParams.set('limit', '50')
        mediaUrl.searchParams.set('access_token', accessToken)
        if (after) mediaUrl.searchParams.set('after', after)
        const mediaRes = await fetch(mediaUrl)
        if (!mediaRes.ok) {
          console.error('instagram me/media', mediaRes.status, await mediaRes.text())
          break
        }
        const mediaJson = await mediaRes.json()
        const hit = (mediaJson?.data ?? []).find(
          (m: { permalink?: string }) =>
            typeof m.permalink === 'string' && m.permalink.includes(shortcode),
        )
        if (hit?.id) {
          mediaId = String(hit.id)
          break
        }
        after = mediaJson?.paging?.cursors?.after
        if (!after) break
      }
    }

    if (!mediaId && shortcode) {
      const oembedUrl = new URL('https://graph.facebook.com/v21.0/instagram_oembed')
      oembedUrl.searchParams.set('url', url)
      oembedUrl.searchParams.set('access_token', accessToken)
      const oembedRes = await fetch(oembedUrl)
      if (oembedRes.ok) {
        const oembed = await oembedRes.json()
        if (typeof oembed?.media_id === 'string') mediaId = oembed.media_id
      } else {
        console.error('instagram oembed', oembedRes.status, await oembedRes.text())
      }
    }

    if (!mediaId) {
      const igUser = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID')?.trim()
      if (igUser && shortcode) {
        const listUrl = new URL(`https://graph.facebook.com/v21.0/${igUser}/media`)
        listUrl.searchParams.set('fields', 'id,permalink,media_type,media_product_type')
        listUrl.searchParams.set('limit', '50')
        listUrl.searchParams.set('access_token', accessToken)
        const listRes = await fetch(listUrl)
        if (listRes.ok) {
          const list = await listRes.json()
          const hit = (list?.data ?? []).find((m: { permalink?: string }) =>
            typeof m.permalink === 'string' && m.permalink.includes(shortcode),
          )
          if (hit?.id) mediaId = String(hit.id)
        } else {
          console.error('instagram media list', listRes.status, await listRes.text())
        }
      }
    }

    if (!mediaId) return null

    const insightsHost = opts?.creatorToken ? 'graph.instagram.com' : 'graph.facebook.com'
    for (const metric of ['views', 'plays', 'ig_reels_aggregated_all_plays_count']) {
      const insightsUrl = new URL(`https://${insightsHost}/v21.0/${mediaId}/insights`)
      insightsUrl.searchParams.set('metric', metric)
      insightsUrl.searchParams.set('access_token', accessToken)
      const insightsRes = await fetch(insightsUrl)
      if (!insightsRes.ok) {
        await insightsRes.text()
        continue
      }
      const insights = await insightsRes.json()
      const value = insights?.data?.[0]?.values?.[0]?.value
      if (typeof value === 'number') return value
    }
    return null
  } catch (e) {
    console.error('fetchInstagramViews', e)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronError = authenticateCronRequest(req)
  if (cronError) return cronError

  const allowSimulated = Deno.env.get('ALLOW_SIMULATED_VIEWS') === 'true'
  const igGlobal = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')?.trim() || null
  const { token: tiktokGlobal, source: tiktokSource } = await resolveTikTokToken()

  let creatorTokenTableOk = false
  const { error: tokenTableError } = await supabase
    .from('creator_oauth_tokens')
    .select('user_id')
    .limit(1)
  if (!tokenTableError) creatorTokenTableOk = true

  const hasPlatformCreds = Boolean(tiktokGlobal || igGlobal || creatorTokenTableOk)
  if (!hasPlatformCreds && !allowSimulated) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'No view-verification path: paste PROFILE_ABOUT.sql (creator_oauth_tokens), and/or set TIKTOK_CLIENT_KEY+SECRET / INSTAGRAM_ACCESS_TOKEN (or ALLOW_SIMULATED_VIEWS=true for non-prod)',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, creator_id, tiktok_url, platform, platform_media_id, created_at')
      .eq('status', 'approved')
    if (error) throw error

    const creatorIds = [...new Set((submissions ?? []).map((s) => s.creator_id).filter(Boolean))]
    const tokenByKey = new Map<string, string>()
    if (creatorTokenTableOk && creatorIds.length) {
      const { data: tokens } = await supabase
        .from('creator_oauth_tokens')
        .select('user_id, platform, access_token')
        .in('user_id', creatorIds)
      for (const t of tokens ?? []) {
        if (t.access_token) tokenByKey.set(`${t.user_id}:${t.platform}`, t.access_token)
      }
    }

    let verified = 0
    let accrued = 0
    let skipped = 0
    let tiktokOk = 0
    let instagramOk = 0
    let usedCreatorToken = 0

    for (const s of submissions ?? []) {
      const url = s.tiktok_url as string
      const platform = detectPlatform(s.platform as string | null, url)
      let views: number | null = null

      const creatorTikTok = s.creator_id ? tokenByKey.get(`${s.creator_id}:tiktok`) : undefined
      const creatorIg = s.creator_id ? tokenByKey.get(`${s.creator_id}:instagram`) : undefined
      const mediaId = (s as { platform_media_id?: string | null }).platform_media_id

      if (platform === 'tiktok') {
        const token = creatorTikTok || tiktokGlobal
        if (token) {
          views = await fetchTikTokViews(url, token, mediaId)
          if (views !== null) {
            tiktokOk += 1
            if (creatorTikTok) usedCreatorToken += 1
          }
        }
      } else if (platform === 'instagram') {
        const token = creatorIg || igGlobal
        if (token) {
          views = await fetchInstagramViews(url, token, {
            creatorToken: Boolean(creatorIg),
            knownMediaId: mediaId,
          })
          if (views !== null) {
            instagramOk += 1
            if (creatorIg) usedCreatorToken += 1
          }
        }
      }

      if (views === null && allowSimulated) {
        views = simulatedViews(s.id, s.created_at)
      }
      if (views === null) {
        skipped += 1
        continue
      }

      const { data: amount, error: accrueError } = await supabase.rpc(
        'accrue_views',
        { p_submission_id: s.id, p_new_views: views },
      )
      if (accrueError) {
        console.error('accrue_views failed', s.id, accrueError.message)
        continue
      }
      verified += 1
      accrued += Number(amount ?? 0)
    }

    const { data: closed, error: closeError } = await supabase
      .from('campaigns')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('status', 'open')
      .lt('deadline', new Date().toISOString().slice(0, 10))
      .select('id')
    if (closeError) throw closeError

    return new Response(
      JSON.stringify({
        ok: true,
        verified_submissions: verified,
        skipped_submissions: skipped,
        amount_accrued: accrued,
        campaigns_closed: closed?.length ?? 0,
        tiktok_verified: tiktokOk,
        instagram_verified: instagramOk,
        creator_token_hits: usedCreatorToken,
        creator_oauth_table: creatorTokenTableOk,
        tiktok_token_source: tiktokSource,
        mode: allowSimulated && !hasPlatformCreds
          ? 'simulated'
          : [
              creatorTokenTableOk ? 'creator-oauth' : null,
              tiktokGlobal ? 'tiktok-global' : null,
              igGlobal ? 'instagram-global' : null,
            ]
              .filter(Boolean)
              .join('+') || 'none',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
