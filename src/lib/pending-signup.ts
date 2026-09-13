import { rememberAudience, type Audience } from '@/lib/audience';

/** Role (and optional extras) applied only when a Privy user is created for the first time. */
export type PendingSignup = {
  role: Audience;
  fullName?: string;
  tiktokHandle?: string;
  companyName?: string;
};

/** Draft Book me message, held until a brand account exists to send it. */
export type PendingBook = {
  creatorId: string;
  creatorName?: string;
  ratePerVideo?: number;
  body?: string;
};

export const BOOK_NOTE_MAX = 1500;

const KEY = 'unignored_pending_signup';
const REDIRECT_KEY = 'unignored_auth_redirect';
const BOOK_KEY = 'twen_pending_book';

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

export function parsePendingBook(raw: unknown): PendingBook | null {
  let value: unknown = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        return null;
      }
    } else {
      return { creatorId: trimmed };
    }
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const creatorId = typeof row.creatorId === 'string' ? row.creatorId.trim() : '';
  if (!creatorId) return null;
  const body = typeof row.body === 'string' ? row.body.trim().slice(0, BOOK_NOTE_MAX) : '';
  const creatorName = typeof row.creatorName === 'string' ? row.creatorName.trim().slice(0, 80) : '';
  const ratePerVideo = Number(row.ratePerVideo);
  return {
    creatorId,
    ...(creatorName ? { creatorName } : {}),
    ...(Number.isFinite(ratePerVideo) && ratePerVideo > 0 ? { ratePerVideo } : {}),
    ...(body ? { body } : {}),
  };
}

export function pendingBookFromSearch(search: { get(name: string): string | null }): PendingBook | null {
  const creatorId = (search.get('book') || '').trim();
  if (!creatorId) return null;
  return parsePendingBook({
    creatorId,
    body: search.get('note') || '',
    creatorName: search.get('who') || '',
    ratePerVideo: search.get('rate') || '',
  });
}

export function pendingBookSearch(book: PendingBook): string {
  const params = new URLSearchParams();
  params.set('role', 'brand');
  params.set('book', book.creatorId);
  if (book.body) params.set('note', book.body.slice(0, BOOK_NOTE_MAX));
  if (book.creatorName) params.set('who', book.creatorName.slice(0, 80));
  if (book.ratePerVideo) params.set('rate', String(book.ratePerVideo));
  return params.toString();
}

export function mergePendingBook(base: PendingBook | null, extra: PendingBook | null): PendingBook | null {
  if (!base && !extra) return null;
  const creatorId = extra?.creatorId || base?.creatorId || '';
  if (!creatorId) return null;
  return parsePendingBook({
    creatorId,
    creatorName: extra?.creatorName || base?.creatorName || '',
    ratePerVideo: extra?.ratePerVideo || base?.ratePerVideo || 0,
    body: extra?.body || base?.body || '',
  });
}

export function setPendingBook(input: string | PendingBook) {
  const parsed = parsePendingBook(typeof input === 'string' ? input : input);
  if (!parsed) {
    sessionStorage.removeItem(BOOK_KEY);
    return;
  }
  sessionStorage.setItem(BOOK_KEY, JSON.stringify(parsed));
}

export function peekPendingBook(): PendingBook | null {
  return parsePendingBook(sessionStorage.getItem(BOOK_KEY));
}

export function takePendingBook(): PendingBook | null {
  const book = peekPendingBook();
  sessionStorage.removeItem(BOOK_KEY);
  return book;
}
