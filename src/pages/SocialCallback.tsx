import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { Loader2 } from 'lucide-react';

/** Lands TikTok / Instagram OAuth codes and finishes the connect on the edge. */
const SocialCallback = () => {
  const [params] = useSearchParams();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

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
      .then(({ data, error: fnError }) => {
        if (fnError || data?.error) {
          setError(edgeFunctionErrorMessage(fnError, data, 'Could not connect the account'));
          return;
        }
        const platform = data?.platform === 'instagram' ? 'instagram' : 'tiktok';
        window.location.replace(`/creator/profile?connected=${platform}`);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not connect the account');
      });
  }, [params]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <Link to="/creator/profile" className="text-sm font-semibold underline">
          Back to profile
        </Link>
      </div>
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
