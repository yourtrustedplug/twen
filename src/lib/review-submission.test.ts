import { describe, expect, it } from 'vitest';
import {
  isReviewStatus,
  rejectionCampaignUrl,
  rejectionEmailSubject,
  rejectionEmailText,
  rejectionReasonError,
  trimRejectionReason,
} from './review-submission';

describe('review-submission', () => {
  it('only accepts approve or reject', () => {
    expect(isReviewStatus('approved')).toBe(true);
    expect(isReviewStatus('rejected')).toBe(true);
    expect(isReviewStatus('submitted')).toBe(false);
  });

  it('requires a non-empty reason', () => {
    expect(rejectionReasonError('')).toBe('Add a rejection reason');
    expect(rejectionReasonError('   ')).toBe('Add a rejection reason');
    expect(rejectionReasonError(null)).toBe('Add a rejection reason');
    expect(rejectionReasonError('Missing the required hashtag.')).toBeNull();
  });

  it('caps the reason length', () => {
    expect(rejectionReasonError('x'.repeat(1001))).toMatch(/1000/);
    expect(rejectionReasonError('x'.repeat(1000))).toBeNull();
  });

  it('trims stored reasons', () => {
    expect(trimRejectionReason('  Missing CTA  ')).toBe('Missing CTA');
  });

  it('builds the resubmit URL and email copy', () => {
    expect(rejectionCampaignUrl('https://creator.twen.app/', 'abc')).toBe(
      'https://creator.twen.app/creator/campaigns/abc?submit=1',
    );
    expect(rejectionEmailSubject('Back to school')).toBe(
      'Your video for Back to school was not approved',
    );
    expect(
      rejectionEmailText({
        firstName: 'Ada',
        campaignTitle: 'Back to school',
        brandName: 'Infinix',
        reason: '  Missing the required hashtag.  ',
        campaignUrl: 'https://creator.twen.app/creator/campaigns/abc?submit=1',
      }),
    ).toContain('Hi Ada,');
    expect(
      rejectionEmailText({
        firstName: 'Ada',
        campaignTitle: 'Back to school',
        brandName: 'Infinix',
        reason: 'Missing the required hashtag.',
        campaignUrl: 'https://creator.twen.app/creator/campaigns/abc?submit=1',
      }),
    ).toContain('Reason: Missing the required hashtag.');
  });
});
