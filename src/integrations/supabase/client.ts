// Supabase browser client — session comes from Privy exchange (setSession).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

/** True when Vite baked in publishable Supabase credentials (required on Vercel at build time). */
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Placeholder URL/key so createClient never throws at module load.
 * Real calls fail until VITE_SUPABASE_* are set and the app is rebuilt.
 */
const url = hasSupabaseConfig ? SUPABASE_URL : 'https://placeholder.supabase.co';
const key = hasSupabaseConfig ? SUPABASE_PUBLISHABLE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase: SupabaseClient<Database> = createClient<Database>(url, key, {
  global: {
    fetch: createSupabaseFetch(key),
  },
  auth: {
    persistSession: hasSupabaseConfig,
    autoRefreshToken: hasSupabaseConfig,
    detectSessionInUrl: hasSupabaseConfig,
  },
});
