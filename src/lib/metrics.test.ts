import { describe, expect, it } from 'vitest';
import {
  campaignBudgetError,
  campaignRateError,
  MIN_CAMPAIGN_BUDGET,
  MIN_RATE_PER_1K,
  SUGGESTED_RATE_PER_1K,
} from './metrics';

describe('campaignRateError', () => {
  it('requires a rate of at least $1 per 1,000 views', () => {
    expect(MIN_RATE_PER_1K).toBe(1);
    expect(SUGGESTED_RATE_PER_1K).toBeGreaterThan(MIN_RATE_PER_1K);
    expect(campaignRateError(0)).toBe('Set a rate per 1,000 views.');
    expect(campaignRateError(0.75)).toBe('Rate must be at least $1.00 per 1,000 views.');
    expect(campaignRateError(MIN_RATE_PER_1K)).toBeNull();
    expect(campaignRateError(SUGGESTED_RATE_PER_1K)).toBeNull();
  });
});

describe('campaignBudgetError', () => {
  it('rejects empty and too-small funds without naming the floor', () => {
    expect(campaignBudgetError(0)).toBe('Set a budget above zero.');
    expect(campaignBudgetError(MIN_CAMPAIGN_BUDGET - 1)).toBe('Set a higher budget.');
    expect(campaignBudgetError(MIN_CAMPAIGN_BUDGET - 1)).not.toMatch(/10/);
    expect(campaignBudgetError(MIN_CAMPAIGN_BUDGET)).toBeNull();
  });
});
