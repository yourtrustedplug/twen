/**
 * log-client-error — lightweight client crash/error ingestion.
 *
 * Public on purpose: errors can happen before sign-in. The endpoint only writes
 * a bounded, rate-limited diagnostic row with the service role; the table has
 * RLS enabled and no client policies.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

type ErrorBody = {
  message?: string
  stack?: string
  componentStack?: string
  path?: string
  userAgent?: string
}

const MAX_MESSAGE = 2_000
const MAX_STACK = 8_000
const MAX_PATH = 512
const MAX_USER_AGENT = 512
const RATE_WINDOW_MINUTES = 10
const MAX_PER_IP = 30

function bounded(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function userIdFromRequest(req: Request): Promise<string | null> {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const url = Deno.env.get('SUPABASE_URL')
  const key =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!url || !key) return null

  const userClient = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data } = await userClient.auth.getUser()
  return data.user?.id ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }
  if (req.method !== 'POST') {
    return jsonResponseFor(req, { error: 'Method not allowed' }, 405)
  }

  let body: ErrorBody
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const message = bounded(body.message, MAX_MESSAGE)
  if (!message) {
    return jsonResponseFor(req, { error: 'message is required' }, 400)
  }

  const admin = adminClient()
  if (!admin) {
    console.error('log-client-error: missing Supabase admin configuration')
    return jsonResponseFor(req, { error: 'Error logging is unavailable' }, 503)
  }

  const ipHash = await sha256Hex(`client-error:${clientIp(req)}`)
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count, error: countError } = await admin
    .from('client_errors')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if (countError) {
    console.error('log-client-error: rate limit query', countError.message)
    return jsonResponseFor(req, { error: 'Error logging is unavailable' }, 503)
  }
  if ((count ?? 0) >= MAX_PER_IP) {
    return jsonResponseFor(req, { error: 'Too many reports' }, 429, {
      'Retry-After': String(RATE_WINDOW_MINUTES * 60),
    })
  }

  const { error } = await admin.from('client_errors').insert({
    user_id: await userIdFromRequest(req),
    message,
    stack: bounded(body.stack, MAX_STACK),
    component_stack: bounded(body.componentStack, MAX_STACK),
    path: bounded(body.path, MAX_PATH),
    user_agent: bounded(body.userAgent, MAX_USER_AGENT) ?? bounded(req.headers.get('user-agent'), MAX_USER_AGENT),
    ip_hash: ipHash,
  })

  if (error) {
    console.error('log-client-error: insert', error.message)
    return jsonResponseFor(req, { error: 'Error logging failed' }, 502)
  }

  return jsonResponseFor(req, { ok: true }, 202)
})
