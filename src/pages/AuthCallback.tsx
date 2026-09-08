import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AUTHED_ROUTE, SIGNED_OUT_ROUTE } from "@/lib/auth-routes";

/**
 * /auth/callback — residual handler for any Supabase session tokens that land
 * in the URL (legacy email links / hash tokens). Primary login is Privy →
 * privy-exchange and does not need this route.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = url.searchParams.get("code");

      try {
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(url.href);
        }
      } catch {
        // Fall through to getSession()
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate(DEFAULT_AUTHED_ROUTE, { replace: true });
      } else {
        setFailed(true);
      }
    })();
  }, [navigate]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t finish signing you in. Please try again.
        </p>
        <button
          onClick={() => navigate(SIGNED_OUT_ROUTE, { replace: true })}
          className="text-sm font-medium underline underline-offset-4"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
    </div>
  );
};

export default AuthCallback;
