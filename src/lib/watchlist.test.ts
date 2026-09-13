import { describe, expect, it, beforeEach } from 'vitest';
import {
  getWatchlist,
  isWatched,
  mergeWatchlistIds,
  persistWatchlistToggle,
  toggleWatchlist,
  watchlistKind,
} from './watchlist';

describe('watchlist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('maps creator saves to campaigns and brand saves to creators', () => {
    expect(watchlistKind('creator')).toBe('campaign');
    expect(watchlistKind('brand')).toBe('creator');
  });

  it('toggles locally and reports watched state', () => {
    expect(getWatchlist('creator')).toEqual([]);
    expect(toggleWatchlist('creator', 'camp-1')).toBe(true);
    expect(isWatched('creator', 'camp-1')).toBe(true);
    expect(toggleWatchlist('creator', 'camp-1')).toBe(false);
    expect(getWatchlist('creator')).toEqual([]);
  });

  it('unions local and remote ids without duplicates', () => {
    expect(mergeWatchlistIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('keeps localStorage when persist has no user', async () => {
    expect(await persistWatchlistToggle('creator', 'camp-2')).toBe(true);
    expect(isWatched('creator', 'camp-2')).toBe(true);
  });
});
