import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
  organizationJsonLd,
  resolvePageSeo,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Keeps document title, description, canonical, OG/Twitter, and robots
 * in sync with the current route. Private app routes stay noindex.
 */
export function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = resolvePageSeo(pathname);
    const url = absoluteUrl(page.path);
    const image = page.image ?? DEFAULT_OG_IMAGE;
    const robots =
      page.robots ??
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    document.title = page.title;

    upsertMeta('name', 'description', page.description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'googlebot', robots);
    upsertMeta('name', 'author', SITE_NAME);
    upsertMeta('name', 'theme-color', '#0A101D');

    upsertMeta('property', 'og:type', page.ogType ?? 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('property', 'og:title', page.title);
    upsertMeta('property', 'og:description', page.description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', page.title);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', page.title);
    upsertMeta('name', 'twitter:description', page.description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', page.title);

    upsertLink('canonical', url);

    upsertJsonLd('ld-organization', organizationJsonLd());
    upsertJsonLd('ld-website', websiteJsonLd());
    upsertJsonLd('ld-software', softwareApplicationJsonLd());
  }, [pathname]);

  return null;
}
