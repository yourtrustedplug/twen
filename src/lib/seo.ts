/** Site-wide SEO constants and per-route meta for Twen. */

/** Must match the live canonical host (Vercel 308s apex → www). */
export const SITE_URL = 'https://www.twen.app';
export const SITE_NAME = 'Twen';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;
export const DEFAULT_TITLE = "Twen — Africa's content distribution network";
export const DEFAULT_DESCRIPTION =
  'Twen is the largest content distribution network in Africa. Brands fund campaigns. Creators get paid per verified view, straight to mobile money.';

export type SeoImage = {
  url: string;
  title: string;
  caption?: string;
};

export type PageSeo = {
  title: string;
  description: string;
  /** Path only, e.g. /creators — used for canonical */
  path: string;
  /** index,follow by default; set noindex for private/auth surfaces */
  robots?: string;
  ogType?: 'website' | 'article';
  image?: string;
  /** Images associated with this URL (image sitemap + JSON-LD). */
  images?: SeoImage[];
  /** Breadcrumb trail after Home (Home is always prepended). */
  breadcrumbs?: { name: string; path: string }[];
};

const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX = 'noindex, nofollow';

const img = (file: string, title: string, caption?: string): SeoImage => ({
  url: `${SITE_URL}/seo/${file}`,
  title,
  caption,
});

/** Exact public marketing / legal routes. */
export const PAGE_SEO: Record<string, PageSeo> = {
  '/': {
    path: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    robots: INDEX,
    image: DEFAULT_OG_IMAGE,
    images: [
      img('gate-creator.jpg', 'Twen for creators', 'Creators earn per verified view on Twen'),
      img('gate-brand.jpg', 'Twen for brands', 'Brands fund campaigns and buy verified reach on Twen'),
    ],
    breadcrumbs: [{ name: 'Home', path: '/' }],
  },
  '/creators': {
    path: '/creators',
    title: 'Earn per view on Instagram & TikTok | Twen for Creators',
    description:
      'Post Reels and TikToks for funded brand campaigns. Get paid for verified views and withdraw to EcoCash, MoMo, Airtel Money, or M-Pesa.',
    robots: INDEX,
    image: `${SITE_URL}/seo/hero-creators.jpg`,
    images: [
      img('hero-creators.jpg', 'Creator earning on Twen', 'African creator posting short-form video for a funded campaign'),
      img('creators-film.jpg', 'Creator filming for Twen', 'Creator filming a short video on a phone for Twen'),
      img('how-it-works.jpg', 'How Twen works for creators', 'Post, get verified views, withdraw to mobile money'),
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Creators', path: '/creators' },
    ],
  },
  '/brands': {
    path: '/brands',
    title: 'Flood social with real creators | Twen for Brands',
    description:
      'Fund a campaign, brief creators across Africa, and pay only for verified Instagram and TikTok views. Escrow-backed distribution at scale.',
    robots: INDEX,
    image: `${SITE_URL}/seo/hero-brands.jpg`,
    images: [
      img('hero-brands.jpg', 'Brand campaign on Twen', 'Creator video distributed for a funded brand campaign'),
      img('brands-campaign.jpg', 'Twen brand distribution', 'Real people distributing brand content on Instagram and TikTok'),
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Brands', path: '/brands' },
    ],
  },
  '/about': {
    path: '/about',
    title: 'About Twen — Built for African creators and brands',
    description:
      'Twen connects brands that need reach with creators who already have audiences on Instagram and TikTok. Paid per verified view, not vanity metrics.',
    robots: INDEX,
    image: `${SITE_URL}/seo/about.jpg`,
    images: [
      img('about.jpg', 'About Twen', 'Twen team and community across East Africa'),
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ],
  },
  '/pricing': {
    path: '/pricing',
    title: 'Pricing | Twen creator & brand plans',
    description:
      'Simple Twen pricing for creators and brands. Start free, upgrade when you need Pro tools, instant payouts, and higher campaign limits.',
    robots: INDEX,
    image: `${SITE_URL}/seo/pricing.jpg`,
    images: [img('pricing.jpg', 'Twen pricing', 'Creator and brand plans on Twen')],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Pricing', path: '/pricing' },
    ],
  },
  '/contact': {
    path: '/contact',
    title: 'Contact Twen',
    description:
      'Talk to the Twen team about campaigns, payouts, partnerships, or support. Reach us at hello@twen.app.',
    robots: INDEX,
    image: `${SITE_URL}/seo/contact.jpg`,
    images: [img('contact.jpg', 'Contact Twen', 'Get in touch with the Twen team')],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact' },
    ],
  },
  '/terms': {
    path: '/terms',
    title: 'Terms of Service | Twen',
    description: 'Terms of service for using Twen — campaigns, payouts, and platform rules.',
    robots: INDEX,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Terms', path: '/terms' },
    ],
  },
  '/privacy': {
    path: '/privacy',
    title: 'Privacy Policy | Twen',
    description: 'How Twen collects, uses, and protects your data.',
    robots: INDEX,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Privacy', path: '/privacy' },
    ],
  },
  '/licenses': {
    path: '/licenses',
    title: 'Licenses | Twen',
    description: 'Third-party licenses and attributions used by Twen.',
    robots: INDEX,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Licenses', path: '/licenses' },
    ],
  },
  '/signin': {
    path: '/signin',
    title: 'Sign in | Twen',
    description: 'Sign in to your Twen creator or brand account.',
    robots: NOINDEX,
  },
  '/signup': {
    path: '/signup',
    title: 'Sign up | Twen',
    description: 'Create your Twen account.',
    robots: NOINDEX,
  },
  '/reset-password': {
    path: '/reset-password',
    title: 'Reset password | Twen',
    description: 'Reset your Twen account password.',
    robots: NOINDEX,
  },
};

const PRIVATE_PREFIXES = [
  '/dashboard',
  '/brand',
  '/creator',
  '/admin',
  '/moderator',
  '/messages',
  '/auth',
];

export function resolvePageSeo(pathname: string): PageSeo {
  const exact = PAGE_SEO[pathname];
  if (exact) return exact;

  if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return {
      path: pathname,
      title: `${SITE_NAME} App`,
      description: DEFAULT_DESCRIPTION,
      robots: NOINDEX,
    };
  }

  return {
    path: pathname,
    title: `Page not found | ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    robots: NOINDEX,
  };
}

export function absoluteUrl(path: string): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    email: 'hello@twen.app',
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    inLanguage: 'en',
  };
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

export function breadcrumbJsonLd(page: PageSeo) {
  const crumbs = page.breadcrumbs?.length
    ? page.breadcrumbs
    : [{ name: SITE_NAME, path: page.path }];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function webPageJsonLd(page: PageSeo) {
  const url = absoluteUrl(page.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    primaryImageOfPage: page.image
      ? { '@type': 'ImageObject', url: page.image }
      : undefined,
    inLanguage: 'en',
  };
}
