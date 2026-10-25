/**
 * Best-effort client error reporting.
 *
 * This must never throw or block rendering. It is intentionally a plain fetch
 * (no Supabase client import) so it can run from the root error boundary before
 * the app is fully bootstrapped.
 */
type ClientErrorInput = {
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  path?: string;
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

function truncate(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.slice(0, max);
}

export function reportClientError(input: ClientErrorInput): void {
  if (!SUPABASE_URL || !SUPABASE_KEY || typeof window === 'undefined') return;

  const payload = {
    message: truncate(input.message, 2_000) ?? 'Unknown client error',
    stack: truncate(input.stack, 8_000),
    componentStack: truncate(input.componentStack, 8_000),
    // Never send query strings or hashes: they can contain OAuth/session data.
    path: window.location.pathname.slice(0, 512),
    userAgent: truncate(navigator.userAgent, 512),
  };

  try {
    void fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/log-client-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* reporting must never surface another error */
    });
  } catch {
    /* ignore */
  }
}

let installed = false;

export function installGlobalErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    reportClientError({
      message: event.error instanceof Error ? event.error.message : event.message || 'Window error',
      stack: event.error instanceof Error ? event.error.stack : null,
      componentStack: 'window.error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientError({
      message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection'),
      stack: reason instanceof Error ? reason.stack : null,
      componentStack: 'window.unhandledrejection',
    });
  });
}
