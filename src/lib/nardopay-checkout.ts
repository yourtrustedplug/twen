import { planAmountForRole } from '@/lib/plan';

export const PLAN_CHECKOUT_CACHE_PREFIX = 'twen.planCheckout.';

export type CachedPlanCheckout = {
  url: string;
  amount: number;
  role: string;
};

export function amountsMatch(left: unknown, right: unknown) {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.01;
}

export function planCheckoutCacheKey(userId: string) {
  return `${PLAN_CHECKOUT_CACHE_PREFIX}${userId}`;
}

export function readPlanCheckoutCache(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  userId: string,
): CachedPlanCheckout | null {
  if (!storage || !userId) return null;
  try {
    const raw = storage.getItem(planCheckoutCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedPlanCheckout>;
    if (typeof parsed.url !== 'string' || !parsed.url) return null;
    if (typeof parsed.amount !== 'number' || !Number.isFinite(parsed.amount)) return null;
    if (typeof parsed.role !== 'string' || !parsed.role) return null;
    return { url: parsed.url, amount: parsed.amount, role: parsed.role };
  } catch {
    return null;
  }
}

export function writePlanCheckoutCache(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  userId: string,
  value: CachedPlanCheckout,
) {
  if (!storage || !userId) return;
  try {
    storage.setItem(planCheckoutCacheKey(userId), JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
}

export function cachedPlanCheckoutUrl(
  cached: CachedPlanCheckout | null,
  role: string | null | undefined,
  amount = planAmountForRole(role),
) {
  if (!cached || !role) return null;
  if (cached.role !== role) return null;
  if (!amountsMatch(cached.amount, amount)) return null;
  return cached.url;
}

export function knownPlanCheckoutUrl(
  userId: string,
  role: string | null | undefined,
  profile?: { nardopay_checkout_url?: string | null; nardopay_checkout_amount?: unknown } | null,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined = typeof sessionStorage === 'undefined' ? null : sessionStorage,
) {
  if (!userId || !role) return null;
  const amount = planAmountForRole(role);
  const fromSession = cachedPlanCheckoutUrl(readPlanCheckoutCache(storage, userId), role, amount);
  if (fromSession) return fromSession;
  const url = profile?.nardopay_checkout_url?.trim();
  if (!url || !amountsMatch(profile?.nardopay_checkout_amount, amount)) return null;
  writePlanCheckoutCache(storage, userId, { url, amount, role });
  return url;
}

export function campaignCheckoutUrlIfReusable(
  campaign: {
    nardopay_checkout_url?: string | null;
    nardopay_checkout_amount?: number | null;
    budget?: number | null;
  } | null | undefined,
) {
  const url = campaign?.nardopay_checkout_url?.trim();
  if (!url) return null;
  if (!amountsMatch(campaign?.nardopay_checkout_amount, campaign?.budget)) return null;
  return url;
}
