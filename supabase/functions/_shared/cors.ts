/**
 * CORS helpers for edge functions.
 * Allows PUBLIC_APP_URL, sibling subdomains (creators/brands/admin),
 * optional CORS_ALLOWED_ORIGINS (comma-separated),
 * and any localhost / 127.0.0.1 origin so Vite (8080) is not blocked when
 * PUBLIC_APP_URL is production or another local port.
 */
import { isAllowedAppOrigin } from './hosts.ts'

export function resolveAllowOrigin(
  originHeader: string,
  appUrl: string,
  extraOrigins: string[] = [],
): string {
  const origin = originHeader.replace(/\/$/, '')
  const allowed = [appUrl, ...extraOrigins]
    .map((s) => s.replace(/\/$/, ''))
    .filter(Boolean)

  if (!origin) return allowed[0] || '*'
  if (allowed.includes(origin)) return origin
  if (appUrl && isAllowedAppOrigin(origin, appUrl)) return origin
  try {
    const host = new URL(origin).hostname
    if (host === 'localhost' || host === '127.0.0.1') return origin
  } catch {
    /* ignore invalid Origin */
  }
  return allowed[0] || '*'
}

export function corsForRequest(req: Request): Record<string, string> {
  const extras = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allowOrigin = resolveAllowOrigin(
    req.headers.get('Origin') ?? '',
    Deno.env.get('PUBLIC_APP_URL') ?? '',
    extras,
  )
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}

/** @deprecated Prefer corsForRequest(req) once PUBLIC_APP_URL is set. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

export function jsonResponseFor(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsForRequest(req),
      'Content-Type': 'application/json',
    },
  })
}
