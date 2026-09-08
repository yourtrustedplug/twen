import { useEffect, useState } from 'react';

type Status = 'checking' | 'ok' | 'bad';

/**
 * Warns when VITE_ Supabase credentials are rejected by the project.
 * Marketing pages still render; product auth/data will fail until keys are fixed.
 */
export function ConfigGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!url || !key) {
      setStatus('bad');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Prefer REST — auth/v1/health can be misleading with opaque keys.
        const res = await fetch(
          `${url.replace(/\/$/, '')}/rest/v1/profiles?select=id&limit=1`,
          {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          },
        );
        if (!cancelled) setStatus(res.ok || res.status === 206 ? 'ok' : 'bad');
      } catch {
        if (!cancelled) setStatus('bad');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
