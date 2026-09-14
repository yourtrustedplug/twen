/** Keep in sync with src/lib/account-stats.ts */

export type SocialPlatform = 'tiktok' | 'instagram'

export type PlatformReach = {
  followerCount: number
  avgViews: number
  engagementRate: number
}

export type AccountStats = {
  tiktok?: PlatformReach
  instagram?: PlatformReach
}

const emptyReach = (): PlatformReach => ({
  followerCount: 0,
  avgViews: 0,
  engagementRate: 0,
})

function clampRate(value: number): number {
  return Math.min(Math.max(Number(value) || 0, 0), 1)
}

export function otherPlatform(platform: SocialPlatform): SocialPlatform {
  return platform === 'tiktok' ? 'instagram' : 'tiktok'
}

export function parsePlatformReach(raw: unknown): PlatformReach | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const row = raw as Record<string, unknown>
  const followerCount = Math.max(0, Number(row.followerCount ?? row.follower_count) || 0)
  const avgViews = Math.max(0, Number(row.avgViews ?? row.avg_views) || 0)
  const engagementRate = clampRate(Number(row.engagementRate ?? row.engagement_rate) || 0)
  if (!followerCount && !avgViews && !engagementRate) return undefined
  return { followerCount, avgViews, engagementRate }
}

export function parseAccountStats(raw: unknown): AccountStats {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const row = value as Record<string, unknown>
  const stats: AccountStats = {}
  const tiktok = parsePlatformReach(row.tiktok)
  const instagram = parsePlatformReach(row.instagram)
  if (tiktok) stats.tiktok = tiktok
  if (instagram) stats.instagram = instagram
  return stats
}

export function upsertAccountStats(
  existing: AccountStats,
  platform: SocialPlatform,
  reach: PlatformReach,
): AccountStats {
  return {
    ...existing,
    [platform]: {
      followerCount: Math.max(0, Number(reach.followerCount) || 0),
      avgViews: Math.max(0, Number(reach.avgViews) || 0),
      engagementRate: clampRate(reach.engagementRate),
    },
  }
}

export function seedSiblingStats(
  existing: AccountStats,
  connecting: SocialPlatform,
  otherConnected: boolean,
  currentTotals: PlatformReach,
  sampled: PlatformReach,
): AccountStats {
  const other = otherPlatform(connecting)
  if (!otherConnected || existing[other] || existing[connecting]) return existing
  if (!currentTotals.followerCount && !currentTotals.avgViews) return existing
  const same =
    currentTotals.followerCount === sampled.followerCount && currentTotals.avgViews === sampled.avgViews
  if (same) return existing
  return upsertAccountStats(existing, other, currentTotals)
}

export function accountStatList(stats: AccountStats): Array<{ platform: SocialPlatform; reach: PlatformReach }> {
  const rows: Array<{ platform: SocialPlatform; reach: PlatformReach }> = []
  if (stats.tiktok) rows.push({ platform: 'tiktok', reach: stats.tiktok })
  if (stats.instagram) rows.push({ platform: 'instagram', reach: stats.instagram })
  return rows
}

export function connectedAccountRows(input: {
  stats: AccountStats
  tiktok?: boolean
  instagram?: boolean
}): Array<{ platform: SocialPlatform; reach: PlatformReach | null }> {
  const rows: Array<{ platform: SocialPlatform; reach: PlatformReach | null }> = []
  if (input.tiktok) rows.push({ platform: 'tiktok', reach: input.stats.tiktok ?? null })
  if (input.instagram) rows.push({ platform: 'instagram', reach: input.stats.instagram ?? null })
  return rows
}

export function combineAccountStats(stats: AccountStats): PlatformReach {
  const parts = accountStatList(stats).map((row) => row.reach)
  if (parts.length === 0) return emptyReach()

  const followerCount = parts.reduce((sum, part) => sum + part.followerCount, 0)
  const avgViews = parts.reduce((sum, part) => sum + part.avgViews, 0)

  let weight = 0
  let engAcc = 0
  for (const part of parts) {
    const w = part.avgViews > 0 ? part.avgViews : part.followerCount
    if (w <= 0) continue
    weight += w
    engAcc += part.engagementRate * w
  }

  return {
    followerCount,
    avgViews,
    engagementRate: weight > 0 ? clampRate(engAcc / weight) : 0,
  }
}
