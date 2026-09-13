import { describe, expect, it } from 'vitest';
import {
  analyticsSearchWithoutCampaign,
  brandAnalyticsPath,
  campaignIdFromSearch,
} from './brand-analytics';

describe('brand analytics paths', () => {
  it('opens analytics with a campaign query', () => {
    expect(brandAnalyticsPath('abc')).toBe('/brand/analytics?campaign=abc');
  });

  it('keeps extra params when opening a campaign', () => {
    expect(brandAnalyticsPath('abc', { funded: 'pending' })).toBe(
      '/brand/analytics?funded=pending&campaign=abc',
    );
  });

  it('reads and clears the selected campaign', () => {
    const search = new URLSearchParams('campaign=abc&funded=pending');
    expect(campaignIdFromSearch(search)).toBe('abc');
    expect(analyticsSearchWithoutCampaign(search).toString()).toBe('funded=pending');
  });
});
