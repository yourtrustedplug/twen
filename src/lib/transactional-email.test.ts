import { describe, expect, it } from 'vitest';
import {
  approvalEmailSubject,
  approvalMail,
  brandGotCreatorMail,
  brandGotCreatorSubject,
  campaignBrief,
  creatorCampaignUrl,
  formatUsd,
  greeting,
  hireEmailSubject,
  hireMail,
  kycRejectedMail,
  kycVerifiedMail,
  payoutFailedMail,
  payoutMethodLabel,
  payoutSentMail,
  rejectionEmailSubject,
  rejectionMail,
} from './transactional-email';

describe('transactional email', () => {
  it('greets by first name', () => {
    expect(greeting('Ada')).toBe('Hi Ada,');
    expect(greeting('  ')).toBe('Hi,');
  });

  it('formats campaign briefs and money', () => {
    expect(campaignBrief('Back to school', 'Infinix')).toBe('Back to school (Infinix)');
    expect(campaignBrief('  ', '')).toBe('this campaign');
    expect(formatUsd(40)).toBe('$40.00');
    expect(payoutMethodLabel('ecocash')).toBe('EcoCash');
  });

  it('builds approval and rejection copy', () => {
    expect(approvalEmailSubject('Back to school')).toBe('Your video for Back to school was approved');
    expect(rejectionEmailSubject('Back to school')).toBe(
      'Your video for Back to school was not approved',
    );
    const approved = approvalMail({
      firstName: 'Ada',
      campaignTitle: 'Back to school',
      brandName: 'Infinix',
      campaignUrl: 'https://creator.twen.app/creator/campaigns/abc',
    });
    expect(approved.text).toContain('Hi Ada,');
    expect(approved.text).toContain('approved your video');
    const rejected = rejectionMail({
      firstName: 'Ada',
      campaignTitle: 'Back to school',
      brandName: 'Infinix',
      reason: '  Missing the required hashtag.  '.trim(),
      campaignUrl: creatorCampaignUrl('https://creator.twen.app/', 'abc', true),
    });
    expect(rejected.text).toContain('Reason: Missing the required hashtag.');
    expect(rejected.text).toContain('https://creator.twen.app/creator/campaigns/abc?submit=1');
  });

  it('tells the brand they got a creator', () => {
    expect(brandGotCreatorSubject('Ada Okello', 'Back to school')).toBe(
      'Ada Okello is on Back to school',
    );
    const mail = brandGotCreatorMail({
      creatorName: 'Ada Okello',
      campaignTitle: 'Back to school',
      campaignUrl: 'https://brand.twen.app/brand/campaigns/abc',
    });
    expect(mail.text).toContain('Ada Okello is now posting for Back to school');
  });

  it('covers KYC, payout, and hire', () => {
    expect(kycVerifiedMail({ campaignsUrl: 'https://creator.twen.app/creator' }).subject).toBe(
      'Your ID is verified',
    );
    expect(kycRejectedMail({ kycUrl: 'https://creator.twen.app/creator/profile?tab=kyc' }).text)
      .toContain("couldn't verify");
    expect(
      payoutSentMail({
        firstName: 'Ada',
        amount: 12.5,
        method: 'ecocash',
        destination: '***123',
        earningsUrl: 'https://creator.twen.app/creator/earnings',
      }).subject,
    ).toBe('We sent your $12.50 payout');
    expect(
      payoutFailedMail({
        amount: 12.5,
        method: 'ecocash',
        accountUrl: 'https://creator.twen.app/creator/earnings/account',
      }).text,
    ).toContain('hello@twen.app');
    expect(hireEmailSubject('Infinix')).toBe('Infinix wants to book you');
    expect(
      hireMail({
        firstName: 'Ada',
        brandName: 'Infinix',
        ratePerVideo: 40,
        messagesUrl: 'https://creator.twen.app/messages?c=xyz',
      }).text,
    ).toContain('$40.00');
  });
});
