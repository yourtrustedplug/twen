import { afterEach, describe, expect, it } from 'vitest';
import { audienceCopy, defaultPricingAudience, rememberAudience } from '@/lib/audience';

describe('audience', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults pricing to creators, then to the last marketing audience', () => {
    expect(defaultPricingAudience()).toBe('creator');
    rememberAudience('brand');
    expect(defaultPricingAudience()).toBe('brand');
  });

  it('promises unused escrow after the campaign ends, not CPC', () => {
    const brand = JSON.stringify(audienceCopy.brand);
    expect(brand).toMatch(/Unused escrow is returned/);
    expect(brand).not.toMatch(/comes back/);
    expect(brand).not.toMatch(/click or per sale/i);
    expect(brand).not.toMatch(/largest/);
  });
});
