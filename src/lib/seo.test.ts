import { describe, expect, it } from 'vitest';
import { absoluteUrl, breadcrumbJsonLd, resolvePageSeo } from '@/lib/seo';

describe('resolvePageSeo', () => {
  it('returns marketing meta + images for public routes', () => {
    const page = resolvePageSeo('/creators');
    expect(page.title).toMatch(/Creators/i);
    expect(page.robots).toMatch(/index/);
    expect(page.image).toContain('/seo/hero-creators.jpg');
    expect(page.images?.length).toBeGreaterThan(0);
    expect(absoluteUrl(page.path)).toBe('https://www.twen.app/creators');
  });

  it('builds breadcrumbs for subpages', () => {
    const page = resolvePageSeo('/pricing');
    const crumbs = breadcrumbJsonLd(page);
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[1]).toMatchObject({
      name: 'Pricing',
      item: 'https://www.twen.app/pricing',
    });
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
