import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { onboardingFor } from '@/lib/onboarding';
import { goToAppPath } from '@/lib/hosts';
import { deliverPendingBookAndGo } from '@/lib/hire';
import { BRAND_PLUS_UPGRADE_PATH, isPro } from '@/lib/plan';
import { peekPendingBook, takeAuthRedirect } from '@/lib/pending-signup';

/** After a Privy login started from marketing, send the user into the app. */
export function AuthRedirect() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || isLoading || !profile) return;
    if (!takeAuthRedirect()) return;
    let cancelled = false;
    void (async () => {
      if (profile.role === 'brand' && peekPendingBook()) {
        if (!isPro(profile)) {
          if (!cancelled) void goToAppPath('brand', BRAND_PLUS_UPGRADE_PATH, navigate);
          return;
        }
        const delivered = await deliverPendingBookAndGo({
          brandId: user.id,
          brandName: profile.company_name || profile.full_name || 'Brand',
          isPro: true,
          navigate,
        });
        if (cancelled || delivered) return;
      }
      if (cancelled) return;
      if (window.location.pathname.startsWith('/signin')) return;
      const onboarding = onboardingFor(profile);
      const path = onboarding.complete ? roleHome(profile.role) : onboarding.profilePath;
      void goToAppPath(profile.role, path, navigate);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isLoading, profile, navigate]);

  return null;
}
