import { describe, expect, it } from 'vitest';
import { isValidPlatformUrl, extractTikTokVideoId, extractInstagramShortcode } from './platform-links';

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
  });

  it('rejects non-TikTok hosts for tiktok platform', () => {
    expect(isValidPlatformUrl('tiktok', 'https://youtube.com/watch?v=abc')).toBe(false);
    expect(isValidPlatformUrl('tiktok', 'https://example.com/video/123')).toBe(false);
  });

  it('accepts Instagram reel/post URLs', () => {
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/reel/AbCdEf12345/')).toBe(true);
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/p/AbCdEf12345/')).toBe(true);
    expect(extractInstagramShortcode('https://www.instagram.com/reel/AbCdEf12345/')).toBe('AbCdEf12345');
  });

  it('rejects random Instagram-ish paths', () => {
    expect(isValidPlatformUrl('instagram', 'https://www.instagram.com/creator/')).toBe(false);
    expect(isValidPlatformUrl('instagram', 'https://twitter.com/x')).toBe(false);
  });
});
