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

/** Which subdomain a signed-in role should live on. */
export function tenantForRole(role: string | null | undefined): AppTenant {
  if (role === 'brand') return 'brand';
  if (role === 'admin' || role === 'moderator') return 'admin';
  return 'creator';
}

export function isAppPath(pathname: string): boolean {
  return /^\/(creator|brand|admin|dashboard|messages)(\/|$)/.test(pathname);
}

/**
 * Path or absolute URL for an in-app screen on the role's subdomain.
 * Localhost stays path-only; production jumps to creator/brand/admin.twen.app.
 */
export function roleAppHref(role: string | null | undefined, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window === 'undefined') {
    const sub = tenantForRole(role);
    return `https://${sub}.twen.app${normalized}`;
  }
  const host = getHostname();
  if (isLocalApex(host)) return normalized;
  const origin = tenantOrigin(tenantForRole(role));
  if (window.location.origin === origin) return normalized;
  return `${origin}${normalized}`;
}

/** Navigate within the SPA, or hard-assign when the role subdomain differs.
 * Cross-host jumps attach the Supabase session in the hash so the destination
 * can restore it (Privy localStorage does not cross subdomains).
 */
export async function goToAppPath(
  role: string | null | undefined,
  path: string,
  navigate?: (to: string, opts?: { replace?: boolean }) => void,
  replace = true,
): Promise<void> {
  const href = roleAppHref(role, path);
  if (href.startsWith('http')) {
    let target = href;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.access_token && session?.refresh_token) {
        const url = new URL(href);
        url.hash = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          type: 'handoff',
        }).toString();
        target = url.toString();
      }
    } catch {
      /* proceed without handoff */
    }
    if (replace) window.location.replace(target);
    else window.location.assign(target);
    return;
  }
  if (navigate) navigate(href, { replace });
  else if (replace) window.location.replace(href);
  else window.location.assign(href);
}

/** Where to open Privy for a role so login and app share one origin. */
export function authStartHref(role: 'creator' | 'brand'): string | null {
  if (typeof window === 'undefined') return null;
  const host = getHostname();
  if (isLocalApex(host)) return null;
  if (getAppTenant() === role) return null;
  return `${tenantOrigin(role)}/signin?role=${role}`;
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
