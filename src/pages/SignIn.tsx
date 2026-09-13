import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useLogin } from '@privy-io/react-auth';
import { useAuth, roleHome } from '@/contexts/AuthContext';
import { getRememberedAudience, type Audience } from '@/lib/audience';
import { deliverPendingBookAndGo } from '@/lib/hire';
import { BRAND_PLUS_UPGRADE_PATH, isPro } from '@/lib/plan';
import { beginAuth, markAuthRedirect, mergePendingBook, parseRole, peekPendingBook, pendingBookFromSearch, setPendingBook } from '@/lib/pending-signup';
import { getAppTenant, getHostname, goToAppPath, isLocalApex } from '@/lib/hosts';
import { AuthSplash } from '@/components/AuthSplash';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/logos';
import { Button } from '@/components/ui/button';

/** Splash + Privy on tenant hosts / localhost. Apex /signin goes to the home gate. */
const SignIn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, isLoading, authSyncError } = useAuth();
  const { login } = useLogin();
  const role: Audience =
    parseRole(searchParams.get('role')) ?? getRememberedAudience() ?? 'creator';
  const [showSplash, setShowSplash] = useState(true);
  const opened = useRef(false);
  const apexGate = getAppTenant() === 'apex' && !isLocalApex(getHostname());

  useEffect(() => {
    const fromUrl = pendingBookFromSearch(searchParams);
    if (fromUrl) setPendingBook(mergePendingBook(peekPendingBook(), fromUrl));
  }, [searchParams]);

  useEffect(() => {
    if (apexGate || !user || isLoading || !profile) return;
    if (profile.role === 'brand' && peekPendingBook()) {
      if (!isPro(profile)) {
        void goToAppPath('brand', BRAND_PLUS_UPGRADE_PATH, navigate);
        return;
      }
      void deliverPendingBookAndGo({
        brandId: user.id,
        brandName: profile.company_name || profile.full_name || 'Brand',
        isPro: true,
        navigate,
      });
      return;
    }
    void goToAppPath(profile.role, roleHome(profile.role), navigate);
  }, [apexGate, user, isLoading, profile, navigate]);

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
    if (apexGate || showSplash || opened.current || isLoading || user) return;
    openLogin();
  }, [apexGate, showSplash, isLoading, user, openLogin]);

  if (apexGate) {
    return <Navigate to="/" replace />;
  }

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
