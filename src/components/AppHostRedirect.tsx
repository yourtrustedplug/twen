import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { onboardingFor } from '@/lib/onboarding';
import { getAppTenant, getHostname, goToAppPath, isAppPath, isLocalApex, tenantForRole } from '@/lib/hosts';

/**
 * If the user is on an app path under www/apex (or the wrong tenant host),
 * bounce them to creator.twen.app / brand.twen.app / admin.twen.app with session handoff.
 */
export function AppHostRedirect() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !user || !profile) return;
    const host = getHostname();
    if (isLocalApex(host)) return;
    if (!isAppPath(location.pathname)) return;

    const expected = tenantForRole(profile.role);
    if (getAppTenant() === expected) return;

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
