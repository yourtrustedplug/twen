import { describe, expect, it } from 'vitest';
import { suggestRatePerVideo } from '@/lib/suggest-rate';

describe('suggestRatePerVideo', () => {
  it('returns 0 with no reach data', () => {
    expect(suggestRatePerVideo({ followerCount: 0, avgViews: 0, engagementRate: 0 })).toBe(0);
  });

  it('uses a follower floor for nano creators', () => {
    expect(suggestRatePerVideo({ followerCount: 2000, avgViews: 0, engagementRate: 0.05 })).toBeGreaterThanOrEqual(40);
  });

  it('raises the suggestion when average views are high', () => {
    const modest = suggestRatePerVideo({ followerCount: 20000, avgViews: 5000, engagementRate: 0.04 });
    const bigger = suggestRatePerVideo({ followerCount: 20000, avgViews: 80000, engagementRate: 0.04 });
    expect(bigger).toBeGreaterThan(modest);
  });

  it('rounds to the nearest 10', () => {
    const value = suggestRatePerVideo({ followerCount: 120000, avgViews: 40000, engagementRate: 0.06 });
    expect(value % 10).toBe(0);
  });
});
