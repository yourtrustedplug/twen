import { describe, expect, it } from 'vitest';
import {
  campaignAudienceLabel,
  creatorMatchesDisciplines,
  parseDisciplines,
  parseTargetDisciplines,
} from './unignored';

describe('parseDisciplines', () => {
  it('keeps known disciplines in order', () => {
    expect(parseDisciplines(['model', 'creator', 'ugc'])).toEqual(['model', 'creator', 'ugc']);
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

describe('campaign disciplines', () => {
  it('treats missing targets as open to everyone', () => {
    expect(parseTargetDisciplines(undefined)).toEqual(['creator', 'ugc', 'model']);
    expect(campaignAudienceLabel(undefined)).toBeNull();
  });

  it('matches any shared discipline', () => {
    expect(creatorMatchesDisciplines(['creator', 'model'], ['model'])).toBe(true);
    expect(creatorMatchesDisciplines(['ugc'], ['model'])).toBe(false);
    expect(creatorMatchesDisciplines(undefined, ['creator'])).toBe(true);
  });

  it('labels a restricted audience', () => {
    expect(campaignAudienceLabel(['model'])).toBe('Models');
    expect(campaignAudienceLabel(['creator', 'ugc'])).toBe('Content creators · UGC creators');
  });
});
