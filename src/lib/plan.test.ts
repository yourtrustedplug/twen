import { describe, expect, it } from 'vitest';
import {
  BRAND_PLUS_MONTHLY_USD,
  CREATOR_PRO_MONTHLY_USD,
  formatUsd,
  isPro,
  nextPlanCharge,
  paidPlanName,
  planAmountForRole,
} from '@/lib/plan';

describe('plan', () => {
  it('treats plan=pro as Pro', () => {
    expect(isPro({ plan: 'pro' })).toBe(true);
    expect(isPro({ plan: 'free' })).toBe(false);
    expect(isPro(null)).toBe(false);
  });

  it('prices Creator Pro at $9 and Twen Plus at $49', () => {
    expect(CREATOR_PRO_MONTHLY_USD).toBe(9);
    expect(BRAND_PLUS_MONTHLY_USD).toBe(49);
    expect(planAmountForRole('creator')).toBe(9);
    expect(planAmountForRole('brand')).toBe(49);
    expect(formatUsd(CREATOR_PRO_MONTHLY_USD)).toBe('$9');
    expect(paidPlanName('creator')).toBe('Creator Pro');
    expect(paidPlanName('brand')).toBe('Twen Plus');
  });

  it('shows the next charge date and amount', () => {
    const now = new Date('2026-09-13T12:00:00.000Z');
    expect(nextPlanCharge({ isPro: false, amount: 9, now })).toEqual({
      amount: 0,
      date: null,
      pending: false,
    });
    expect(nextPlanCharge({ isPro: false, pending: true, amount: 9, now })).toEqual({
      amount: 9,
      date: null,
      pending: true,
    });
    expect(nextPlanCharge({
      isPro: true,
      amount: 9,
      renewsAt: '2026-08-13T00:00:00.000Z',
      now,
    }).date?.toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });
});
