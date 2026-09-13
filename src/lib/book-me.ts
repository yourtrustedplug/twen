/** Public “Book me” portfolio: short slug in a social bio, page at /@slug. */

export const BOOK_SLUG_MIN = 3;
export const BOOK_SLUG_MAX = 24;

export const BOOK_SLUG_RESERVED = new Set([
  'about',
  'admin',
  'api',
  'app',
  'auth',
  'blog',
  'book',
  'brand',
  'brands',
  'contact',
  'creator',
  'creators',
  'dashboard',
  'dev',
  'help',
  'licenses',
  'messages',
  'moderator',
  'pricing',
  'privacy',
  'reset-password',
  'signin',
  'signup',
  'support',
  'terms',
  'twen',
  'www',
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BookMeWork = {
  id: string;
  url: string;
  platform: string;
  verified_views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
};

export type BookMeProfile = {
  id: string;
  full_name: string | null;
  bio: string;
  avatar_url: string | null;
  city: string;
  country: string;
  location: string;
  rate_per_video: number;
  avg_views: number;
  engagement_rate: number;
  follower_count: number;
  platforms: string[];
  tiktok_handle: string | null;
  instagram_handle: string | null;
  book_slug: string;
  work: BookMeWork[];
};

export function normalizeBookSlug(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BOOK_SLUG_MAX);
}

export function bookSlugError(slug: string): string | null {
  if (!slug) return 'Pick a short name for your link.';
  if (slug.length < BOOK_SLUG_MIN) return `Use at least ${BOOK_SLUG_MIN} characters.`;
  if (!SLUG_RE.test(slug)) return 'Use letters, numbers, and hyphens.';
  if (BOOK_SLUG_RESERVED.has(slug)) return 'That name is reserved. Try another.';
  return null;
}

export function suggestBookSlug(input: {
  tiktokHandle?: string | null;
  instagramHandle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  id?: string | null;
}): string {
  const fromHandle = normalizeBookSlug(input.tiktokHandle || input.instagramHandle || '');
  const fromName = normalizeBookSlug([input.firstName, input.lastName].filter(Boolean).join(' '));
  const tail = (input.id ?? '').replace(/-/g, '').slice(-6);
  let slug = fromHandle || fromName || (tail ? `c-${tail}` : '');
  if (!slug) slug = 'creator';
  if (slug.length < BOOK_SLUG_MIN && tail) slug = `${slug}-${tail}`.slice(0, BOOK_SLUG_MAX);
  if (BOOK_SLUG_RESERVED.has(slug)) slug = tail ? `${slug}-${tail}`.slice(0, BOOK_SLUG_MAX) : `${slug}-me`;
  return slug;
}

export function bookMePath(slug: string): string {
  return `/@${normalizeBookSlug(slug)}`;
}

export function isBookMePath(pathname: string): boolean {
  return /^\/@[^/]+$/.test(pathname) || /^\/book\/[^/]+$/.test(pathname);
}

export function bookMeSlugFromPath(pathname: string): string | null {
  const at = pathname.match(/^\/@([^/]+)$/);
  if (at) return normalizeBookSlug(decodeURIComponent(at[1]));
  const book = pathname.match(/^\/book\/([^/]+)$/);
  if (book) return normalizeBookSlug(decodeURIComponent(book[1]));
  return null;
}

/** Pretty host for bios (no scheme). */
export function bookMeDisplay(slug: string): string {
  const clean = normalizeBookSlug(slug);
  return clean ? `twen.app/@${clean}` : 'twen.app/@your-name';
}

export function socialProfileHref(
  platform: 'tiktok' | 'instagram',
  handle: string | null | undefined,
): string | null {
  const name = (handle ?? '').trim().replace(/^@+/, '');
  if (!name) return null;
  if (platform === 'tiktok') return `https://www.tiktok.com/@${encodeURIComponent(name)}`;
  return `https://www.instagram.com/${encodeURIComponent(name)}`;
}

export function parseBookMeWork(data: unknown): BookMeWork[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : '';
    const url = typeof item.url === 'string' ? item.url : '';
    if (!id || !url) return [];
    return [{
      id,
      url,
      platform: typeof item.platform === 'string' ? item.platform : 'tiktok',
      verified_views: Number(item.verified_views) || 0,
      likes: Number(item.likes) || 0,
      comments: Number(item.comments) || 0,
      shares: Number(item.shares) || 0,
      engagement_rate: Number(item.engagement_rate) || 0,
    }];
  });
}

export function parseBookMeProfile(data: unknown): BookMeProfile | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const slug = normalizeBookSlug(typeof row.book_slug === 'string' ? row.book_slug : '');
  if (!id || !slug) return null;
  const platforms = Array.isArray(row.platforms)
    ? row.platforms.filter((v): v is string => typeof v === 'string')
    : [];
  return {
    id,
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    bio: typeof row.bio === 'string' ? row.bio : '',
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    city: typeof row.city === 'string' ? row.city : '',
    country: typeof row.country === 'string' ? row.country : '',
    location: typeof row.location === 'string' ? row.location : '',
    rate_per_video: Number(row.rate_per_video) || 0,
    avg_views: Number(row.avg_views) || 0,
    engagement_rate: Number(row.engagement_rate) || 0,
    follower_count: Number(row.follower_count) || 0,
    platforms,
    tiktok_handle: typeof row.tiktok_handle === 'string' ? row.tiktok_handle : null,
    instagram_handle: typeof row.instagram_handle === 'string' ? row.instagram_handle : null,
    book_slug: slug,
    work: parseBookMeWork(row.work),
  };
}
