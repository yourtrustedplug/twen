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

/** Prefer subdomain homes in prod; path-based on plain localhost. */
export { audienceHref } from '@/lib/hosts';

interface AudienceCopy {
  eyebrow?: string;
  headline: string;
  sub: string;
  primaryCta: string;
  featuresEyebrow: string;
  featuresHeadline: string;
  featuresSub: string;
  features: { title: string; description: string }[];
  featureCard: { title: string; description: string };
  stepsHeadline: string;
  stepsSub: string;
  steps: { number: string; title: string; description: string }[];
  ctaEyebrow: string;
  ctaHeadline: string;
}

export const audienceCopy: Record<Audience, AudienceCopy> = {
  creator: {
    eyebrow: "Let's go",
    headline: 'The easiest way\nto earn online',
    sub: 'Post a video. Get paid. That’s it.',
    primaryCta: 'Start Earning',
    featuresEyebrow: 'Why Creators',
    featuresHeadline: 'Post. Get paid. Cash out.',
    featuresSub: 'You keep what you earn. The campaign is funded before you shoot.',
    features: [
      { title: 'Paid for views, not followers', description: 'You earn on verified views. A new account gets the same rate as a big one.' },
      { title: 'Post where you already are', description: 'Reels and TikToks on your own accounts. Follow the brief, submit the link, done.' },
      { title: 'See the money before you film', description: 'Every campaign is funded in escrow. Rate, remaining budget, and deadline are shown upfront.' },
      { title: 'Cash out to your phone', description: 'Withdraw to EcoCash, MoMo, Airtel Money, or M-Pesa — not a bank that takes weeks.' },
      { title: 'No gate. No agency.', description: 'No follower cutoff. No pitching brands one by one. Pick a live campaign and post.' },
    ],
    featureCard: { title: 'Start earning today', description: 'Create a free account, pick a funded campaign, and get paid for posting.' },
    stepsHeadline: "Three steps. That's it.",
    stepsSub: 'From first post to mobile-money withdrawal — nobody in the middle.',
    steps: [
      { number: '01', title: 'Pick a campaign', description: 'Rate, budget, and deadline shown before you accept.' },
      { number: '02', title: 'Post on IG or TikTok', description: 'Follow the brief, publish, submit your link.' },
      { number: '03', title: 'Withdraw to mobile money', description: 'Verified views pay out to your wallet.' },
    ],
    ctaEyebrow: "Let's go",
    ctaHeadline: 'It really is that easy',
  },
  brand: {
    eyebrow: 'The largest content distribution network in Africa',
    headline: 'Flood social media\nwith your content',
    sub: 'Real people distribute your content on Instagram and TikTok',
    primaryCta: 'Fund a Campaign',
    featuresEyebrow: 'Why Brands',
    featuresHeadline: 'Distribution at scale',
    featuresSub: 'One brief. Dozens of creators. Pay only for verified views.',
    features: [
      { title: 'Real people, real posts', description: 'Creators post your product on their own accounts. Their audience sees a person they trust, not a banner.' },
      { title: 'Flood the feed', description: 'One brief. Dozens of creators. Your app or product shows up across Instagram and TikTok at once.' },
      { title: 'Distribution you can buy', description: 'Set a budget and a rate per thousand views. Creators compete to spread your content.' },
      { title: 'Pay only for what lands', description: 'Verified views only. Escrowed budget. Unspent money comes back.' },
      { title: 'You keep control', description: 'Write the brief. Platform moderators approve posts before they earn.' },
    ],
    featureCard: { title: 'Launch distribution', description: 'Fund a campaign and watch creators push your content live.' },
    stepsHeadline: 'Brief. Fund. Flood.',
    stepsSub: 'Fund once. Creators post. Unspent budget comes back.',
    steps: [
      { number: '01', title: 'Write the brief', description: 'What to say, what to show, what to avoid.' },
      { number: '02', title: 'Fund the campaign', description: 'Creators see it and start posting.' },
      { number: '03', title: 'Watch it spread', description: 'Pay for verified views. Refund the rest.' },
    ],
    ctaEyebrow: "Let's go",
    ctaHeadline: 'Flood the feed. Pay for views.',
  },
};
