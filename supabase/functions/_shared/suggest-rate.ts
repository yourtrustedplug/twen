/** Keep in sync with src/lib/suggest-rate.ts */
export function suggestRatePerVideo({
  followerCount,
  avgViews,
  engagementRate,
}: {
  followerCount: number
  avgViews: number
  engagementRate: number
}): number {
  const followers = Math.max(0, Number(followerCount) || 0)
  const views = Math.max(0, Number(avgViews) || 0)
  const eng = Math.min(Math.max(Number(engagementRate) || 0, 0), 1)

  if (!followers && !views) return 0

  const estimatedViews = views > 0 ? views : Math.round(followers * 0.08)
  const cpm = 6 + Math.min(eng / 0.03, 2) * 4
  const fromReach = (estimatedViews / 1000) * cpm

  let floor = 25
  if (followers >= 1_000_000) floor = 2500
  else if (followers >= 250_000) floor = 800
  else if (followers >= 50_000) floor = 250
  else if (followers >= 10_000) floor = 80
  else if (followers >= 1_000) floor = 40

  return Math.max(10, Math.round(Math.max(fromReach, floor) / 10) * 10)
}
