import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { roleAppHref, socialCallbackLandingPath } from '@/lib/hosts';
import { takeSocialReturnPath } from '@/lib/social-return';
import { ErrorPoster } from '@/components/ErrorPoster';
import { Loader2 } from 'lucide-react';

/** Lands TikTok / Instagram OAuth codes and finishes the connect on the edge. */
const SocialCallback = () => {
  const [params] = useSearchParams();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const profileHref = roleAppHref('creator', '/creator/profile');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const oauthError = params.get('error') || params.get('error_description');
    const code = params.get('code')?.replace(/#.*$/, '');
    const state = params.get('state');

    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!code || !state) {
      setError('Missing OAuth code. Try Connect again.');
      return;
    }

    supabase.functions
      .invoke('social-oauth-callback', { body: { code, state } })
      .then(async ({ data, error: fnError }) => {
        if (fnError || data?.error) {
          setError(await edgeFunctionErrorMessage(fnError, data, 'Could not connect the account'));
          return;
        }
        const platform = data?.platform === 'instagram' ? 'instagram' : 'tiktok';
        const stored = takeSocialReturnPath();
        const next =
          stored
            ? roleAppHref('creator', stored)
            : typeof data?.next === 'string' && data.next
              ? data.next
              : roleAppHref('creator', socialCallbackLandingPath(platform));
        window.location.replace(next);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not connect the account');
      });
  }, [params]);

  if (error) {
    return (
      <ErrorPoster
        logoHref={profileHref}
        documentTitle="Couldn't connect | Twen"
        watermark="400"
        eyebrow="Connect"
        title="That account didn't connect."
        description={error}
        actions={[{ label: 'Back to profile', href: profileHref }]}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Connecting your account…</p>
    </div>
  );
};

export default SocialCallback;
