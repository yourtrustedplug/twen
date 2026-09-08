/** Benchmarks used to tell a brand whether a submission over- or under-performed. */
export const BENCHMARKS = {
  /** Typical Meta/Facebook ads cost per 1,000 impressions in the region (USD). */
  facebookCpm: 7.19,
  /** Typical TikTok ads CPM (USD). */
  tiktokAdsCpm: 4.0,
  /** Typical organic engagement rate for short-form video. */
  normalEngagement: 0.055,
};

export const cpm = (spend: number | string, views: number | string) => {
  const s = Number(spend);
  const v = Number(views);
  if (!v || !Number.isFinite(v) || !Number.isFinite(s)) return 0;
  return (s / v) * 1000;
};

export const engagement = (s: {
  likes: number | string;
  comments: number | string;
  shares: number | string;
  verified_views: number | string;
}) => {
  const views = Number(s.verified_views);
  if (!views) return 0;
  return (Number(s.likes) + Number(s.comments) + Number(s.shares)) / views;
};

export const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export type Verdict = { label: string; tone: 'good' | 'bad' | 'neutral'; detail: string };

/** Compares a submission's effective CPM against paid-ads benchmarks. */
export const cpmVerdict = (effectiveCpm: number): Verdict => {
  if (!effectiveCpm) return { label: 'No data yet', tone: 'neutral', detail: 'Waiting on verified views' };
  const diff = (BENCHMARKS.facebookCpm - effectiveCpm) / BENCHMARKS.facebookCpm;
  if (diff > 0)
    return {
      label: `${Math.round(diff * 100)}% cheaper than Facebook ads`,
      tone: 'good',
      detail: `$${effectiveCpm.toFixed(2)} vs $${BENCHMARKS.facebookCpm.toFixed(2)} CPM`,
    };
  return {
    label: `${Math.round(Math.abs(diff) * 100)}% pricier than Facebook ads`,
    tone: 'bad',
    detail: `$${effectiveCpm.toFixed(2)} vs $${BENCHMARKS.facebookCpm.toFixed(2)} CPM`,
  };
};

/** Compares engagement against a normal organic rate. */
export const engagementVerdict = (rate: number): Verdict => {
  if (!rate) return { label: 'No data yet', tone: 'neutral', detail: 'Metrics refresh on schedule' };
  const diff = (rate - BENCHMARKS.normalEngagement) / BENCHMARKS.normalEngagement;
  if (diff >= 0)
    return {
      label: `${Math.round(diff * 100)}% above normal engagement`,
      tone: 'good',
      detail: `${formatPercent(rate)} vs ${formatPercent(BENCHMARKS.normalEngagement)} typical`,
    };
  return {
    label: `${Math.round(Math.abs(diff) * 100)}% below normal engagement`,
    tone: 'bad',
    detail: `${formatPercent(rate)} vs ${formatPercent(BENCHMARKS.normalEngagement)} typical`,
  };
};

export const daysRemaining = (deadline: string | null) => {
  if (!deadline) return 0;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

export const MIN_CAMPAIGN_DAYS = 15;

/** Creators cannot apply when fewer than this many days remain. */
export const MIN_APPLY_DAYS = 5;

/** Earliest allowed deadline (yyyy-mm-dd) for a new campaign. */
export const minDeadlineInput = () =>
  new Date(Date.now() + MIN_CAMPAIGN_DAYS * 86_400_000).toISOString().slice(0, 10);

/** True when a creator is still allowed to apply. */
export const canApplyToCampaign = (deadline: string | null) =>
  daysRemaining(deadline) >= MIN_APPLY_DAYS;
