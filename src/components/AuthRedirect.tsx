import { useEffect } from 'react';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { takeAuthRedirect } from '@/lib/pending-signup';
import { onboardingFor } from '@/lib/onboarding';
import { goToAppPath } from '@/lib/hosts';

/** After a Privy login started from marketing, send the user into the app subdomain. */
export function AuthRedirect() {
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!user || isLoading || !profile) return;
    if (!takeAuthRedirect()) return;
    const onboarding = onboardingFor(profile);
    const path = onboarding.complete ? roleHome(profile.role) : onboarding.profilePath;
    goToAppPath(profile.role, path);
  }, [user, isLoading, profile]);

  return null;
}
