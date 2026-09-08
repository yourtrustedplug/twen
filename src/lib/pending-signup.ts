import { rememberAudience, type Audience } from '@/lib/audience';

/** Role (and optional extras) applied only when a Privy user is created for the first time. */
export type PendingSignup = {
  role: Audience;
  fullName?: string;
  tiktokHandle?: string;
  companyName?: string;
};

const KEY = 'unignored_pending_signup';
const REDIRECT_KEY = 'unignored_auth_redirect';

let authRedirectConsumed = false;

export function parseRole(value: string | null | undefined): Audience | null {
  return value === 'brand' || value === 'creator' ? value : null;
}

/** Remember audience and stash role for the first profile insert. */
export function beginAuth(role: Audience) {
  rememberAudience(role);
  setPendingSignup({ role });
}

export function markAuthRedirect() {
  authRedirectConsumed = false;
  sessionStorage.setItem(REDIRECT_KEY, '1');
}

export function takeAuthRedirect() {
  if (authRedirectConsumed) return false;
  const raw = sessionStorage.getItem(REDIRECT_KEY);
  if (raw !== '1') return false;
  authRedirectConsumed = true;
  sessionStorage.removeItem(REDIRECT_KEY);
  return true;
}

export function setPendingSignup(data: PendingSignup) {
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function takePendingSignup(): PendingSignup | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
}

export function peekPendingSignup(): PendingSignup | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
}
