/**
 * Subdomain tenants for Twen.
 *
 * Marketing (landings) always live on the apex:
 *   twen.app/            — audience gate
 *   twen.app/creators    — creator landing
 *   twen.app/brands      — brand landing
 *
 * Subdomains are app entry points (same SPA):
 *   creator.twen.app     — /creator app
 *   brand.twen.app       — /brand app
 *   admin.twen.app       — /admin
 *
 * Local: creator.localhost:8080 (etc.) works the same way.
 */

export type AppTenant = 'creator' | 'brand' | 'admin' | 'apex';

const TENANTS = ['creator', 'brand', 'admin'] as const;

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

/** Parse tenant from a hostname (no port). */
export function parseTenant(hostname: string): AppTenant {
  const host = normalizeHostname(hostname);
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return 'apex';
  const label = parts[0];
  if ((TENANTS as readonly string[]).includes(label)) return label as AppTenant;
  return 'apex';
}

/** Registrable / apex host: twen.app, localhost, … */
export function apexHostFrom(hostname: string): string {
  const host = normalizeHostname(hostname);
  const tenant = parseTenant(host);
  if (tenant === 'apex') return host;
  return host.split('.').slice(1).join('.');
}

export function getHostname(): string {
  if (typeof window === 'undefined') return 'twen.app';
  return normalizeHostname(window.location.hostname);
}

export function getAppTenant(): AppTenant {
  return parseTenant(getHostname());
}

export function isLocalApex(host: string): boolean {
  const h = normalizeHostname(host);
  return h === 'localhost' || h === '127.0.0.1';
}

function shouldKeepPort(apex: string, port: string): boolean {
  if (!port) return false;
  return isLocalApex(apex) || apex.endsWith('.localhost');
}

/** Origin for a tenant on the current apex (preserves protocol + port in local). */
export function tenantOrigin(
  tenant: AppTenant,
  opts?: { hostname?: string; protocol?: string; port?: string },
): string {
  const hostname =
    opts?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'twen.app');
  const protocol =
    opts?.protocol ?? (typeof window !== 'undefined' ? window.location.protocol : 'https:');
  const port = opts?.port ?? (typeof window !== 'undefined' ? window.location.port : '');
  const apex = apexHostFrom(hostname);
  const host = tenant === 'apex' ? apex : `${tenant}.${apex}`;
  const suffix = shouldKeepPort(apex, port) ? `:${port}` : '';
  return `${protocol}//${host}${suffix}`;
}

/**
 * Marketing landings stay on apex paths: /creators, /brands.
 * From a subdomain, link back to https://twen.app/creators (etc.).
 */
export function audienceHref(audience: 'creator' | 'brand'): string {
  const path = audience === 'brand' ? '/brands' : '/creators';
  if (typeof window === 'undefined') return `https://twen.app${path}`;
  const host = getHostname();
  if (isLocalApex(host) || getAppTenant() === 'apex') return path;
  return `${tenantOrigin('apex')}${path}`;
}

export function adminHref(): string {
  if (typeof window === 'undefined') return 'https://admin.twen.app/admin';
  const host = getHostname();
  if (isLocalApex(host)) return '/admin';
  if (getAppTenant() === 'admin') return '/admin';
  return `${tenantOrigin('admin')}/admin`;
}

/**
 * Build a role-scoped app origin from PUBLIC_APP_URL (edge / server).
 * https://twen.app + brand → https://brand.twen.app
 */
export function roleScopedAppUrl(appUrl: string, role: 'brand' | 'creator' | 'staff'): string {
  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    return appUrl.replace(/\/$/, '');
  }
  const host = normalizeHostname(parsed.hostname);
  const tenant = parseTenant(host);
  if (tenant !== 'apex') return parsed.origin;
  if (isLocalApex(host)) return parsed.origin;
  const sub = role === 'brand' ? 'brand' : role === 'staff' ? 'admin' : 'creator';
  parsed.hostname = `${sub}.${host}`;
  return parsed.origin;
}
