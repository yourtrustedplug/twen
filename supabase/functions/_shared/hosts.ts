/**
 * Host / subdomain helpers for edge functions (mirror of src/lib/hosts.ts).
 * PUBLIC_APP_URL stays https://twen.app; role redirects go to sibling subdomains.
 */

const TENANTS = ['creator', 'brand', 'admin'] as const

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

function parseTenant(hostname: string): 'creator' | 'brand' | 'admin' | 'apex' {
  const host = normalizeHostname(hostname)
  const parts = host.split('.').filter(Boolean)
  if (parts.length < 2) return 'apex'
  const label = parts[0]
  if ((TENANTS as readonly string[]).includes(label)) {
    return label as 'creator' | 'brand' | 'admin'
  }
  return 'apex'
}

function isLocalApex(host: string): boolean {
  const h = normalizeHostname(host)
  return h === 'localhost' || h === '127.0.0.1'
}

/** https://twen.app + brand → https://brand.twen.app */
export function roleScopedAppUrl(
  appUrl: string,
  role: 'brand' | 'creator' | 'staff',
): string {
  let parsed: URL
  try {
    parsed = new URL(appUrl)
  } catch {
    return appUrl.replace(/\/$/, '')
  }
  const host = normalizeHostname(parsed.hostname)
  const tenant = parseTenant(host)
  if (tenant !== 'apex') return parsed.origin
  if (isLocalApex(host)) return parsed.origin
  const sub = role === 'brand' ? 'brand' : role === 'staff' ? 'admin' : 'creator'
  parsed.hostname = `${sub}.${host}`
  return parsed.origin
}

/** True when origin is PUBLIC_APP_URL or a sibling subdomain (creator/brand/admin). */
export function isAllowedAppOrigin(origin: string, appUrl: string): boolean {
  if (!origin || !appUrl) return false
  try {
    const o = new URL(origin)
    const a = new URL(appUrl)
    const oh = normalizeHostname(o.hostname)
    const ah = normalizeHostname(a.hostname)
    const apex = parseTenant(ah) === 'apex' ? ah : ah.split('.').slice(1).join('.')
    if (oh === apex) return true
    if (!oh.endsWith(`.${apex}`)) return false
    const label = oh.slice(0, -(apex.length + 1))
    return (TENANTS as readonly string[]).includes(label)
  } catch {
    return false
  }
}
