import { describe, expect, it } from 'vitest';
import { absoluteUrl, resolvePageSeo } from '@/lib/seo';

describe('resolvePageSeo', () => {
  it('returns marketing meta for public routes', () => {
    const page = resolvePageSeo('/creators');
    expect(page.title).toMatch(/Creators/i);
    expect(page.robots).toMatch(/index/);
    expect(absoluteUrl(page.path)).toBe('https://twen.app/creators');
  });

  it('noindexes authenticated app routes', () => {
    expect(resolvePageSeo('/brand/campaigns/new').robots).toMatch(/noindex/);
    expect(resolvePageSeo('/creator/earnings').robots).toMatch(/noindex/);
    expect(resolvePageSeo('/auth/callback').robots).toMatch(/noindex/);
  });

  it('noindexes unknown routes', () => {
    expect(resolvePageSeo('/does-not-exist').robots).toMatch(/noindex/);
  });
});
