import { describe, expect, it } from 'vitest';
import {
  combineAccountStats,
  parseAccountStats,
  seedSiblingStats,
  upsertAccountStats,
} from './account-stats';

describe('account stats', () => {
  it('adds followers and typical views across TikTok and Instagram', () => {
    const combined = combineAccountStats({
      tiktok: { followerCount: 12000, avgViews: 8000, engagementRate: 0.04 },
      instagram: { followerCount: 8000, avgViews: 3000, engagementRate: 0.06 },
    });
    expect(combined.followerCount).toBe(20000);
    expect(combined.avgViews).toBe(11000);
    expect(combined.engagementRate).toBeCloseTo((0.04 * 8000 + 0.06 * 3000) / 11000);
  });

  it('keeps a single connected account as-is', () => {
    expect(
      combineAccountStats({
        instagram: { followerCount: 4100, avgViews: 900, engagementRate: 0.05 },
      }),
    ).toEqual({ followerCount: 4100, avgViews: 900, engagementRate: 0.05 });
  });

  it('merges a newly connected platform without dropping the other', () => {
    const next = upsertAccountStats(
      { tiktok: { followerCount: 1000, avgViews: 200, engagementRate: 0.03 } },
      'instagram',
      { followerCount: 500, avgViews: 80, engagementRate: 0.08 },
    );
    expect(next.tiktok?.followerCount).toBe(1000);
    expect(next.instagram?.followerCount).toBe(500);
  });

  it('parses stored jsonb and ignores junk', () => {
    expect(parseAccountStats(null)).toEqual({});
    expect(
      parseAccountStats({
        tiktok: { followerCount: '12', avgViews: 4, engagementRate: 0.1 },
        instagram: 'nope',
      }).tiktok,
    ).toEqual({ followerCount: 12, avgViews: 4, engagementRate: 0.1 });
  });

  it('keeps the other network’s totals when connecting a second account', () => {
    const next = seedSiblingStats(
      {},
      'instagram',
      true,
      { followerCount: 12000, avgViews: 8000, engagementRate: 0.04 },
      { followerCount: 5000, avgViews: 2000, engagementRate: 0.06 },
    );
    expect(next.tiktok?.followerCount).toBe(12000);
    expect(next.instagram).toBeUndefined();
  });

  it('does not copy totals onto the other network when they match the new sample', () => {
    expect(
      seedSiblingStats(
        {},
        'instagram',
        true,
        { followerCount: 5000, avgViews: 2000, engagementRate: 0.06 },
        { followerCount: 5000, avgViews: 2000, engagementRate: 0.06 },
      ),
    ).toEqual({});
  });
});
