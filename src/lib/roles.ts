import { isStaff } from '@/lib/staff';
import { tenantForRole, type AppTenant } from '@/lib/hosts';

export type AppSurface = 'creator' | 'brand' | 'admin';

export type RoleProfile = {
  role?: string | null;
  roles?: string[] | null;
};

const SURFACES: AppSurface[] = ['creator', 'brand', 'admin'];

export function parseRoleList(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0);
}

/** Every role this account can act as. Staff can use creator, brand, and admin. */
export function profileRoles(profile: RoleProfile | null | undefined): Set<string> {
  const set = new Set<string>();
  if (profile?.role) set.add(profile.role);
  for (const role of parseRoleList(profile?.roles)) set.add(role);
  if ([...set].some(isStaff)) {
    set.add('admin');
    set.add('moderator');
    set.add('creator');
    set.add('brand');
  }
  return set;
}

export function hasRole(profile: RoleProfile | null | undefined, role: string): boolean {
  const roles = profileRoles(profile);
  if (isStaff(role)) return roles.has('admin') || roles.has('moderator');
  return roles.has(role);
}

export function accessibleSurfaces(profile: RoleProfile | null | undefined): AppSurface[] {
  return SURFACES.filter((surface) => hasRole(profile, surface));
}

export function canAccessTenant(profile: RoleProfile | null | undefined, tenant: AppTenant): boolean {
  if (tenant === 'apex') return true;
  return hasRole(profile, tenant);
}

export function roleFromTenant(tenant: AppTenant): AppSurface {
  if (tenant === 'brand') return 'brand';
  if (tenant === 'admin') return 'admin';
  return 'creator';
}

export function surfaceHome(surface: AppSurface): string {
  if (surface === 'brand') return '/brand';
  if (surface === 'admin') return '/admin';
  return '/creator';
}

export function surfaceLabel(surface: AppSurface): string {
  if (surface === 'brand') return 'Brand';
  if (surface === 'admin') return 'Admin';
  return 'Creator';
}

/** Which app the user is in right now (path on localhost, host in production). */
export function activeSurface(
  pathname: string,
  tenant: AppTenant,
  profile?: RoleProfile | null,
): AppSurface {
  if (pathname.startsWith('/admin') || pathname.startsWith('/moderator') || tenant === 'admin') {
    return 'admin';
  }
  if (pathname.startsWith('/brand') || tenant === 'brand') return 'brand';
  if (pathname.startsWith('/creator') || tenant === 'creator') return 'creator';
  const fallback = tenantForRole(profile?.role);
  if (fallback === 'brand' || fallback === 'admin') return fallback;
  return 'creator';
}
