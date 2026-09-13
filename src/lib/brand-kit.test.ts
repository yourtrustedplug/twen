import { describe, expect, it } from 'vitest';
import {
  hasAnySocial,
  kitFromCampaign,
  kitFromProfile,
  campaignLogoPath,
  normalizeHex,
  normalizeWebsite,
  socialUrl,
  socialsFromUrls,
  websiteLabel,
} from '@/lib/brand-kit';

describe('normalizeHex', () => {
  it('expands 3-digit hex and uppercases', () => {
    expect(normalizeHex('#0a3')).toBe('#00AA33');
    expect(normalizeHex('1a2b3c')).toBe('#1A2B3C');
  });

  it('rejects invalid values', () => {
    expect(normalizeHex('red')).toBe('');
    expect(normalizeHex('#gg0000')).toBe('');
  });
});

describe('normalizeWebsite', () => {
  it('adds https when missing', () => {
    expect(normalizeWebsite('acme.com')).toBe('https://acme.com/');
  });

  it('rejects junk', () => {
    expect(normalizeWebsite('not a url')).toBe('');
    expect(normalizeWebsite('ftp://acme.com')).toBe('');
  });
});

describe('socialUrl', () => {
  it('turns handles into platform URLs', () => {
    expect(socialUrl('tiktok', '@acme')).toBe('https://www.tiktok.com/@acme');
    expect(socialUrl('instagram', 'acme')).toBe('https://www.instagram.com/acme');
  });
});

describe('kitFromProfile', () => {
  it('normalizes colors, site, and socials', () => {
    const kit = kitFromProfile({
      avatar_url: 'u/logo.png',
      brand_primary_color: '112233',
      website: 'acme.com',
      brand_socials: { tiktok: '@acme' },
      company_name: 'Acme',
      bio: 'Sells soap.',
      city: 'Nairobi',
      country: 'Kenya',
    });
    expect(kit.logo).toBe('u/logo.png');
    expect(kit.primary).toBe('#112233');
    expect(kit.website).toBe('https://acme.com/');
    expect(kit.socials.tiktok).toBe('https://www.tiktok.com/@acme');
    expect(kit.company).toBe('Acme');
    expect(kit.bio).toBe('Sells soap.');
    expect(kit.city).toBe('Nairobi');
    expect(hasAnySocial(kit.socials)).toBe(true);
  });
});

describe('campaignLogoPath', () => {
  it('reads logo from the campaign kit', () => {
    expect(campaignLogoPath({ brand_kit: { logo: 'brands/logo.png' } })).toBe('brands/logo.png');
  });

  it('falls back to avatar_url if that is how the kit was stored', () => {
    expect(campaignLogoPath({ brand_kit: { avatar_url: 'brands/mark.png' } })).toBe('brands/mark.png');
  });

  it('does not invent a letter from the brand name', () => {
    expect(campaignLogoPath({ brand_kit: {} })).toBeNull();
  });
});

describe('kitFromCampaign', () => {
  it('falls back to links and social URL arrays', () => {
    const kit = kitFromCampaign({
      links: ['https://acme.com'],
      socials: ['https://www.instagram.com/acme'],
    });
    expect(kit.website).toBe('https://acme.com');
    expect(kit.socials.instagram).toBe('https://www.instagram.com/acme');
  });

  it('keeps website and company when the kit only has a logo', () => {
    const kit = kitFromCampaign({
      brand_kit: { logo: 'brands/logo.png' },
      brand_name: 'Acme',
      links: ['https://acme.com'],
      socials: ['https://www.instagram.com/acme'],
    });
    expect(kit.logo).toBe('brands/logo.png');
    expect(kit.website).toBe('https://acme.com');
    expect(kit.company).toBe('Acme');
    expect(kit.socials.instagram).toBe('https://www.instagram.com/acme');
  });

  it('prefers kit website over campaign links', () => {
    const kit = kitFromCampaign({
      brand_kit: { website: 'https://kit.example', company: 'Kit Co' },
      brand_name: 'Fallback',
      links: ['https://acme.com'],
    });
    expect(kit.website).toBe('https://kit.example');
    expect(kit.company).toBe('Kit Co');
  });
});

describe('websiteLabel', () => {
  it('strips protocol and trailing slash', () => {
    expect(websiteLabel('https://www.acme.com/')).toBe('acme.com');
    expect(websiteLabel('https://acme.com/shop')).toBe('acme.com/shop');
  });
});

describe('socialsFromUrls', () => {
  it('maps twitter.com to X', () => {
    expect(socialsFromUrls(['https://twitter.com/acme']).x).toBe('https://twitter.com/acme');
  });
});
