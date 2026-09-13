import { describe, expect, it } from 'vitest';
import { cartoonAvatar } from './cartoon-avatar';

describe('cartoonAvatar', () => {
  it('is stable for the same account id', () => {
    expect(cartoonAvatar('abc-123')).toBe(cartoonAvatar('abc-123'));
  });

  it('differs across accounts', () => {
    expect(cartoonAvatar('abc-123')).not.toBe(cartoonAvatar('xyz-789'));
  });

  it('uses Dicebear adventurer', () => {
    expect(cartoonAvatar('abc-123')).toContain('api.dicebear.com/9.x/adventurer/png');
    expect(cartoonAvatar('abc-123')).toContain('seed=abc-123');
  });
});
