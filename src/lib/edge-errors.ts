/** Human-readable errors for supabase.functions.invoke failures. */

type FunctionErrorBody = { error?: unknown; message?: unknown; msg?: unknown };

const statusOf = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('context' in error)) return undefined;
  const context = (error as { context?: { status?: number } }).context;
  return typeof context?.status === 'number' ? context.status : undefined;
};

const textFromBody = (body: FunctionErrorBody | null | undefined): string | null => {
  if (!body) return null;
  for (const value of [body.error, body.message, body.msg]) {
    if (typeof value === 'string' && value.trim() && !/non-2xx status code/i.test(value)) {
      return value.trim();
    }
  }
  return null;
};

const readContextBody = async (error: unknown): Promise<FunctionErrorBody | null> => {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!context) return null;

  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const json = await context.clone().json();
      if (json && typeof json === 'object') return json as FunctionErrorBody;
    } catch {
      try {
        const text = (await context.clone().text()).trim();
        if (text) return { error: text };
      } catch {
        return null;
      }
    }
    return null;
  }

  if (typeof context === 'object') {
    const ctx = context as FunctionErrorBody & { json?: () => Promise<unknown> };
    if (typeof ctx.json === 'function') {
      try {
        const json = await ctx.json();
        if (json && typeof json === 'object') return json as FunctionErrorBody;
      } catch {
        return textFromBody(ctx) ? ctx : null;
      }
    }
    if (textFromBody(ctx)) return ctx;
  }
  return null;
};

export async function edgeFunctionErrorMessage(
  error: unknown,
  data?: { error?: string } | null,
  fallback = 'Request failed',
): Promise<string> {
  if (data?.error) return String(data.error);

  const fromContext = textFromBody(await readContextBody(error));
  if (fromContext) return fromContext;

  const status = statusOf(error);
  if (status === 404) {
    return 'Backend function not deployed yet. A Twen project owner must run ./scripts/deploy-functions.sh';
  }
  if (status === 401) {
    return 'Sign in again, then retry.';
  }

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (/404|not found/i.test(msg) && /edge function|functions?\.?http/i.test(msg)) {
    return 'Backend function not deployed yet. A Twen project owner must run ./scripts/deploy-functions.sh';
  }
  if (/failed to send/i.test(msg)) {
    return 'Could not reach the backend. Check the browser console for CORS — local apps must be allowed by the edge function.';
  }
  if (/non-2xx status code/i.test(msg)) return fallback;

  return msg || fallback;
}
