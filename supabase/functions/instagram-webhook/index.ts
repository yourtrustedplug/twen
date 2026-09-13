/**
 * instagram-webhook — Meta webhook handshake only.
 *
 * Twen does not consume Instagram events (views are polled by verify-views).
 * Meta's app dashboard still requires a Callback URL + Verify token, so this
 * answers the GET challenge and 200s POSTs.
 *
 * Secrets: INSTAGRAM_WEBHOOK_VERIFY_TOKEN
 * Deploy with verify_jwt = false (Meta has no Supabase JWT).
 */
import { jsonResponse } from '../_shared/cors.ts'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  const expected = Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN')?.trim()
  if (!expected) {
    return jsonResponse({ error: 'INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured' }, 503)
  }

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token') ?? ''
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && challenge && timingSafeEqual(token, expected)) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    return jsonResponse({ error: 'Verification failed' }, 403)
  }

  if (req.method === 'POST') {
    // Ack so Meta does not disable the subscription. Events are unused.
    return jsonResponse({ ok: true }, 200)
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
})
