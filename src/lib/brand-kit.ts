export const BRAND_SOCIALS = [
  { id: 'tiktok', label: 'TikTok', host: 'tiktok.com', placeholder: '@brand or URL' },
  { id: 'instagram', label: 'Instagram', host: 'instagram.com', placeholder: '@brand or URL' },
  { id: 'facebook', label: 'Facebook', host: 'facebook.com', placeholder: 'page URL or handle' },
  { id: 'x', label: 'X', host: 'x.com', placeholder: '@brand or URL' },
  { id: 'youtube', label: 'YouTube', host: 'youtube.com', placeholder: '@channel or URL' },
  { id: 'linkedin', label: 'LinkedIn', host: 'linkedin.com', placeholder: 'company URL or handle' },
] as const;

export type BrandSocialId = (typeof BRAND_SOCIALS)[number]['id'];
export type BrandSocials = Partial<Record<BrandSocialId, string>>;

export type BrandKit = {
  logo: string | null;
  logo_dark: string | null;
  primary: string;
  secondary: string;
  website: string;
  socials: BrandSocials;
  company: string;
  bio: string;
  city: string;
  country: string;
};

const HOST_ALIASES: Record<string, BrandSocialId> = {
  'tiktok.com': 'tiktok',
  'instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'x.com': 'x',
  'twitter.com': 'x',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'linkedin.com': 'linkedin',
};

export const emptyBrandKit = (): BrandKit => ({
  logo: null,
  logo_dark: null,
  primary: '',
  secondary: '',
  website: '',
  socials: {},
  company: '',
  bio: '',
  city: '',
  country: '',
});

const kitText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : '';

/** Hostname (+ path) for a brand site link. */
export function websiteLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${host}${path}`;
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
}

export function normalizeHex(value: string | null | undefined): string {
  const t = (value ?? '').trim();
  if (!t) return '';
  const raw = t.startsWith('#') ? t.slice(1) : t;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return '';
}

export const isValidHex = (value: string | null | undefined) => Boolean(normalizeHex(value));

export function normalizeWebsite(value: string | null | undefined): string {
  const t = (value ?? '').trim();
  if (!t) return '';
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.hostname.includes('.')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

const stripHandle = (value: string) =>
  value
    .trim()
    .replace(/^@/, '')
    .replace(/\/+$/, '');

export function socialUrl(id: BrandSocialId, value: string | null | undefined): string {
  const t = (value ?? '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) {
    try {
      return new URL(t).toString();
    } catch {
      return '';
    }
  }
  const handle = stripHandle(t);
  if (!handle) return '';
  switch (id) {
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`;
    case 'instagram':
      return `https://www.instagram.com/${handle}`;
    case 'facebook':
      return `https://www.facebook.com/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    case 'youtube':
      return handle.includes('/') ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/@${handle}`;
    case 'linkedin':
      return handle.includes('/') ? `https://www.linkedin.com/${handle}` : `https://www.linkedin.com/company/${handle}`;
  }
}

export function parseBrandSocials(value: unknown): BrandSocials {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const src = value as Record<string, unknown>;
  const out: BrandSocials = {};
  for (const { id } of BRAND_SOCIALS) {
    const raw = src[id];
    if (typeof raw === 'string' && raw.trim()) out[id] = raw.trim();
  }
  return out;
}

export function normalizeBrandSocials(socials: BrandSocials): BrandSocials {
  const out: BrandSocials = {};
  for (const { id } of BRAND_SOCIALS) {
    const url = socialUrl(id, socials[id]);
    if (url) out[id] = url;
  }
  return out;
}

export const hasAnySocial = (socials: BrandSocials) =>
  BRAND_SOCIALS.some(({ id }) => Boolean(socials[id]?.trim()));

export function socialsToUrls(socials: BrandSocials): string[] {
  return BRAND_SOCIALS.map(({ id }) => socials[id])
    .filter((url): url is string => Boolean(url && url.trim()));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function socialsFromUrls(urls: string[]): BrandSocials {
  const out: BrandSocials = {};
  for (const url of urls) {
    const host = hostOf(url);
    const id = HOST_ALIASES[host] ?? HOST_ALIASES[host.split('.').slice(-2).join('.')];
    if (id && !out[id]) out[id] = url;
  }
  return out;
}

const kitPath = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export function parseCampaignKit(value: unknown): BrandKit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyBrandKit();
  const src = value as Record<string, unknown>;
  const logo = kitPath(src.logo) || kitPath(src.avatar_url);
  const logoDark = kitPath(src.logo_dark);
  return {
    logo,
    logo_dark: logoDark,
    primary: normalizeHex(typeof src.primary === 'string' ? src.primary : ''),
    secondary: normalizeHex(typeof src.secondary === 'string' ? src.secondary : ''),
    website: typeof src.website === 'string' ? src.website : '',
    socials: parseBrandSocials(src.socials),
    company: kitText(src.company),
    bio: kitText(src.bio),
    city: kitText(src.city),
    country: kitText(src.country),
  };
}

export type BrandKitSource = {
  avatar_url?: string | null;
  logo_dark_url?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  website?: string | null;
  brand_socials?: unknown;
  company_name?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
};

export function kitFromProfile(profile: BrandKitSource | null | undefined): BrandKit {
  if (!profile) return emptyBrandKit();
  return {
    logo: profile.avatar_url || null,
    logo_dark: profile.logo_dark_url || null,
    primary: normalizeHex(profile.brand_primary_color),
    secondary: normalizeHex(profile.brand_secondary_color),
    website: normalizeWebsite(profile.website),
    socials: normalizeBrandSocials(parseBrandSocials(profile.brand_socials)),
    company: kitText(profile.company_name),
    bio: kitText(profile.bio),
    city: kitText(profile.city),
    country: kitText(profile.country),
  };
}

export function kitFromCampaign(campaign: {
  brand_kit?: unknown;
  brand_name?: string | null;
  links?: unknown;
  socials?: unknown;
}): BrandKit {
  const kit = parseCampaignKit(campaign.brand_kit);
  const links = Array.isArray(campaign.links)
    ? campaign.links.filter((v): v is string => typeof v === 'string')
    : [];
  const socials = Array.isArray(campaign.socials)
    ? campaign.socials.filter((v): v is string => typeof v === 'string')
    : [];
  return {
    ...kit,
    company: kit.company || kitText(campaign.brand_name),
    website: kit.website || links[0] || '',
    socials: hasAnySocial(kit.socials) ? kit.socials : socialsFromUrls(socials),
  };
}

export function toCampaignKit(kit: BrandKit): BrandKit {
  return {
    logo: kit.logo,
    logo_dark: kit.logo_dark,
    primary: kit.primary,
    secondary: kit.secondary,
    website: kit.website,
    socials: kit.socials,
    company: kit.company,
    bio: kit.bio,
    city: kit.city,
    country: kit.country,
  };
}

export const kitHasAssets = (kit: BrandKit) =>
  Boolean(
    kit.logo ||
      kit.logo_dark ||
      kit.primary ||
      kit.secondary ||
      kit.website ||
      kit.company ||
      kit.bio ||
      kit.city ||
      kit.country ||
      hasAnySocial(kit.socials),
  );

/** Storage path for the brand mark on a campaign card. Profile logos are not readable by creators. */
export function campaignLogoPath(campaign: { brand_kit?: unknown; brand_logo?: string | null }): string | null {
  if (campaign.brand_logo?.trim()) return campaign.brand_logo.trim();
  const kit = parseCampaignKit(campaign.brand_kit);
  return kit.logo || kit.logo_dark;
}
