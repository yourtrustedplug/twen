import { describe, expect, it } from 'vitest';
import { isCampaignSort, sortCampaigns } from './creator-home';

const campaign = (
  id: string,
  extras: Partial<{
    created_at: string;
    deadline: string | null;
    rate_per_1k: number;
    funded_amount: number;
    spent_amount: number;
  }>,
) => ({
  id,
  created_at: '2026-01-01T00:00:00Z',
  deadline: '2026-10-01',
  rate_per_1k: 1,
  funded_amount: 100,
  spent_amount: 0,
  ...extras,
});

describe('campaign sort', () => {
  it('recognizes sort ids', () => {
    expect(isCampaignSort('payout')).toBe(true);
    expect(isCampaignSort('rate')).toBe(false);
  });

  it('puts the highest rate first', () => {
    const rows = [campaign('a', { rate_per_1k: 0.5 }), campaign('b', { rate_per_1k: 2 })];
    expect(sortCampaigns(rows, 'payout').map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('puts the soonest deadline first', () => {
    const rows = [
      campaign('later', { deadline: '2026-12-01' }),
      campaign('sooner', { deadline: '2026-09-20' }),
    ];
    expect(sortCampaigns(rows, 'fast').map((row) => row.id)).toEqual(['sooner', 'later']);
  });

  it('puts the biggest leftover budget first', () => {
    const rows = [
      campaign('small', { funded_amount: 50, spent_amount: 40 }),
      campaign('big', { funded_amount: 200, spent_amount: 10 }),
    ];
    expect(sortCampaigns(rows, 'budget').map((row) => row.id)).toEqual(['big', 'small']);
  });
});
