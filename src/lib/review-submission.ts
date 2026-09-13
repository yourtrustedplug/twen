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

export const rejectionEmailSubject = (campaignTitle: string) => {
  const title = campaignTitle.trim() || 'a campaign';
  return `Your video for ${title} was not approved`;
};

export const rejectionCampaignUrl = (creatorOrigin: string, campaignId: string) =>
  `${creatorOrigin.replace(/\/$/, '')}/creator/campaigns/${campaignId}?submit=1`;

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
}) => {
  const hi = firstName?.trim() ? `Hi ${firstName.trim()},` : 'Hi,';
  const title = campaignTitle.trim() || 'this campaign';
  const brand = brandName?.trim();
  const brief = brand ? `${title} (${brand})` : title;
  return [
    hi,
    '',
    `A moderator reviewed your video for ${brief} and did not approve it.`,
    '',
    `Reason: ${trimRejectionReason(reason)}`,
    '',
    'You can post a new video for this brief and submit that link instead:',
    campaignUrl,
    '',
    '— Twen',
  ].join('\n');
};
