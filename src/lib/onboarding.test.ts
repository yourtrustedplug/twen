import { describe, expect, it } from 'vitest';
import { brandOnboarding, creatorOnboarding, onboardingFor } from '@/lib/onboarding';

describe('creatorOnboarding', () => {
  it('is incomplete with an empty profile', () => {
    const check = creatorOnboarding({ role: 'creator' });
    expect(check.complete).toBe(false);
    expect(check.missing.map((m) => m.key)).toEqual(['name', 'location', 'social', 'id']);
  });

  it('is complete when name, place, a social, and ID are set', () => {
    const check = creatorOnboarding({
      role: 'creator',
      first_name: 'Jane',
      last_name: 'Doe',
      city: 'Kampala',
      country: 'Uganda',
      tiktok_handle: '@jane',
      id_verification_status: 'pending',
    });
    expect(check.complete).toBe(true);
  });

  it('does not treat full_name alone as complete (matches SQL)', () => {
    const check = creatorOnboarding({
      role: 'creator',
      full_name: 'Jane Doe',
      city: 'Kampala',
      country: 'Uganda',
      tiktok_handle: '@jane',
      id_verification_status: 'pending',
    });
    expect(check.complete).toBe(false);
    expect(check.missing.map((m) => m.key)).toContain('name');
  });
});

describe('brandOnboarding', () => {
  const complete = {
    role: 'brand',
    company_name: 'Acme',
    first_name: 'Ada',
    last_name: 'Okello',
    city: 'Nairobi',
    country: 'Kenya',
    avatar_url: 'u/logo.png',
    brand_primary_color: '#112233',
    website: 'https://acme.com',
    brand_socials: { instagram: 'https://www.instagram.com/acme' },
  };

  it('requires company, contact, location, and brand kit', () => {
    expect(brandOnboarding({ role: 'brand', company_name: 'Acme' }).complete).toBe(false);
    expect(brandOnboarding(complete).complete).toBe(true);
  });

  it('sends brands to the branding tab when only kit fields are missing', () => {
    const check = brandOnboarding({
      role: 'brand',
      company_name: 'Acme',
      first_name: 'Ada',
      last_name: 'Okello',
      city: 'Nairobi',
      country: 'Kenya',
    });
    expect(check.missing.map((m) => m.key)).toEqual(['logo', 'color', 'website', 'socials']);
    expect(check.profilePath).toBe('/brand/profile?tab=branding');
  });
});

describe('onboardingFor', () => {
  it('skips staff', () => {
    expect(onboardingFor({ role: 'admin' }).complete).toBe(true);
  });
});
