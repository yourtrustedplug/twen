import { supabase } from '@/integrations/supabase/client';

/** Local cache + optional remote watchlist — campaigns for creators, profiles for brands. */
const KEY = (role: 'creator' | 'brand') => `unignored.watchlist.${role}`;

export type WatchlistRole = 'creator' | 'brand';

export const watchlistKind = (role: WatchlistRole): 'campaign' | 'creator' =>
  role === 'creator' ? 'campaign' : 'creator';

export const mergeWatchlistIds = (local: string[], remote: string[]) =>
  [...new Set([...local, ...remote])];

export const getWatchlist = (role: WatchlistRole): string[] => {
  try {
    const raw = localStorage.getItem(KEY(role));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const writeLocal = (role: WatchlistRole, ids: string[]) => {
  try {
    localStorage.setItem(KEY(role), JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
};

export const isWatched = (role: WatchlistRole, id: string) => getWatchlist(role).includes(id);

export const toggleWatchlistLocal = (role: WatchlistRole, id: string): boolean => {
  const current = getWatchlist(role);
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  writeLocal(role, next);
  return next.includes(id);
};

/** Keep localStorage in sync; used when remote load is skipped or failed. */
export const toggleWatchlist = toggleWatchlistLocal;

export const loadWatchlist = async (role: WatchlistRole, userId?: string | null): Promise<string[]> => {
  const local = getWatchlist(role);
  if (!userId) return local;
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('target_id')
      .eq('user_id', userId)
      .eq('kind', watchlistKind(role));
    if (error) return local;
    const remote = (data ?? []).map((row) => row.target_id);
    const merged = mergeWatchlistIds(local, remote);
    const missing = local.filter((id) => !remote.includes(id));
    if (missing.length) {
      const kind = watchlistKind(role);
      const { error: upsertError } = await supabase.from('watchlist').upsert(
        missing.map((target_id) => ({ user_id: userId, kind, target_id })),
        { onConflict: 'user_id,kind,target_id' },
      );
      if (upsertError) console.warn('watchlist migrate', upsertError.message);
    }
    writeLocal(role, merged);
    return merged;
  } catch {
    return local;
  }
};

export const persistWatchlistToggle = async (
  role: WatchlistRole,
  id: string,
  userId?: string | null,
): Promise<boolean> => {
  const nextOn = toggleWatchlistLocal(role, id);
  if (!userId) return nextOn;
  try {
    const kind = watchlistKind(role);
    if (nextOn) {
      const { error } = await supabase
        .from('watchlist')
        .upsert({ user_id: userId, kind, target_id: id }, { onConflict: 'user_id,kind,target_id' });
      if (error) console.warn('watchlist save', error.message);
    } else {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', userId)
        .eq('kind', kind)
        .eq('target_id', id);
      if (error) console.warn('watchlist remove', error.message);
    }
  } catch {
    /* local already updated */
  }
  return nextOn;
};
