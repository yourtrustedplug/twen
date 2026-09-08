/** Human-readable errors for supabase.functions.invoke failures. */
export function edgeFunctionErrorMessage(
  error: unknown,
  data?: { error?: string } | null,
  fallback = 'Request failed',
): string {
  if (data?.error) return String(data.error);

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  // Supabase JS surfaces 404 as Failed to send / FunctionsHttpError with context.status
  if (error && typeof error === 'object' && 'context' in error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) {
      return 'Backend function not deployed yet. A Twen project owner must run ./scripts/deploy-functions.sh';
    }
  }
  if (/404|not found/i.test(msg) && /edge function|functions?\.?http/i.test(msg)) {
    return 'Backend function not deployed yet. A Twen project owner must run ./scripts/deploy-functions.sh';
  }
  if (/failed to send/i.test(msg)) {
    return 'Could not reach the backend. Check the browser console for CORS — local apps must be allowed by the edge function.';
  }

  return msg || fallback;
}
