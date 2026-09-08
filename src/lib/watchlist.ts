/** Local watchlist — campaigns for creators, creator profiles for brands. */
const KEY = (role: 'creator' | 'brand') => `unignored.watchlist.${role}`;

export const getWatchlist = (role: 'creator' | 'brand'): string[] => {
  try {
    const raw = localStorage.getItem(KEY(role));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export const isWatched = (role: 'creator' | 'brand', id: string) =>
  getWatchlist(role).includes(id);

export const toggleWatchlist = (role: 'creator' | 'brand', id: string): boolean => {
  const current = getWatchlist(role);
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  try {
    localStorage.setItem(KEY(role), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next.includes(id);
};
