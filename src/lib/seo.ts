/** Site-wide SEO constants and per-route meta for Twen (https://twen.app). */

export const SITE_URL = 'https://twen.app';
export const SITE_NAME = 'Twen';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;
export const DEFAULT_TITLE = "Twen — Africa's content distribution network";
export const DEFAULT_DESCRIPTION =
  'Twen is the largest content distribution network in Africa. Brands fund campaigns. Creators get paid per verified view, straight to mobile money.';

export type PageSeo = {
  title: string;
  description: string;
  /** Path only, e.g. /creators — used for canonical */
  path: string;
  /** index,follow by default; set noindex for private/auth surfaces */
  robots?: string;
  ogType?: 'website' | 'article';
  image?: string;
};

const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX = 'noindex, nofollow';

/** Exact public marketing / legal routes. */
export const PAGE_SEO: Record<string, PageSeo> = {
  '/': {
    path: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    robots: INDEX,
  },
  '/creators': {
    path: '/creators',
    title: 'Earn per view on Instagram & TikTok | Twen for Creators',
    description:
      'Post Reels and TikToks for funded brand campaigns. Get paid for verified views and withdraw to EcoCash, MoMo, Airtel Money, or M-Pesa.',
    robots: INDEX,
  },
  '/brands': {
    path: '/brands',
    title: 'Flood social with real creators | Twen for Brands',
    description:
      'Fund a campaign, brief creators across Africa, and pay only for verified Instagram and TikTok views. Escrow-backed distribution at scale.',
    robots: INDEX,
  },
  '/about': {
    path: '/about',
    title: 'About Twen — Built for African creators and brands',
    description:
      'Twen connects brands that need reach with creators who already have audiences on Instagram and TikTok. Paid per verified view, not vanity metrics.',
    robots: INDEX,
  },
  '/pricing': {
    path: '/pricing',
    title: 'Pricing | Twen creator & brand plans',
    description:
      'Simple Twen pricing for creators and brands. Start free, upgrade when you need Pro tools, instant payouts, and higher campaign limits.',
    robots: INDEX,
  },
  '/contact': {
    path: '/contact',
    title: 'Contact Twen',
    description:
      'Talk to the Twen team about campaigns, payouts, partnerships, or support. Reach us at hello@twen.app.',
    robots: INDEX,
  },
  '/terms': {
    path: '/terms',
    title: 'Terms of Service | Twen',
    description: 'Terms of service for using Twen — campaigns, payouts, and platform rules.',
    robots: INDEX,
  },
  '/privacy': {
    path: '/privacy',
    title: 'Privacy Policy | Twen',
    description: 'How Twen collects, uses, and protects your data.',
    robots: INDEX,
  },
  '/licenses': {
    path: '/licenses',
    title: 'Licenses | Twen',
    description: 'Third-party licenses and attributions used by Twen.',
    robots: INDEX,
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
