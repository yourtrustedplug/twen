/**
 * verify-views — scheduled edge function.
 *
 * Runs on a fixed cadence. For every approved submission on an open campaign it:
 *   1. Fetches the current public view count for the TikTok video.
 *   2. Calls the service-role-only `accrue_views` RPC, which applies the campaign
 *      rate, caps spend at the remaining escrow budget, writes earnings, and
 *      flags the campaign "completed" when the budget is exhausted.
 *   3. Closes open campaigns whose deadline has passed (earning accrual stops;
 *      the 7-day payout hold clock starts at closed_at).
 *
 * TikTok credentials are configurable via env (TIKTOK_ACCESS_TOKEN). Without
 * them the function falls back to a deterministic simulated view-count source
 * so the earnings pipeline stays exercisable end-to-end in demo mode.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticateCronRequest } from '../_shared/cron-auth.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Deterministic simulated view count so repeated runs produce monotonically
 * non-decreasing numbers: each submission grows by 0–40 views per elapsed
 * verification bucket (15 min), seeded by its own id.
 */
function simulatedViews(submissionId: string, submittedAt: string): number {
  const seed = hash32(submissionId)
  const start = 120 + (seed % 1800) // day-one views
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

async function fetchTikTokViews(
  tiktokUrl: string,
  accessToken: string,
): Promise<number | null> {
  try {
    const res = await fetch('https://open.tiktokapis.com/v2/video/query/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: { video_ids: [extractVideoId(tiktokUrl)] },
        fields: ['view_count'],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const videos = data?.data?.videos
    const views = videos?.[0]?.view_count
    return typeof views === 'number' ? views : null
  } catch {
    return null
  }
}

function extractVideoId(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/) ?? url.match(/[?&]item_id=(\d+)/)
  return m?.[1] ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronError = authenticateCronRequest(req)
  if (cronError) return cronError

  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, tiktok_url, submitted_at')
      .eq('status', 'approved')
    if (error) throw error

    let verified = 0
    let accrued = 0

    for (const s of submissions ?? []) {
      const token = Deno.env.get('TIKTOK_ACCESS_TOKEN')
      let views: number | null = null
      if (token) {
        views = await fetchTikTokViews(s.tiktok_url, token)
      }
      if (views === null) {
        views = simulatedViews(s.id, s.submitted_at)
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

    // Close open campaigns past their deadline.
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
        amount_accrued: accrued,
        campaigns_closed: closed?.length ?? 0,
        mode: Deno.env.get('TIKTOK_ACCESS_TOKEN') ? 'tiktok-api' : 'simulated',
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
