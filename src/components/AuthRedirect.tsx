import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { takeAuthRedirect } from '@/lib/pending-signup';
import { onboardingFor } from '@/lib/onboarding';

/** After a Privy login started from marketing, send the user into the app. */
export function AuthRedirect() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || isLoading || !profile) return;
    if (!takeAuthRedirect()) return;
    const onboarding = onboardingFor(profile);
    navigate(onboarding.complete ? roleHome(profile.role) : onboarding.profilePath, { replace: true });
  }, [user, isLoading, profile, navigate]);

  return null;
}
