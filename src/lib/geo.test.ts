import { describe, expect, it } from 'vitest';
import { allCountryNames, countriesIn } from './geo';

describe('allCountryNames', () => {
  it('includes Zimbabwe in Africa', () => {
    expect(countriesIn('africa')).toContain('Zimbabwe');
    expect(allCountryNames()).toContain('Zimbabwe');
  });
});
