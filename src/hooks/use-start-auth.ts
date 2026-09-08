import { useCallback } from 'react';
import { useLogin } from '@privy-io/react-auth';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { type Audience } from '@/lib/audience';
import { beginAuth, markAuthRedirect } from '@/lib/pending-signup';
import { authStartHref, goToAppPath } from '@/lib/hosts';

/** Opens the Privy modal. Pass creator/brand from the home gate so new profiles get a role. */
export function useStartAuth() {
  const { login } = useLogin();
  const { user, profile } = useAuth();

  return useCallback(
    (role?: Audience | null) => {
      if (user) {
        void goToAppPath(profile?.role, roleHome(profile?.role));
        return;
      }
      // Login on the role subdomain so Privy + app share one origin (no second sign-in).
      if (role === 'creator' || role === 'brand') {
        const hop = authStartHref(role);
        if (hop) {
          window.location.assign(hop);
          return;
        }
        beginAuth(role);
      }
      markAuthRedirect();
      login();
    },
    [login, user, profile],
  );
}
