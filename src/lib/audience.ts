/**
 * Two-audience marketing. Visitors pick "creator" or "brand" at the gate on `/`
 * and every marketing section reads its copy from here.
 */
export type Audience = 'creator' | 'brand';

const STORAGE_KEY = 'unignored.audience';

export const rememberAudience = (audience: Audience) => {
  try {
    localStorage.setItem(STORAGE_KEY, audience);
  } catch {
    /* storage unavailable — choice is not essential */
  }
};

export const getRememberedAudience = (): Audience | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'creator' || value === 'brand' ? value : null;
  } catch {
    return null;
  }
};

export const audiencePath = (audience: Audience) =>
  audience === 'brand' ? '/brands' : '/creators';

interface AudienceCopy {
  eyebrow: string;
  headline: string;
  sub: string;
  primaryCta: string;
  secondaryCta: { label: string; href: string };
  featuresEyebrow: string;
  featuresHeadline: string;
  features: { title: string; description: string }[];
  featureCard: { title: string; description: string };
  stepsHeadline: string;
  steps: { number: string; title: string; description: string }[];
  other: { label: string; audience: Audience };
}

export const audienceCopy: Record<Audience, AudienceCopy> = {
  creator: {
    eyebrow: 'For Creators',
    headline: 'Get Paid Per View',
    sub: 'Post to your own TikTok. Withdraw to MoMo or Airtel.',
    primaryCta: 'Start Earning',
    secondaryCta: { label: 'See Campaigns', href: '/pricing' },
    featuresEyebrow: 'Why Creators Stay',
    featuresHeadline: 'Views, Not Followers',
    features: [
      { title: 'Money Already There', description: 'Campaigns are funded before you see them.' },
      { title: 'No Follower Minimum', description: 'A new account earns the same rate.' },
      { title: 'Your Own Account', description: 'Your TikTok, your audience.' },
      { title: 'Mobile Money', description: 'MoMo or Airtel. Same day.' },
      { title: 'Live Budget', description: 'See what is left before you film.' },
    ],
    featureCard: { title: 'Start Earning', description: 'Pick a funded campaign and post today.' },
    stepsHeadline: "Three Steps. That's It.",
    steps: [
      { number: '01', title: 'Pick a Campaign', description: 'Rate, budget and deadline upfront.' },
      { number: '02', title: 'Post to Your TikTok', description: 'Follow the brief, submit the link.' },
      { number: '03', title: 'Withdraw', description: 'Verified views to mobile money.' },
    ],
    other: { label: "I'm a brand", audience: 'brand' },
  },
  brand: {
    eyebrow: 'For Brands',
    headline: 'Pay Per Real View',
    sub: 'Dozens of local creators. One brief. Escrowed budget.',
    primaryCta: 'Fund a Campaign',
    secondaryCta: { label: 'See Rates', href: '/pricing' },
    featuresEyebrow: 'Why Brands Fund Here',
    featuresHeadline: 'Reach You Can Verify',
    features: [
      { title: 'Verified Views Only', description: 'Checked against the platform before billing.' },
      { title: 'Escrow, Not Invoices', description: 'You never spend past what you funded.' },
      { title: 'One Brief, Many Videos', description: 'Dozens of creators, many audiences.' },
      { title: 'Approve or Reject', description: 'Off-brief work never earns.' },
      { title: 'Unspent Comes Back', description: 'Refunded when a campaign closes.' },
    ],
    featureCard: { title: 'Launch a Campaign', description: 'Set a budget and rate in minutes.' },
    stepsHeadline: 'Brief. Fund. Track.',
    steps: [
      { number: '01', title: 'Write the Brief', description: 'Budget, rate per 1k views, deadline.' },
      { number: '02', title: 'Fund Escrow', description: 'Campaign goes live to creators.' },
      { number: '03', title: 'Pay for Views', description: 'Approve work, refund the rest.' },
    ],
    other: { label: "I'm a creator", audience: 'creator' },
  },
};
