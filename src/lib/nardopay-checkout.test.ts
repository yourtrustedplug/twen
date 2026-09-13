import { describe, expect, it } from 'vitest';
import {
  amountsMatch,
  cachedPlanCheckoutUrl,
  campaignCheckoutUrlIfReusable,
  knownPlanCheckoutUrl,
  planCheckoutCacheKey,
  readPlanCheckoutCache,
  writePlanCheckoutCache,
} from '@/lib/nardopay-checkout';

describe('nardopay-checkout', () => {
  it('reuses a cached Creator Pro link when amount and role still match', () => {
    const storage = new Map<string, string>();
    const mem = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    writePlanCheckoutCache(mem, 'user-1', {
      url: 'https://pay.nardopay.com/creator-pro',
      amount: 9,
      role: 'creator',
    });
    const cached = readPlanCheckoutCache(mem, 'user-1');
    expect(planCheckoutCacheKey('user-1')).toBe('twen.planCheckout.user-1');
    expect(cachedPlanCheckoutUrl(cached, 'creator', 9)).toBe('https://pay.nardopay.com/creator-pro');
  });

  it('reuses a cached Twen Plus link when amount and role still match', () => {
    expect(
      cachedPlanCheckoutUrl(
        { url: 'https://pay.nardopay.com/twen-plus', amount: 49, role: 'brand' },
        'brand',
        49,
      ),
    ).toBe('https://pay.nardopay.com/twen-plus');
  });

  it('drops the cache when the plan price changes', () => {
    expect(
      cachedPlanCheckoutUrl(
        { url: 'https://pay.nardopay.com/old', amount: 49, role: 'creator' },
        'creator',
        9,
      ),
    ).toBeNull();
  });

  it('opens a stored profile link immediately without minting a new one', () => {
    const storage = new Map<string, string>();
    const mem = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    expect(
      knownPlanCheckoutUrl('user-1', 'creator', {
        nardopay_checkout_url: 'https://pay.nardopay.com/ready',
        nardopay_checkout_amount: 9,
      }, mem),
    ).toBe('https://pay.nardopay.com/ready');
  });

  it('reuses a campaign funding link only when the budget still matches', () => {
    expect(
      campaignCheckoutUrlIfReusable({
        nardopay_checkout_url: 'https://pay.nardopay.com/campaign',
        nardopay_checkout_amount: 500,
        budget: 500,
      }),
    ).toBe('https://pay.nardopay.com/campaign');
    expect(
      campaignCheckoutUrlIfReusable({
        nardopay_checkout_url: 'https://pay.nardopay.com/campaign',
        nardopay_checkout_amount: 500,
        budget: 750,
      }),
    ).toBeNull();
    expect(amountsMatch(9, 9.001)).toBe(true);
  });
});
