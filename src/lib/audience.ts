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

/** Pricing defaults to the last marketing audience, else creators. */
export const defaultPricingAudience = (): Audience => getRememberedAudience() ?? 'creator';

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
    eyebrow: 'Creators · UGC · Models',
    headline: 'The easiest way\nto earn online',
    sub: 'Post a video, make UGC, or model a shoot. Get paid.',
    primaryCta: 'Start Earning',
    featuresEyebrow: 'Why Creators, UGC & Models',
    featuresHeadline: 'Create. Model. Get paid.',
    featuresSub: 'Content, UGC, and shoots — the campaign is funded before you start.',
    features: [
      { title: 'Paid for your work, not followers', description: 'Content earns on verified views. Models show a day rate for direct bookings. A new account gets the same shot as a big one.' },
      { title: 'Post, create, or shoot', description: 'Reels and TikToks on your own accounts, UGC for brand channels, or a booked shoot. Work the way you already do.' },
      { title: 'See the money before you start', description: 'Every campaign is funded in escrow. Rate, remaining budget, and deadline are shown upfront.' },
      { title: 'Cash out to your phone', description: 'Paid to EcoCash, M-Pesa, MTN MoMo, Airtel Money, and more — not a bank that takes weeks.' },
      { title: 'No gate. No agency.', description: 'No follower cutoff. No pitching brands one by one. Pick a live campaign or get booked directly.' },
    ],
    featureCard: { title: 'Start earning today', description: 'Create a free account, pick a funded campaign or set your day rate, and get paid for your work.' },
    stepsHeadline: "Three steps. That's it.",
    stepsSub: 'From first post — or first shoot — to mobile-money withdrawal. Nobody in the middle.',
    steps: [
      { number: '01', title: 'Pick a campaign', description: 'Rate, budget, and deadline shown before you accept.' },
      { number: '02', title: 'Post, create, or shoot', description: 'Follow the brief, deliver the work, and submit it.' },
      { number: '03', title: 'Get paid to mobile money', description: 'Verified views or booking payouts land in your wallet.' },
    ],
    ctaEyebrow: "Let's go",
    ctaHeadline: 'It really is that easy',
  },
  brand: {
    eyebrow: 'Content distribution across Africa',
    headline: 'Flood social media\nwith your content',
    sub: 'Real creators, UGC makers, and models bring your product to Instagram and TikTok',
    primaryCta: 'Fund a Campaign',
    featuresEyebrow: 'Why Brands',
    featuresHeadline: 'Distribution at scale',
    featuresSub: 'One brief. Creators, UGC creators, and models. Pay only for verified views.',
    features: [
      { title: 'Real people, real posts', description: 'Creators and models post your product on their own accounts. Their audience sees a person they trust, not a banner.' },
      { title: 'Flood the feed', description: 'One brief. Dozens of creators and models. Your app or product shows up across Instagram and TikTok at once.' },
      { title: 'Distribution you can buy', description: 'Set a budget and a rate per thousand views. Creators compete to spread your content.' },
      { title: 'Pay only for what lands', description: 'Verified views only. Escrowed budget. Unused escrow is returned when the campaign ends.' },
      { title: 'You keep control', description: 'Write the brief. Choose who applies. Platform moderators approve posts before they earn.' },
    ],
    featureCard: { title: 'Launch distribution', description: 'Fund a campaign and watch creators and models push your content live.' },
    stepsHeadline: 'Brief. Fund. Flood.',
    stepsSub: 'Fund once. Creators post. Unused escrow is returned when the campaign ends.',
    steps: [
      { number: '01', title: 'Write the brief', description: 'What to say, what to show, and who should apply.' },
      { number: '02', title: 'Fund the campaign', description: 'Creators see it and start posting.' },
      { number: '03', title: 'Watch it spread', description: 'Pay for verified views. Unused escrow is returned after the deadline.' },
    ],
    ctaEyebrow: "Let's go",
    ctaHeadline: 'Flood the feed. Pay for views.',
  },
};
