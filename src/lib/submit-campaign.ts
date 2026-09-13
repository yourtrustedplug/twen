import type { SocialPlatform } from '@/lib/platform-links';
import { detectPlatformFromUrl, isValidPlatformUrl } from '@/lib/platform-links';

export type ConnectedProfile = {
  tiktok_connected_at?: string | null;
  instagram_connected_at?: string | null;
  tiktok_handle?: string | null;
  instagram_handle?: string | null;
};

export type UrlFieldState = 'empty' | 'invalid' | 'valid' | 'wrong_platform' | 'needs_connect';

export const isSubmitPlatform = (value: string): value is SocialPlatform =>
  value === 'tiktok' || value === 'instagram';

export const allowedSubmitPlatforms = (campaignPlatforms: string[]): SocialPlatform[] => {
  const fromCampaign = campaignPlatforms.filter(isSubmitPlatform);
  return fromCampaign.length > 0 ? fromCampaign : ['tiktok', 'instagram'];
};

export const isPlatformConnected = (
  profile: ConnectedProfile | null | undefined,
  platform: string,
): boolean => {
  if (platform === 'instagram') return Boolean(profile?.instagram_connected_at);
  if (platform === 'tiktok') return Boolean(profile?.tiktok_connected_at);
  return false;
};

export const connectedSubmitPlatforms = (
  campaignPlatforms: string[],
  profile: ConnectedProfile | null | undefined,
): SocialPlatform[] =>
  allowedSubmitPlatforms(campaignPlatforms).filter((p) => isPlatformConnected(profile, p));

export const platformHandle = (
  profile: ConnectedProfile | null | undefined,
  platform: SocialPlatform,
) => (platform === 'instagram' ? profile?.instagram_handle : profile?.tiktok_handle) ?? null;

/** Prefer a connected, allowed platform so the form doesn't start on a blocked one. */
export const pickSubmitPlatform = (
  campaignPlatforms: string[],
  profile: ConnectedProfile | null | undefined,
): SocialPlatform => {
  const allowed = allowedSubmitPlatforms(campaignPlatforms);
  return allowed.find((p) => isPlatformConnected(profile, p)) ?? allowed[0] ?? 'tiktok';
};

export const allChecksDeclared = (items: { met: boolean }[]): boolean =>
  items.length === 0 || items.every((item) => item.met);

export const urlFieldState = (
  platform: SocialPlatform,
  url: string,
  allowed: SocialPlatform[],
  connected: SocialPlatform[] = allowed,
): UrlFieldState => {
  const trimmed = url.trim();
  if (!trimmed) return 'empty';

  const detected = detectPlatformFromUrl(trimmed);
  if (detected !== 'unknown' && !allowed.includes(detected)) return 'wrong_platform';
  if (detected !== 'unknown' && !connected.includes(detected)) return 'needs_connect';
  if (isValidPlatformUrl(platform, trimmed)) return 'valid';
  if (trimmed.length < 12 && detected === 'unknown') return 'empty';
  return 'invalid';
};

/** What 10k verified views would pay at this campaign's rate. */
export const examplePayout = (ratePer1k: number, views = 10_000) =>
  Number.isFinite(ratePer1k) && ratePer1k > 0 ? (ratePer1k / 1000) * views : 0;

export const canReplaceSubmission = (status: string | null | undefined) => status === 'rejected';
