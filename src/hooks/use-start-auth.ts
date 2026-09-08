import { useCallback } from 'react';
import { useLogin } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { type Audience } from '@/lib/audience';
import { beginAuth, markAuthRedirect } from '@/lib/pending-signup';

/** Opens the Privy modal. Pass creator/brand from the home gate so new profiles get a role. */
export function useStartAuth() {
  const { login } = useLogin();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    (role?: Audience | null) => {
      if (user) {
        navigate(roleHome(profile?.role));
        return;
      }
      if (role === 'creator' || role === 'brand') beginAuth(role);
      markAuthRedirect();
      login();
    },
    [login, user, profile, navigate],
  );
}

