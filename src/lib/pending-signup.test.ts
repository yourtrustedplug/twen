import { afterEach, describe, expect, it } from 'vitest';
import {
  mergePendingBook,
  parsePendingBook,
  pendingBookFromSearch,
  pendingBookSearch,
  peekPendingBook,
  setPendingBook,
  takePendingBook,
} from './pending-signup';

describe('pending book drafts', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('parses a legacy creator id string', () => {
    expect(parsePendingBook('creator-1')).toEqual({ creatorId: 'creator-1' });
  });

  it('keeps a drafted note', () => {
    expect(
      parsePendingBook({
        creatorId: 'c1',
        creatorName: 'Amina',
        ratePerVideo: 40,
        body: '  Need 3 videos next week  ',
      }),
    ).toEqual({
      creatorId: 'c1',
      creatorName: 'Amina',
      ratePerVideo: 40,
      body: 'Need 3 videos next week',
    });
  });

  it('round-trips through the sign-in query', () => {
    const query = pendingBookSearch({
      creatorId: 'c1',
      creatorName: 'Amina',
      ratePerVideo: 40,
      body: 'Need 3 videos',
    });
    expect(pendingBookFromSearch(new URLSearchParams(query))).toEqual({
      creatorId: 'c1',
      creatorName: 'Amina',
      ratePerVideo: 40,
      body: 'Need 3 videos',
    });
  });

  it('merges a URL book id onto a stored note', () => {
    expect(
      mergePendingBook({ creatorId: 'c1', body: 'Hi' }, { creatorId: 'c1' }),
    ).toEqual({ creatorId: 'c1', body: 'Hi' });
  });

  it('stores and consumes the draft once', () => {
    setPendingBook({ creatorId: 'c1', body: 'Hi' });
    expect(peekPendingBook()?.body).toBe('Hi');
    expect(takePendingBook()?.creatorId).toBe('c1');
    expect(peekPendingBook()).toBeNull();
  });
});
