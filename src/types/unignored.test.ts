import { describe, expect, it } from 'vitest';
import { parseDisciplines } from './unignored';

describe('parseDisciplines', () => {
  it('keeps known disciplines in order', () => {
    expect(parseDisciplines(['model', 'creator'])).toEqual(['model', 'creator']);
  });

  it('drops unknown values', () => {
    expect(parseDisciplines(['model', 'stylist', 3])).toEqual(['model']);
  });

  it('falls back to creator when empty or missing', () => {
    expect(parseDisciplines([])).toEqual(['creator']);
    expect(parseDisciplines(undefined)).toEqual(['creator']);
    expect(parseDisciplines('model')).toEqual(['creator']);
  });
});
