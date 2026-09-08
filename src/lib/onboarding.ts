import { isStaff } from '@/lib/staff';
import { hasAnySocial, isValidHex, parseBrandSocials } from '@/lib/brand-kit';

export type OnboardingProfile = {
  role?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  city?: string | null;
  country?: string | null;
  tiktok_handle?: string | null;
  instagram_handle?: string | null;
  tiktok_connected_at?: string | null;
  instagram_connected_at?: string | null;
  id_verification_status?: string | null;
  avatar_url?: string | null;
  website?: string | null;
  brand_primary_color?: string | null;
  brand_socials?: unknown;
};

export type OnboardingItem = {
  key: string;
  label: string;
};

export type OnboardingCheck = {
  complete: boolean;
  missing: OnboardingItem[];
  profilePath: string;
};

const filled = (value: string | null | undefined) => Boolean(value && value.trim());

/** Match SQL profile_onboarding_complete — first_name + last_name only (not full_name). */
const hasPersonName = (p: OnboardingProfile | null | undefined) =>
  filled(p?.first_name) && filled(p?.last_name);

const hasPlace = (p: OnboardingProfile | null | undefined) => filled(p?.city) && filled(p?.country);

const hasSocial = (p: OnboardingProfile | null | undefined) =>
  Boolean(
    p?.tiktok_connected_at ||
      p?.instagram_connected_at ||
      filled(p?.tiktok_handle) ||
      filled(p?.instagram_handle),
  );

const hasId = (p: OnboardingProfile | null | undefined) =>
  p?.id_verification_status === 'pending' || p?.id_verification_status === 'verified';

export const profilePathFor = (role: string | null | undefined) => {
  if (role === 'brand') return '/brand/profile';
  return '/creator/profile';
};

export function brandOnboarding(profile: OnboardingProfile | null | undefined): OnboardingCheck {
  const missing: OnboardingItem[] = [];
  if (!filled(profile?.company_name)) missing.push({ key: 'company', label: 'Company name' });
  if (!hasPersonName(profile)) missing.push({ key: 'name', label: 'First and last name' });
  if (!hasPlace(profile)) missing.push({ key: 'location', label: 'City and country' });
  if (!filled(profile?.avatar_url)) missing.push({ key: 'logo', label: 'Brand logo' });
  if (!isValidHex(profile?.brand_primary_color)) missing.push({ key: 'color', label: 'Brand color' });
  if (!filled(profile?.website)) missing.push({ key: 'website', label: 'Website' });
  if (!hasAnySocial(parseBrandSocials(profile?.brand_socials))) {
    missing.push({ key: 'socials', label: 'At least one social' });
  }

  const brandingKeys = new Set(['logo', 'color', 'website', 'socials']);
  const basicsMissing = missing.some((m) => !brandingKeys.has(m.key));
  const brandingMissing = missing.some((m) => brandingKeys.has(m.key));
  const profilePath =
    brandingMissing && !basicsMissing ? '/brand/profile?tab=branding' : '/brand/profile';

  return { complete: missing.length === 0, missing, profilePath };
}

export function creatorOnboarding(profile: OnboardingProfile | null | undefined): OnboardingCheck {
  const missing: OnboardingItem[] = [];
  if (!hasPersonName(profile)) missing.push({ key: 'name', label: 'First and last name' });
  if (!hasPlace(profile)) missing.push({ key: 'location', label: 'City and country' });
  if (!hasSocial(profile)) missing.push({ key: 'social', label: 'Connect TikTok or Instagram' });
  if (!hasId(profile)) missing.push({ key: 'id', label: 'Passport or national ID' });
  return { complete: missing.length === 0, missing, profilePath: '/creator/profile' };
}

export function onboardingFor(profile: OnboardingProfile | null | undefined): OnboardingCheck {
  if (isStaff(profile?.role)) {
    return { complete: true, missing: [], profilePath: '/admin' };
  }
  if (profile?.role === 'brand') return brandOnboarding(profile);
  return creatorOnboarding(profile);
}

export const isOnboardingComplete = (profile: OnboardingProfile | null | undefined) =>
  onboardingFor(profile).complete;
