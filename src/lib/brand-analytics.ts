export const BRAND_ANALYTICS_PATH = '/brand/analytics';
export const CAMPAIGN_QUERY = 'campaign';

/** Analytics URL, optionally opening a campaign in the side panel. */
export function brandAnalyticsPath(
  campaignId?: string | null,
  extras?: URLSearchParams | Record<string, string> | null,
) {
  const params =
    extras instanceof URLSearchParams
      ? new URLSearchParams(extras)
      : new URLSearchParams(extras ?? undefined);
  const id = campaignId?.trim();
  if (id) params.set(CAMPAIGN_QUERY, id);
  const query = params.toString();
  return query ? `${BRAND_ANALYTICS_PATH}?${query}` : BRAND_ANALYTICS_PATH;
}

export function campaignIdFromSearch(search: URLSearchParams | string) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get(CAMPAIGN_QUERY)?.trim() || null;
}

export function analyticsSearchWithoutCampaign(search: URLSearchParams) {
  const next = new URLSearchParams(search);
  next.delete(CAMPAIGN_QUERY);
  return next;
}
