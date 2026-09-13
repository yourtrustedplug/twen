import { describe, expect, it } from 'vitest';
import { optionsMatching } from './FilterSelect';

const options = [
  { value: 'all', label: 'Any country' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'Zimbabwe', label: 'Zimbabwe' },
];

describe('optionsMatching', () => {
  it('returns every option when the query is empty', () => {
    expect(optionsMatching(options, '  ')).toEqual(options);
  });

  it('filters by label', () => {
    expect(optionsMatching(options, 'zim')).toEqual([options[2]]);
  });
});
