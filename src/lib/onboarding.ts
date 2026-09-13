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
  path: string;
};

export type OnboardingCheck = {
  complete: boolean;
  missing: OnboardingItem[];
  profilePath: string;
};

const filled = (value: string | null | undefined) => Boolean(value && value.trim());

const withQuery = (base: string, params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
};

const brandProfilePath = (tab?: 'contact' | 'branding', focus?: string) =>
  withQuery('/brand/profile', { tab, focus });

const creatorProfilePath = (tab?: 'account' | 'kyc', focus?: string) =>
  withQuery('/creator/profile', { tab, focus });

const hasPlace = (p: OnboardingProfile | null | undefined) => filled(p?.city) && filled(p?.country);

const placeFocus = (p: OnboardingProfile | null | undefined) =>
  filled(p?.city) ? 'country' : 'city';

/** Scroll and focus a profile field after the matching tab has rendered. */
export function focusOnboardingField(id: string | null | undefined) {
  if (!id) return;
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) return;
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  el.focus();
}

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
  if (!filled(profile?.company_name)) {
    missing.push({ key: 'company', label: 'Company name', path: brandProfilePath(undefined, 'company_name') });
  }
  if (!filled(profile?.first_name)) {
    missing.push({ key: 'first_name', label: 'First name', path: brandProfilePath('contact', 'first_name') });
  }
  if (!filled(profile?.last_name)) {
    missing.push({ key: 'last_name', label: 'Last name', path: brandProfilePath('contact', 'last_name') });
  }
  if (!hasPlace(profile)) {
    missing.push({
      key: 'location',
      label: 'City and country',
      path: brandProfilePath('contact', placeFocus(profile)),
    });
  }
  if (!filled(profile?.avatar_url)) {
    missing.push({ key: 'logo', label: 'Brand logo', path: brandProfilePath('branding') });
  }
  if (!isValidHex(profile?.brand_primary_color)) {
    missing.push({ key: 'color', label: 'Brand color', path: brandProfilePath('branding', 'brand_primary_color') });
  }
  if (!filled(profile?.website)) {
    missing.push({ key: 'website', label: 'Website', path: brandProfilePath('branding', 'website') });
  }
  if (!hasAnySocial(parseBrandSocials(profile?.brand_socials))) {
    missing.push({ key: 'socials', label: 'At least one social', path: brandProfilePath('branding') });
  }

  return {
    complete: missing.length === 0,
    missing,
    profilePath: missing[0]?.path ?? '/brand/profile',
  };
}

export function creatorOnboarding(profile: OnboardingProfile | null | undefined): OnboardingCheck {
  const missing: OnboardingItem[] = [];
  if (!filled(profile?.first_name)) {
    missing.push({ key: 'first_name', label: 'First name', path: creatorProfilePath(undefined, 'first_name') });
  }
  if (!filled(profile?.last_name)) {
    missing.push({ key: 'last_name', label: 'Last name', path: creatorProfilePath(undefined, 'last_name') });
  }
  if (!hasPlace(profile)) {
    missing.push({
      key: 'location',
      label: 'City and country',
      path: creatorProfilePath(undefined, placeFocus(profile)),
    });
  }
  if (!hasSocial(profile)) {
    missing.push({ key: 'social', label: 'Connect TikTok or Instagram', path: creatorProfilePath('account') });
  }
  if (!hasId(profile)) {
    missing.push({ key: 'id', label: 'Passport or national ID', path: creatorProfilePath('kyc') });
  }

  return {
    complete: missing.length === 0,
    missing,
    profilePath: missing[0]?.path ?? '/creator/profile',
  };
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
