import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAppTenant, getHostname, isAppPath, isLocalApex, roleAppHref, tenantForRole } from '@/lib/hosts';

/**
 * If the user is on an app path under www/apex (or the wrong tenant host),
 * bounce them to creator.twen.app / brand.twen.app / admin.twen.app.
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

    const href = roleAppHref(profile.role, `${location.pathname}${location.search}${location.hash}`);
    if (href.startsWith('http')) window.location.replace(href);
  }, [user, profile, isLoading, location.pathname, location.search, location.hash]);

  return null;
}
