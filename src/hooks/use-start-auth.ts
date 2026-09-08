import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { type Audience } from '@/lib/audience';
import { authStartHref, goToAppPath } from '@/lib/hosts';

/**
 * Starts auth on the role subdomain (or /signin locally) so the dark splash
 * plays, then Privy opens — one origin, one login.
 */
export function useStartAuth() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    (role?: Audience | null) => {
      if (user) {
        void goToAppPath(profile?.role, roleHome(profile?.role), navigate);
        return;
      }

      const audience: Audience = role === 'brand' ? 'brand' : 'creator';
      const hop = authStartHref(audience);
      if (hop) {
        window.location.assign(hop);
        return;
      }

      // Same host — go through /signin for splash → login
      if (!window.location.pathname.startsWith('/signin')) {
        navigate(`/signin?role=${audience}`);
        return;
      }
    },
    [user, profile, navigate],
  );
}
