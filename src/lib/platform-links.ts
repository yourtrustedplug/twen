/** Client-side TikTok / Instagram URL shape checks (server re-verifies via APIs). */

export type SocialPlatform = 'tiktok' | 'instagram';

export function extractTikTokVideoId(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/) ?? url.match(/[?&]item_id=(\d+)/);
  return m?.[1] ?? null;
}

export function extractInstagramShortcode(url: string): string | null {
  const m =
    url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i) ??
    url.match(/instagr\.am\/(?:p|reel)\/([A-Za-z0-9_-]+)/i);
  return m?.[1] ?? null;
}

export function isValidPlatformUrl(platform: SocialPlatform, url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (platform === 'tiktok') {
    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return parsed.pathname.length > 1;
    if (host !== 'tiktok.com') return false;
    return Boolean(extractTikTokVideoId(url) || /\/@[^/]+\/video\/\d+/i.test(url));
  }

  if (host !== 'instagram.com' && host !== 'instagr.am') return false;
  return Boolean(extractInstagramShortcode(url));
}

export function platformUrlHint(platform: SocialPlatform): string {
  if (platform === 'instagram') {
    return 'https://www.instagram.com/reel/...';
  }
  return 'https://www.tiktok.com/@you/video/...';
}
