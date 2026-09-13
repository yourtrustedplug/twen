import { describe, expect, it } from 'vitest';
import { formatMissingPath, isAbsoluteHref, notFoundHome } from './not-found';

describe('notFoundHome', () => {
  it('sends signed-out visitors to the gate', () => {
    expect(notFoundHome(false)).toEqual({ path: '/', label: 'Go home' });
    expect(notFoundHome(false, 'creator')).toEqual({ path: '/', label: 'Go home' });
  });

  it('sends signed-in roles to their app home', () => {
    expect(notFoundHome(true, 'creator')).toEqual({ path: '/creator', label: 'Back to campaigns' });
    expect(notFoundHome(true, 'brand')).toEqual({ path: '/brand', label: 'Back to dashboard' });
    expect(notFoundHome(true, 'admin')).toEqual({ path: '/admin', label: 'Back to admin' });
    expect(notFoundHome(true, 'moderator')).toEqual({ path: '/admin', label: 'Back to admin' });
  });

  it('defaults a signed-in user with no role to creator', () => {
    expect(notFoundHome(true).path).toBe('/creator');
    expect(notFoundHome(true, null).path).toBe('/creator');
  });
});

describe('formatMissingPath', () => {
  it('keeps short paths intact', () => {
    expect(formatMissingPath('/nope')).toBe('/nope');
    expect(formatMissingPath('lost')).toBe('/lost');
  });

  it('truncates long paths from both ends', () => {
    const path = `/${'a'.repeat(40)}/${'b'.repeat(40)}`;
    const shown = formatMissingPath(path);
    expect(shown.length).toBeLessThan(path.length);
    expect(shown.startsWith('/aaaa')).toBe(true);
    expect(shown.endsWith('bbbbb')).toBe(true);
    expect(shown).toContain('…');
  });
});

describe('isAbsoluteHref', () => {
  it('detects http(s) destinations', () => {
    expect(isAbsoluteHref('/creators')).toBe(false);
    expect(isAbsoluteHref('https://www.twen.app/creators')).toBe(true);
  });
});
