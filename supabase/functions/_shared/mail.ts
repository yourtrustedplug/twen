/** Copy for Resend transactional mail. Keep in sync with `src/lib/transactional-email.ts`. */

export type Mail = { subject: string; text: string; html: string };

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const greeting = (firstName?: string | null) => {
  const name = firstName?.trim();
  return name ? `Hi ${name},` : 'Hi,';
};

export const campaignBrief = (campaignTitle: string, brandName?: string | null) => {
  const title = campaignTitle.trim() || 'this campaign';
  const brand = brandName?.trim();
  return brand ? `${title} (${brand})` : title;
};

export const formatUsd = (amount: number | string) => {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  const n = Number.isFinite(value) ? value : 0;
  return `$${n.toFixed(2)}`;
};

const PAYOUT_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  airteltigo_money: 'AirtelTigo Money',
  ecocash: 'EcoCash',
  emola: 'e-Mola',
  innbucks: 'InnBucks',
  mixx_yas: 'Mixx by Yas',
  moov_money: 'Moov Money',
  mpesa: 'M-Pesa',
  mtn_momo: 'MTN MoMo',
  onemoney: 'OneMoney',
  opay: 'OPay',
  orange_money: 'Orange Money',
  palmpay: 'PalmPay',
  telecel_cash: 'Telecel Cash',
  tnm_mpamba: 'TNM Mpamba',
  wave: 'Wave',
};

export const payoutMethodLabel = (method: string | null | undefined) =>
  (method && PAYOUT_LABELS[method]) || method || 'mobile money';

const signOff = (lines: string[]) => [...lines, '', '— Twen'].join('\n');

const htmlBlock = (hi: string, body: string) =>
  `<p>${escapeHtml(hi)}</p>\n${body}\n<p>— Twen</p>`;

const link = (href: string, label: string) =>
  `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;

export const originPath = (origin: string, path: string) =>
  `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

export const creatorCampaignUrl = (creatorOrigin: string, campaignId: string, submit = false) =>
  originPath(creatorOrigin, `/creator/campaigns/${campaignId}${submit ? '?submit=1' : ''}`);

export const brandCampaignUrl = (brandOrigin: string, campaignId: string) =>
  originPath(brandOrigin, `/brand/campaigns/${campaignId}`);

export const kycUrl = (creatorOrigin: string) => originPath(creatorOrigin, '/creator/profile?tab=kyc');

export const campaignsHomeUrl = (creatorOrigin: string) => originPath(creatorOrigin, '/creator');

export const earningsUrl = (creatorOrigin: string) => originPath(creatorOrigin, '/creator/earnings');

export const payoutAccountUrl = (creatorOrigin: string) =>
  originPath(creatorOrigin, '/creator/earnings/account');

export const messagesUrl = (appOrigin: string, conversationId: string) =>
  originPath(appOrigin, `/messages?c=${conversationId}`);

export const rejectionEmailSubject = (campaignTitle: string) => {
  const title = campaignTitle.trim() || 'a campaign';
  return `Your video for ${title} was not approved`;
};

export const approvalEmailSubject = (campaignTitle: string) => {
  const title = campaignTitle.trim() || 'a campaign';
  return `Your video for ${title} was approved`;
};

export const brandGotCreatorSubject = (creatorName: string, campaignTitle: string) => {
  const who = creatorName.trim() || 'A creator';
  const title = campaignTitle.trim() || 'your campaign';
  return `${who} is on ${title}`;
};

export const kycVerifiedSubject = () => 'Your ID is verified';
export const kycRejectedSubject = () => "We couldn't verify your ID";

export const payoutSentSubject = (amount: number | string) => `We sent your ${formatUsd(amount)} payout`;
export const payoutFailedSubject = (amount: number | string) =>
  `We couldn't send your ${formatUsd(amount)} payout`;

export const hireEmailSubject = (brandName: string) => {
  const brand = brandName.trim() || 'A brand';
  return `${brand} wants to book you`;
};

export const rejectionMail = (opts: {
  firstName?: string | null;
  campaignTitle: string;
  brandName?: string | null;
  reason: string;
  campaignUrl: string;
}): Mail => {
  const hi = greeting(opts.firstName);
  const brief = campaignBrief(opts.campaignTitle, opts.brandName);
  const reason = opts.reason.trim();
  return {
    subject: rejectionEmailSubject(opts.campaignTitle),
    text: signOff([
      hi,
      '',
      `A moderator reviewed your video for ${brief} and did not approve it.`,
      '',
      `Reason: ${reason}`,
      '',
      'You can post a new video for this brief and submit that link instead:',
      opts.campaignUrl,
    ]),
    html: htmlBlock(
      hi,
      `<p>A moderator reviewed your video for <strong>${escapeHtml(brief)}</strong> and did not approve it.</p>
    <p><strong>Reason:</strong><br />${escapeHtml(reason).replaceAll('\n', '<br />')}</p>
    ${link(opts.campaignUrl, 'Submit a new video')}`,
    ),
  };
};

export const approvalMail = (opts: {
  firstName?: string | null;
  campaignTitle: string;
  brandName?: string | null;
  campaignUrl: string;
}): Mail => {
  const hi = greeting(opts.firstName);
  const brief = campaignBrief(opts.campaignTitle, opts.brandName);
  return {
    subject: approvalEmailSubject(opts.campaignTitle),
    text: signOff([
      hi,
      '',
      `A moderator approved your video for ${brief}. You'll earn on verified views while the campaign is open.`,
      '',
      'See the campaign:',
      opts.campaignUrl,
    ]),
    html: htmlBlock(
      hi,
      `<p>A moderator approved your video for <strong>${escapeHtml(brief)}</strong>. You'll earn on verified views while the campaign is open.</p>
    ${link(opts.campaignUrl, 'See the campaign')}`,
    ),
  };
};

export const brandGotCreatorMail = (opts: {
  firstName?: string | null;
  creatorName: string;
  campaignTitle: string;
  campaignUrl: string;
}): Mail => {
  const hi = greeting(opts.firstName);
  const who = opts.creatorName.trim() || 'A creator';
  const title = opts.campaignTitle.trim() || 'your campaign';
  return {
    subject: brandGotCreatorSubject(who, title),
    text: signOff([
      hi,
      '',
      `${who} is now posting for ${title}. Their video was approved and will earn on verified views.`,
      '',
      'Open the campaign:',
      opts.campaignUrl,
    ]),
    html: htmlBlock(
      hi,
      `<p><strong>${escapeHtml(who)}</strong> is now posting for <strong>${escapeHtml(title)}</strong>. Their video was approved and will earn on verified views.</p>
    ${link(opts.campaignUrl, 'Open the campaign')}`,
    ),
  };
};

export const kycVerifiedMail = (opts: { firstName?: string | null; campaignsUrl: string }): Mail => {
  const hi = greeting(opts.firstName);
  return {
    subject: kycVerifiedSubject(),
    text: signOff([
      hi,
      '',
      'Your passport or national ID is verified. You can submit to campaigns.',
      '',
      opts.campaignsUrl,
    ]),
    html: htmlBlock(
      hi,
      `<p>Your passport or national ID is verified. You can submit to campaigns.</p>
    ${link(opts.campaignsUrl, 'Browse campaigns')}`,
    ),
  };
};

export const kycRejectedMail = (opts: { firstName?: string | null; kycUrl: string }): Mail => {
  const hi = greeting(opts.firstName);
  return {
    subject: kycRejectedSubject(),
    text: signOff([
      hi,
      '',
      "We couldn't verify the document you uploaded. Try a clearer photo of the photo page, then upload again.",
      '',
      opts.kycUrl,
    ]),
    html: htmlBlock(
      hi,
      `<p>We couldn't verify the document you uploaded. Try a clearer photo of the photo page, then upload again.</p>
    ${link(opts.kycUrl, 'Update your ID')}`,
    ),
  };
};

export const payoutSentMail = (opts: {
  firstName?: string | null;
  amount: number | string;
  method?: string | null;
  destination?: string | null;
  earningsUrl: string;
}): Mail => {
  const hi = greeting(opts.firstName);
  const amount = formatUsd(opts.amount);
  const method = payoutMethodLabel(opts.method);
  const dest = opts.destination?.trim();
  const where = dest ? `${method} (${dest})` : method;
  return {
    subject: payoutSentSubject(opts.amount),
    text: signOff([hi, '', `We sent ${amount} to your ${where}.`, '', opts.earningsUrl]),
    html: htmlBlock(
      hi,
      `<p>We sent <strong>${escapeHtml(amount)}</strong> to your ${escapeHtml(where)}.</p>
    ${link(opts.earningsUrl, 'See earnings')}`,
    ),
  };
};

export const payoutFailedMail = (opts: {
  firstName?: string | null;
  amount: number | string;
  method?: string | null;
  accountUrl: string;
}): Mail => {
  const hi = greeting(opts.firstName);
  const amount = formatUsd(opts.amount);
  const method = payoutMethodLabel(opts.method);
  return {
    subject: payoutFailedSubject(opts.amount),
    text: signOff([
      hi,
      '',
      `We couldn't complete your ${amount} payout to ${method}. Check the number on Earnings and request again, or write hello@twen.app.`,
      '',
      opts.accountUrl,
    ]),
    html: htmlBlock(
      hi,
      `<p>We couldn't complete your <strong>${escapeHtml(amount)}</strong> payout to ${escapeHtml(method)}. Check the number on Earnings and request again, or write hello@twen.app.</p>
    ${link(opts.accountUrl, 'Update payout details')}`,
    ),
  };
};

export const hireMail = (opts: {
  firstName?: string | null;
  brandName: string;
  ratePerVideo?: number | null;
  messagesUrl: string;
}): Mail => {
  const hi = greeting(opts.firstName);
  const brand = opts.brandName.trim() || 'A brand';
  const rate = Number(opts.ratePerVideo) || 0;
  const rateLine = rate
    ? `${brand} wants to book you for a paid video at ${formatUsd(rate)}. Reply in Messages to confirm.`
    : `${brand} wants to book you. Reply in Messages to confirm.`;
  return {
    subject: hireEmailSubject(brand),
    text: signOff([hi, '', rateLine, '', opts.messagesUrl]),
    html: htmlBlock(
      hi,
      `<p>${escapeHtml(rateLine)}</p>
    ${link(opts.messagesUrl, 'Open Messages')}`,
    ),
  };
};
