import { describe, expect, it } from 'vitest';
import { brandOnboarding, creatorOnboarding, focusOnboardingField, onboardingFor } from '@/lib/onboarding';

describe('creatorOnboarding', () => {
  it('is incomplete with an empty profile', () => {
    const check = creatorOnboarding({ role: 'creator' });
    expect(check.complete).toBe(false);
    expect(check.missing.map((m) => m.key)).toEqual(['first_name', 'last_name', 'location', 'social', 'id']);
    expect(check.profilePath).toBe('/creator/profile?focus=first_name');
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

  it('sends creators to Account when only a social is missing', () => {
    const check = creatorOnboarding({
      role: 'creator',
      first_name: 'Jane',
      last_name: 'Doe',
      city: 'Kampala',
      country: 'Uganda',
      id_verification_status: 'pending',
    });
    expect(check.missing.map((m) => m.key)).toEqual(['social']);
    expect(check.profilePath).toBe('/creator/profile?tab=account');
  });

  it('sends creators to KYC when only ID is missing', () => {
    const check = creatorOnboarding({
      role: 'creator',
      first_name: 'Jane',
      last_name: 'Doe',
      city: 'Kampala',
      country: 'Uganda',
      tiktok_handle: '@jane',
    });
    expect(check.missing.map((m) => m.key)).toEqual(['id']);
    expect(check.profilePath).toBe('/creator/profile?tab=kyc');
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
    expect(check.missing.map((m) => m.key)).toEqual(['first_name', 'last_name']);
    expect(check.profilePath).toBe('/creator/profile?focus=first_name');
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

  it('sends brands to first name on Contact when that field is missing', () => {
    const check = brandOnboarding({
      role: 'brand',
      company_name: 'Acme',
      last_name: 'Okello',
      city: 'Nairobi',
      country: 'Kenya',
      avatar_url: 'u/logo.png',
      brand_primary_color: '#112233',
      website: 'https://acme.com',
      brand_socials: { instagram: 'https://www.instagram.com/acme' },
    });
    expect(check.missing.map((m) => m.key)).toEqual(['first_name']);
    expect(check.profilePath).toBe('/brand/profile?tab=contact&focus=first_name');
  });

  it('sends brands to last name on Contact when only last name is missing', () => {
    const check = brandOnboarding({
      ...complete,
      last_name: '',
    });
    expect(check.missing.map((m) => m.key)).toEqual(['last_name']);
    expect(check.profilePath).toBe('/brand/profile?tab=contact&focus=last_name');
  });
});

describe('onboardingFor', () => {
  it('skips staff', () => {
    expect(onboardingFor({ role: 'admin' }).complete).toBe(true);
  });
});

describe('focusOnboardingField', () => {
  it('focuses the matching input', () => {
    const input = document.createElement('input');
    input.id = 'first_name';
    document.body.appendChild(input);
    focusOnboardingField('first_name');
    expect(document.activeElement).toBe(input);
    input.remove();
  });
});
