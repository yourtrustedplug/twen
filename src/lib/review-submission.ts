import { creatorCampaignUrl, rejectionEmailSubject, rejectionMail } from './transactional-email';

export const MIN_REJECTION_REASON = 1;
export const MAX_REJECTION_REASON = 1000;

export type ReviewStatus = 'approved' | 'rejected';

export const isReviewStatus = (value: unknown): value is ReviewStatus =>
  value === 'approved' || value === 'rejected';

export const trimRejectionReason = (value: string | null | undefined) => (value ?? '').trim();

/** Null when the reason is ready to store and email. */
export const rejectionReasonError = (value: string | null | undefined): string | null => {
  const trimmed = trimRejectionReason(value);
  if (!trimmed) return 'Add a rejection reason';
  if (trimmed.length > MAX_REJECTION_REASON) {
    return `Keep the reason under ${MAX_REJECTION_REASON} characters.`;
  }
  return null;
};

export { rejectionEmailSubject };

export const rejectionCampaignUrl = (creatorOrigin: string, campaignId: string) =>
  creatorCampaignUrl(creatorOrigin, campaignId, true);

export const rejectionEmailText = ({
  firstName,
  campaignTitle,
  brandName,
  reason,
  campaignUrl,
}: {
  firstName?: string | null;
  campaignTitle: string;
  brandName?: string | null;
  reason: string;
  campaignUrl: string;
}) =>
  rejectionMail({
    firstName,
    campaignTitle,
    brandName,
    reason: trimRejectionReason(reason),
    campaignUrl,
  }).text;
