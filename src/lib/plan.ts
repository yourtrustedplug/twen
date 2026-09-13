/** Twen Plus unlocks creator browse, messaging, and bookings. */
export const isPro = (profile: { plan?: string | null } | null | undefined) =>
  profile?.plan === 'pro';

/** Keep defaults in sync with supabase/functions/_shared/plan-amounts.ts */
export const BRAND_PLUS_MONTHLY_USD = 49;
export const CREATOR_PRO_MONTHLY_USD = 9;

export const formatUsd = (amount: number) => `$${amount}`;

export const planAmountForRole = (role: string | null | undefined) =>
  role === 'creator' ? CREATOR_PRO_MONTHLY_USD : BRAND_PLUS_MONTHLY_USD;

export const paidPlanName = (role: string | null | undefined) =>
  role === 'creator' ? 'Creator Pro' : 'Twen Plus';

/** After a Book me draft, send a free brand here so NardoPay can start. */
export const BRAND_PLUS_UPGRADE_PATH = '/brand/profile?tab=plan&upgrade=1';

export const CREATOR_FREE_PERKS = [
  'Join open campaigns and post',
  'Keep every dollar you earn',
  'Withdraw to EcoCash, MoMo, Airtel Money, or M-Pesa',
  'Withdraw after a 7-day check',
  'No commission',
] as const;

export const CREATOR_PRO_PERKS = [
  'Connect more than one account',
  'Set your price per video',
  'Get paid as soon as a campaign ends',
  'Appear when brands search',
  'Get booking requests from brands',
] as const;

export const BRAND_FREE_PERKS = [
  'Fund a campaign and pay per 1,000 views',
  'Any creator can join',
  'Unused budget comes back',
  'No commission. No per-campaign fee.',
] as const;

export const BRAND_PLUS_PERKS = [
  'Search creators and hire specific people',
  'Message them and agree a rate',
  'Pay per click or per sale, not only views',
  'See which posts brought customers',
  'Hide creators who already worked with competitors',
] as const;

export const upcomingChargeDate = (renewsAt: string | null | undefined, now = new Date()): Date | null => {
  if (!renewsAt) return null;
  const next = new Date(renewsAt);
  if (Number.isNaN(next.getTime())) return null;
  while (next.getTime() <= now.getTime()) {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
};

export const nextPlanCharge = (input: {
  isPro: boolean;
  pending?: boolean;
  renewsAt?: string | null;
  amount: number;
  now?: Date;
}) => {
  if (input.isPro) {
    return {
      amount: input.amount,
      date: upcomingChargeDate(input.renewsAt, input.now),
      pending: false,
    };
  }
  if (input.pending) {
    return { amount: input.amount, date: null, pending: true };
  }
  return { amount: 0, date: null, pending: false };
};
