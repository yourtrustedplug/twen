import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { onboardingFor } from '@/lib/onboarding';
import { getAppTenant, getHostname, goToAppPath, isAppPath, isLocalApex, isLocalLoopback } from '@/lib/hosts';
import { canAccessTenant } from '@/lib/roles';

/**
 * If the user is on an app path under www/apex (or a tenant they cannot use),
 * bounce them to a host they can use, with session handoff.
 * Staff and multi-role accounts may stay on creator, brand, or admin.
 */
export function AppHostRedirect() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !user || !profile) return;
    const host = getHostname();
    if (isLocalApex(host) || isLocalLoopback(host)) return;
    if (!isAppPath(location.pathname)) return;

    const tenant = getAppTenant();
    if (tenant !== 'apex' && canAccessTenant(profile, tenant)) return;

    const onboarding = onboardingFor(profile);
    const target = !onboarding.complete
      ? onboarding.profilePath
      : location.pathname === '/dashboard'
        ? roleHome(profile.role)
        : `${location.pathname}${location.search}`;
    void goToAppPath(profile.role, target);
  }, [user, profile, isLoading, location.pathname, location.search]);

  return null;
}
