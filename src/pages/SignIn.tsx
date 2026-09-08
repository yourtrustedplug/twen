import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLogin } from '@privy-io/react-auth';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { getRememberedAudience, type Audience } from '@/lib/audience';
import { beginAuth, markAuthRedirect, parseRole } from '@/lib/pending-signup';
import { goToAppPath } from '@/lib/hosts';
import { AuthSplash } from '@/components/AuthSplash';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/logos';
import { Button } from '@/components/ui/button';

/** Fallback for protected routes + creator/brand entry after the gate. */
const SignIn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, isLoading, authSyncError } = useAuth();
  const { login } = useLogin();
  const role: Audience =
    parseRole(searchParams.get('role')) ?? getRememberedAudience() ?? 'creator';
  const [showSplash, setShowSplash] = useState(true);
  const opened = useRef(false);

  useEffect(() => {
    if (!user || isLoading) return;
    void goToAppPath(profile?.role, roleHome(profile?.role), navigate);
  }, [user, isLoading, profile, navigate]);

  const openLogin = useCallback(() => {
    if (opened.current || user) return;
    opened.current = true;
    beginAuth(role);
    markAuthRedirect();
    login();
  }, [login, role, user]);

  const onSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  // After splash, open Privy once auth stack is ready.
  useEffect(() => {
    if (showSplash || opened.current || isLoading || user) return;
    openLogin();
  }, [showSplash, isLoading, user, openLogin]);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A101D]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFB0B6]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0A101D] px-5">
      {showSplash ? <AuthSplash role={role} onDone={onSplashDone} /> : null}

      {!showSplash ? (
        <>
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Logo
              variant="full"
              reverse
              iconClassName="w-6 h-6"
              wordmarkClassName="text-[1.675rem] leading-[1.2] text-[#F5F5F5]"
            />
          </Link>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-[#FFB0B6]" /> : null}
          {authSyncError ? (
            <p className="max-w-sm text-center text-sm text-[#FFB0B6]">{authSyncError}</p>
          ) : null}
          <Button
            variant="invofy"
            size="invofy"
            className="bg-[#F5F5F5] text-[#0A101D] hover:bg-[#FFDFD2]"
            onClick={() => {
              opened.current = false;
              openLogin();
            }}
          >
            Continue
          </Button>
        </>
      ) : null}
    </div>
  );
};

export default SignIn;
