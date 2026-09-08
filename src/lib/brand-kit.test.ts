import { describe, expect, it } from 'vitest';
import {
  hasAnySocial,
  kitFromCampaign,
  kitFromProfile,
  normalizeHex,
  normalizeWebsite,
  socialUrl,
  socialsFromUrls,
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
    });
    expect(kit.logo).toBe('u/logo.png');
    expect(kit.primary).toBe('#112233');
    expect(kit.website).toBe('https://acme.com/');
    expect(kit.socials.tiktok).toBe('https://www.tiktok.com/@acme');
    expect(hasAnySocial(kit.socials)).toBe(true);
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
});

describe('socialsFromUrls', () => {
  it('maps twitter.com to X', () => {
    expect(socialsFromUrls(['https://twitter.com/acme']).x).toBe('https://twitter.com/acme');
  });
});
