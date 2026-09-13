import { describe, expect, it } from 'vitest';
import { payoutDate, PAYOUT_HOLD_DAYS, submitDeadline, MIN_APPLY_DAYS } from './metrics';
import {
  allChecksDeclared,
  canReplaceSubmission,
  connectedSubmitPlatforms,
  examplePayout,
  isPlatformConnected,
  pickSubmitPlatform,
  urlFieldState,
} from './submit-campaign';
import { isSafeCreatorReturnPath } from './social-return';

describe('submit-campaign', () => {
  it('treats empty checklists as ready', () => {
    expect(allChecksDeclared([])).toBe(true);
    expect(allChecksDeclared([{ met: true }, { met: true }])).toBe(true);
    expect(allChecksDeclared([{ met: true }, { met: false }])).toBe(false);
  });

  it('only lets rejected submissions be replaced', () => {
    expect(canReplaceSubmission('rejected')).toBe(true);
    expect(canReplaceSubmission('submitted')).toBe(false);
    expect(canReplaceSubmission('approved')).toBe(false);
    expect(canReplaceSubmission(null)).toBe(false);
  });

  it('picks a connected allowed platform first', () => {
    expect(
      pickSubmitPlatform(['tiktok', 'instagram'], { instagram_connected_at: '2026-01-01' }),
    ).toBe('instagram');
    expect(pickSubmitPlatform(['tiktok'], { instagram_connected_at: '2026-01-01' })).toBe('tiktok');
    expect(pickSubmitPlatform([], {})).toBe('tiktok');
  });

  it('lists only connected post options', () => {
    expect(
      connectedSubmitPlatforms(['tiktok', 'instagram'], { tiktok_connected_at: '2026-01-01' }),
    ).toEqual(['tiktok']);
    expect(connectedSubmitPlatforms(['instagram'], { tiktok_connected_at: '2026-01-01' })).toEqual(
      [],
    );
  });

  it('knows which OAuth account is connected', () => {
    expect(isPlatformConnected({ tiktok_connected_at: '2026-01-01' }, 'tiktok')).toBe(true);
    expect(isPlatformConnected({ tiktok_connected_at: '2026-01-01' }, 'instagram')).toBe(false);
  });

  it('classifies the pasted URL', () => {
    expect(urlFieldState('tiktok', '', ['tiktok'])).toBe('empty');
    expect(
      urlFieldState('tiktok', 'https://www.tiktok.com/@you/video/7234567890123456789', ['tiktok']),
    ).toBe('valid');
    expect(urlFieldState('tiktok', 'https://www.tiktok.com/t/ZP8abcdef/', ['tiktok'])).toBe('valid');
    expect(urlFieldState('tiktok', 'https://youtube.com/watch?v=1', ['tiktok'])).toBe('invalid');
    expect(urlFieldState('tiktok', 'hi', ['tiktok'])).toBe('empty');
    expect(
      urlFieldState('tiktok', 'https://www.instagram.com/reel/AbCdEf12345/', ['tiktok']),
    ).toBe('wrong_platform');
    expect(
      urlFieldState(
        'tiktok',
        'https://www.instagram.com/reel/AbCdEf12345/',
        ['tiktok', 'instagram'],
        ['tiktok'],
      ),
    ).toBe('needs_connect');
  });

  it('estimates payout at 10k views', () => {
    expect(examplePayout(1.25)).toBe(12.5);
    expect(examplePayout(0)).toBe(0);
  });
});

describe('campaign dates', () => {
  it('sets submit deadline MIN_APPLY_DAYS before the campaign ends', () => {
    const date = submitDeadline('2026-09-20');
    expect(date?.getDate()).toBe(20 - MIN_APPLY_DAYS);
    expect(date?.getMonth()).toBe(8);
  });

  it('adds the hold for payout date unless Pro', () => {
    const held = payoutDate('2026-09-20', false);
    const instant = payoutDate('2026-09-20', true);
    expect(held?.getDate()).toBe(20 + PAYOUT_HOLD_DAYS);
    expect(instant?.getDate()).toBe(20);
  });
});

describe('social return path', () => {
  it('only allows in-app creator paths', () => {
    expect(isSafeCreatorReturnPath('/creator/campaigns/abc')).toBe(true);
    expect(isSafeCreatorReturnPath('https://evil.test')).toBe(false);
    expect(isSafeCreatorReturnPath('//evil.test')).toBe(false);
  });
});
