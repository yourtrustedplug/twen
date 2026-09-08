import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRememberedAudience } from '@/lib/audience';
import { parseRole } from '@/lib/pending-signup';
import { useStartAuth } from '@/hooks/use-start-auth';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/logos';
import { Button } from '@/components/ui/button';

/** Fallback for protected routes. Opens the Privy modal — same as the home gate. */
const SignIn = () => {
  const [searchParams] = useSearchParams();
  const { isLoading, authSyncError } = useAuth();
  const startAuth = useStartAuth();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || isLoading) return;
    opened.current = true;
    startAuth(parseRole(searchParams.get('role')) ?? getRememberedAudience());
  }, [isLoading, searchParams, startAuth]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-5">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <Logo
          variant="full"
          iconClassName="w-6 h-6"
          wordmarkClassName="text-[1.675rem] leading-[1.2]"
        />
      </Link>
      {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : null}
      {authSyncError ? <p className="text-sm text-red-600 text-center">{authSyncError}</p> : null}
      <Button variant="invofy" size="invofy" onClick={() => startAuth(parseRole(searchParams.get('role')) ?? getRememberedAudience())}>
        Continue
      </Button>
    </div>
  );
};

export default SignIn;
