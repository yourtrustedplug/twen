import { useEffect, useState } from 'react';
import { hasSupabaseConfig } from '@/integrations/supabase/client';

type Status = 'checking' | 'ok' | 'bad' | 'missing';

const hasPrivyConfig = Boolean((import.meta.env.VITE_PRIVY_APP_ID as string | undefined)?.trim());

/**
 * Blocks boot when client env is missing.
 * Only flags keys as invalid on HTTP 401/403 — network blips must not scare users.
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
        const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (cancelled) return;
        // 401/403 = wrong key. Anything else (200, RLS empty, 5xx, CORS) is not "invalid keys".
        if (res.status === 401 || res.status === 403) setStatus('bad');
        else setStatus('ok');
      } catch {
        // Offline / adblock / transient — don't show the scary banner.
        if (!cancelled) setStatus('ok');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'missing') {
    const missing = [
      !hasSupabaseConfig && 'SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY',
      !hasPrivyConfig && 'PRIVY_APP_ID',
    ].filter(Boolean);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background text-foreground">
        <h1 className="text-xl font-semibold">Missing deploy environment</h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          This build is missing <code className="font-mono">{missing.join(', ')}</code>. Add those
          names in Vercel → Settings → Environment Variables (no <code className="font-mono">VITE_</code>{' '}
          prefix — use Secret), then <strong>redeploy</strong>.
        </p>
      </div>
    );
  }

  return (
    <>
      {status === 'bad' && !dismissed ? (
        <div className="sticky top-0 z-[100] bg-rose-700 text-white px-4 py-3 text-sm text-center">
          Supabase rejected this app&apos;s publishable key (HTTP 401/403). Update{' '}
          <code className="font-mono">SUPABASE_PUBLISHABLE_KEY</code> in{' '}
          <code className="font-mono">.env.production</code> from the Dashboard, then redeploy.{' '}
          <button type="button" className="underline ml-2" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
