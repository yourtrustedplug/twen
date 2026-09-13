import { describe, expect, it } from 'vitest';
import { absoluteUrl, breadcrumbJsonLd, ogImageType, resolvePageSeo } from '@/lib/seo';

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

  it('noindexes numbered error pages with status titles', () => {
    expect(resolvePageSeo('/401')).toMatchObject({
      title: '401 · Sign in | Twen',
      robots: expect.stringMatching(/noindex/),
    });
    expect(resolvePageSeo('/503').breadcrumbs?.map((c) => c.name)).toEqual(['Home', '503']);
    expect(resolvePageSeo('/404').title).toMatch(/Page not found/);
    expect(resolvePageSeo('/405').title).toMatch(/Page not found/);
    expect(resolvePageSeo('/dev/errors').title).toMatch(/^DEV /);
    expect(resolvePageSeo('/dev/errors').robots).toMatch(/noindex/);
  });

  it('indexes Book me portfolio pages', () => {
    const page = resolvePageSeo('/@amina');
    expect(page.robots).toMatch(/index/);
    expect(page.title).toMatch(/Book me/i);
  });

  it('gives legal pages a description, share image, and breadcrumbs', () => {
    const page = resolvePageSeo('/privacy');
    expect(page.description.length).toBeGreaterThan(80);
    expect(page.image).toContain('/og.png');
    expect(page.breadcrumbs?.map((c) => c.name)).toEqual(['Home', 'Privacy']);
    expect(ogImageType(page.image ?? '')).toBe('image/png');
  });
});
