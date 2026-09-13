/** TikTok / Instagram link parsing for submit + view verification. */

export type SocialPlatform = 'tiktok' | 'instagram'

const TIKTOK_HOSTS = new Set(['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'])

export function coerceHttpUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (
    /^(www\.)?(tiktok\.com|m\.tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com|instagr\.am)\b/i.test(
      trimmed,
    )
  ) {
    return `https://${trimmed}`
  }
  return trimmed
}

export function extractTikTokVideoId(url: string): string | null {
  const raw = coerceHttpUrl(url)
  const m =
    raw.match(/\/(?:video|photo)\/(\d+)/) ??
    raw.match(/[?&](?:item_id|aweme_id)=(\d+)/) ??
    raw.match(/tiktok\.com\/v\/(\d+)/i)
  return m?.[1] ?? null
}

export function extractTikTokHandle(url: string): string | null {
  const m = coerceHttpUrl(url).match(/tiktok\.com\/@([^/?#]+)/i)
  if (!m?.[1]) return null
  return `@${decodeURIComponent(m[1]).replace(/^@/, '').toLowerCase()}`
}

export function extractInstagramShortcode(url: string): string | null {
  const raw = coerceHttpUrl(url)
  const m =
    raw.match(/instagram\.com\/(?:share\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i) ??
    raw.match(/instagr\.am\/(?:p|reel)\/([A-Za-z0-9_-]+)/i)
  return m?.[1] ?? null
}

export function detectPlatform(
  platform: string | null | undefined,
  url: string,
): SocialPlatform | 'unknown' {
  const p = (platform ?? '').toLowerCase().trim()
  if (p === 'tiktok' || p === 'instagram') return p
  if (/tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(url)) return 'tiktok'
  if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram'
  return 'unknown'
}

const isTikTokSharePath = (pathname: string) => /^\/t\/[A-Za-z0-9_-]+/i.test(pathname)

/** Host + path shape for the chosen platform (blocks random sites). Share links are allowed. */
export function isValidPlatformUrl(platform: SocialPlatform, url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(coerceHttpUrl(url))
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

  if (platform === 'tiktok') {
    if (!TIKTOK_HOSTS.has(host)) return false
    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return parsed.pathname.length > 1
    if (isTikTokSharePath(parsed.pathname)) return true
    return Boolean(extractTikTokVideoId(parsed.toString()))
  }

  if (host !== 'instagram.com' && host !== 'instagr.am') return false
  return Boolean(extractInstagramShortcode(parsed.toString()))
}

export function normalizeHandle(handle: string | null | undefined): string {
  return (handle ?? '').trim().replace(/^@/, '').toLowerCase()
}

export async function resolveRedirectUrl(url: string, maxHops = 5): Promise<string> {
  let current = coerceHttpUrl(url)
  for (let i = 0; i < maxHops; i++) {
    const host = (() => {
      try {
        return new URL(current).hostname.replace(/^www\./, '').toLowerCase()
      } catch {
        return ''
      }
    })()
    if (!TIKTOK_HOSTS.has(host)) return current
    if (extractTikTokVideoId(current)) return current

    try {
      const res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TwenBot/1.0)' },
      })
      const loc = res.headers.get('location')
      if (
        !loc ||
        (res.status !== 301 &&
          res.status !== 302 &&
          res.status !== 303 &&
          res.status !== 307 &&
          res.status !== 308)
      ) {
        return current
      }
      current = new URL(loc, current).toString()
    } catch {
      return current
    }
  }
  return current
}
