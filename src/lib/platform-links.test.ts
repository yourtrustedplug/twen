import { describe, expect, it } from 'vitest';
import {
  isValidPlatformUrl,
  extractTikTokVideoId,
  extractInstagramShortcode,
  detectPlatformFromUrl,
} from './platform-links';

describe('platform-links', () => {
  it('accepts TikTok video URLs', () => {
    expect(
      isValidPlatformUrl('tiktok', 'https://www.tiktok.com/@creator/video/7234567890123456789'),
    ).toBe(true);
    expect(extractTikTokVideoId('https://www.tiktok.com/@creator/video/7234567890123456789')).toBe(
      '7234567890123456789',
    );
  });

  it('accepts short TikTok links', () => {
    expect(isValidPlatformUrl('tiktok', 'https://vm.tiktok.com/ZMabcdef/')).toBe(true);
    expect(isValidPlatformUrl('tiktok', 'https://www.tiktok.com/t/ZP8abcdef/')).toBe(true);
    expect(isValidPlatformUrl('tiktok', 'https://m.tiktok.com/v/7234567890123456789.html')).toBe(true);
  });

  it('accepts TikTok photo posts', () => {
    expect(
      isValidPlatformUrl('tiktok', 'https://www.tiktok.com/@creator/photo/7234567890123456789'),
    ).toBe(true);
    expect(extractTikTokVideoId('https://www.tiktok.com/@creator/photo/7234567890123456789')).toBe(
      '7234567890123456789',
    );
  });

  it('rejects non-TikTok hosts for tiktok platform', () => {
    expect(isValidPlatformUrl('tiktok', 'https://youtube.com/watch?v=abc')).toBe(false);
    expect(isValidPlatformUrl('tiktok', 'https://example.com/video/123')).toBe(false);
  });

  it('accepts Instagram reel/post URLs', () => {
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/reel/AbCdEf12345/')).toBe(true);
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/p/AbCdEf12345/')).toBe(true);
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/share/reel/AbCdEf12345/')).toBe(
      true,
    );
    expect(extractInstagramShortcode('https://www.instagram.com/reel/AbCdEf12345/')).toBe('AbCdEf12345');
  });

  it('rejects random Instagram-ish paths', () => {
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/creator/')).toBe(false);
    expect(isValidPlatformUrl('instagram', 'https://twitter.com/x')).toBe(false);
  });

  it('detects platform from a pasted URL', () => {
    expect(detectPlatformFromUrl('https://www.tiktok.com/@you/video/1')).toBe('tiktok');
    expect(detectPlatformFromUrl('https://vm.tiktok.com/ZMabc/')).toBe('tiktok');
    expect(detectPlatformFromUrl('https://www.tiktok.com/t/ZP8abc/')).toBe('tiktok');
    expect(detectPlatformFromUrl('https://www.instagram.com/reel/AbC/')).toBe('instagram');
    expect(detectPlatformFromUrl('not a url')).toBe('unknown');
  });
});
