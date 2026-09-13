import { describe, expect, it } from 'vitest';
import { brandInitials, brandMarkTone } from './brand-mark';

describe('brandInitials', () => {
  it('uses one letter for a single word', () => {
    expect(brandInitials('NardoPay')).toBe('N');
  });

  it('uses two letters for a multi-word name', () => {
    expect(brandInitials('Red Bull')).toBe('RB');
  });

  it('skips filler words', () => {
    expect(brandInitials('The North Face')).toBe('NF');
  });

  it('falls back when empty', () => {
    expect(brandInitials('   ')).toBe('?');
  });
});

describe('brandMarkTone', () => {
  it('uses the brand primary when it is a real hex', () => {
    expect(brandMarkTone('nardo', '#FFFFFF')).toEqual({ bg: '#FFFFFF', fg: '#0A101D' });
  });

  it('is stable for the same seed when there is no primary', () => {
    expect(brandMarkTone('brand-1', 'red')).toEqual(brandMarkTone('brand-1'));
    expect(brandMarkTone('brand-1').bg).toMatch(/^#[0-9A-F]{6}$/);
  });
});
