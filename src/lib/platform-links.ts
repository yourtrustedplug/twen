/** Client-side TikTok / Instagram URL shape checks (server re-verifies via APIs). */

export type SocialPlatform = 'tiktok' | 'instagram';

const TIKTOK_HOSTS = new Set(['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);

/** Add https:// when someone pastes tiktok.com/… without a scheme. */
export function coerceHttpUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (
    /^(www\.)?(tiktok\.com|m\.tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com|instagr\.am)\b/i.test(
      trimmed,
    )
  ) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function extractTikTokVideoId(url: string): string | null {
  const raw = coerceHttpUrl(url);
  const m =
    raw.match(/\/(?:video|photo)\/(\d+)/) ??
    raw.match(/[?&](?:item_id|aweme_id)=(\d+)/) ??
    raw.match(/tiktok\.com\/v\/(\d+)/i);
  return m?.[1] ?? null;
}

export function extractInstagramShortcode(url: string): string | null {
  const raw = coerceHttpUrl(url);
  const m =
    raw.match(/instagram\.com\/(?:share\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i) ??
    raw.match(/instagr\.am\/(?:p|reel)\/([A-Za-z0-9_-]+)/i);
  return m?.[1] ?? null;
}

const isTikTokSharePath = (pathname: string) => /^\/t\/[A-Za-z0-9_-]+/i.test(pathname);

/** Infer TikTok vs Instagram from a pasted URL, even if it isn't valid yet. */
export function detectPlatformFromUrl(url: string): SocialPlatform | 'unknown' {
  const raw = coerceHttpUrl(url);
  if (!raw) return 'unknown';

  let host = '';
  try {
    host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    const lower = raw.toLowerCase();
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
    return 'unknown';
  }

  if (TIKTOK_HOSTS.has(host)) return 'tiktok';
  if (host === 'instagram.com' || host === 'instagr.am') return 'instagram';
  return 'unknown';
}

export function isValidPlatformUrl(platform: SocialPlatform, url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(coerceHttpUrl(url));
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (platform === 'tiktok') {
    if (!TIKTOK_HOSTS.has(host)) return false;
    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return parsed.pathname.length > 1;
    if (isTikTokSharePath(parsed.pathname)) return true;
    return Boolean(extractTikTokVideoId(parsed.toString()));
  }

  if (host !== 'instagram.com' && host !== 'instagr.am') return false;
  return Boolean(extractInstagramShortcode(parsed.toString()));
}

export function platformUrlHint(platform: SocialPlatform): string {
  if (platform === 'instagram') {
    return 'https://www.instagram.com/reel/...';
  }
  return 'https://www.tiktok.com/@you/video/...';
}
