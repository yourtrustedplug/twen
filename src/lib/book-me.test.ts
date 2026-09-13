import { describe, expect, it } from 'vitest';
import {
  bookMeDisplay,
  bookMePath,
  bookMeSlugFromPath,
  bookSlugError,
  isBookMePath,
  normalizeBookSlug,
  parseBookMeProfile,
  socialProfileHref,
  suggestBookSlug,
} from './book-me';

describe('book-me slugs', () => {
  it('normalizes handles and names', () => {
    expect(normalizeBookSlug('@Amina_Ke!')).toBe('amina-ke');
    expect(normalizeBookSlug('  Hello World  ')).toBe('hello-world');
  });

  it('rejects reserved and short names', () => {
    expect(bookSlugError('ab')).toMatch(/at least/i);
    expect(bookSlugError('about')).toMatch(/reserved/i);
    expect(bookSlugError('amina')).toBeNull();
  });

  it('prefers a TikTok handle for the suggested slug', () => {
    expect(
      suggestBookSlug({ tiktokHandle: '@AminaKe', firstName: 'Amina', lastName: 'Okello' }),
    ).toBe('aminake');
  });

  it('builds bio paths', () => {
    expect(bookMePath('Amina Ke')).toBe('/@amina-ke');
    expect(bookMeDisplay('amina-ke')).toBe('twen.app/@amina-ke');
    expect(isBookMePath('/@amina-ke')).toBe(true);
    expect(isBookMePath('/book/amina-ke')).toBe(true);
    expect(isBookMePath('/creators')).toBe(false);
    expect(bookMeSlugFromPath('/@Amina-Ke')).toBe('amina-ke');
  });

  it('builds social profile links', () => {
    expect(socialProfileHref('tiktok', '@amina')).toBe('https://www.tiktok.com/@amina');
    expect(socialProfileHref('instagram', 'amina.ke')).toBe('https://www.instagram.com/amina.ke');
    expect(socialProfileHref('tiktok', '')).toBeNull();
  });

  it('parses the RPC payload and ignores junk', () => {
    expect(parseBookMeProfile(null)).toBeNull();
    const parsed = parseBookMeProfile({
      id: 'u1',
      book_slug: 'amina',
      full_name: 'Amina',
      bio: 'Hi',
      rate_per_video: '120',
      platforms: ['tiktok', 1],
    });
    expect(parsed?.full_name).toBe('Amina');
    expect(parsed?.rate_per_video).toBe(120);
    expect(parsed?.platforms).toEqual(['tiktok']);
    expect(parsed?.work).toEqual([]);
  });

  it('keeps approved work posts', () => {
    const parsed = parseBookMeProfile({
      id: 'u1',
      book_slug: 'amina',
      work: [{ id: 's1', url: 'https://www.tiktok.com/@a/video/1', platform: 'tiktok', verified_views: 1200 }],
    });
    expect(parsed?.work).toEqual([
      {
        id: 's1',
        url: 'https://www.tiktok.com/@a/video/1',
        platform: 'tiktok',
        verified_views: 1200,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement_rate: 0,
      },
    ]);
  });
});
