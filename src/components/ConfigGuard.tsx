import { useEffect, useState } from 'react';
import { hasSupabaseConfig } from '@/integrations/supabase/client';

type Status = 'checking' | 'ok' | 'bad' | 'missing';

const hasPrivyConfig = Boolean((import.meta.env.VITE_PRIVY_APP_ID as string | undefined)?.trim());

/**
 * Blocks boot when VITE_ env is missing (common Vercel misconfig → white screen).
 * Otherwise warns when publishable keys are rejected by the project.
 */
export function ConfigGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(() =>
    hasSupabaseConfig && hasPrivyConfig ? 'checking' : 'missing',
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !hasPrivyConfig) return;

    const url = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    let cancelled = false;
    (async () => {
      try {
        // Prefer REST — auth/v1/health can be misleading with opaque keys.
        const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!cancelled) setStatus(res.ok || res.status === 206 ? 'ok' : 'bad');
      } catch {
        if (!cancelled) setStatus('bad');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'missing') {
    const missing = [
      !hasSupabaseConfig && 'VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY',
      !hasPrivyConfig && 'VITE_PRIVY_APP_ID',
    ].filter(Boolean);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background text-foreground">
        <h1 className="text-xl font-semibold">Missing deploy environment</h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          This build is missing <code className="font-mono">{missing.join(', ')}</code>. Set them in
          Vercel → Settings → Environment Variables (Production), then{' '}
          <strong>redeploy</strong> — Vite bakes these in at build time.
        </p>
      </div>
    );
  }

  return (
    <>
      {status === 'bad' && !dismissed ? (
        <div className="sticky top-0 z-[100] bg-rose-700 text-white px-4 py-3 text-sm text-center">
          Supabase API keys in <code className="font-mono">.env</code> are invalid for this project.
          Refresh publishable + secret from the Dashboard, paste <code className="font-mono">supabase/LAUNCH.sql</code>,
          then deploy edge functions.{' '}
          <button type="button" className="underline ml-2" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
