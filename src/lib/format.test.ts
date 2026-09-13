import { describe, expect, it } from 'vitest';
import { formatDueBy } from './format';

describe('formatDueBy', () => {
  it('prints day and month', () => {
    expect(formatDueBy('2026-09-23')).toBe('23 September');
  });

  it('keeps the year when it is not this year', () => {
    expect(formatDueBy('2027-01-05')).toBe('5 January 2027');
  });
});
