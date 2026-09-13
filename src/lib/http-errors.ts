export const HTTP_ERROR_CODES = [400, 401, 403, 404, 408, 429, 500, 502, 503, 504] as const;
export type HttpErrorCode = (typeof HTTP_ERROR_CODES)[number];

export const SUPPORT_EMAIL = 'hello@twen.app';

export type HttpErrorKind = 'home-contact' | 'sign-in' | 'retry';

export type HttpErrorCopy = {
  code: HttpErrorCode;
  eyebrow: string;
  title: string;
  description: string;
  documentTitle: string;
  kind: HttpErrorKind;
  /** Description mentions SUPPORT_EMAIL and should render as a mailto. */
  support: boolean;
};

const COPY: Record<HttpErrorCode, Omit<HttpErrorCopy, 'code'>> = {
  400: {
    eyebrow: 'Bad request',
    title: "This brief doesn't parse.",
    description: "That request wasn't in a shape Twen can use. Check the link, then try again from home.",
    documentTitle: '400 · Bad request | Twen',
    kind: 'home-contact',
    support: false,
  },
  401: {
    eyebrow: 'Sign in',
    title: 'You need to be signed in.',
    description: "This page is for an account. Sign in and we'll take you through.",
    documentTitle: '401 · Sign in | Twen',
    kind: 'sign-in',
    support: false,
  },
  403: {
    eyebrow: 'No access',
    title: "This cut isn't for this account.",
    description: 'This page belongs to a different account or role.',
    documentTitle: '403 · No access | Twen',
    kind: 'home-contact',
    support: false,
  },
  404: {
    eyebrow: 'Page not found',
    title: 'This brief never made it to the feed.',
    description:
      "That URL isn't a campaign, a creator, or a brand page. It may have moved, or it never existed.",
    documentTitle: 'Page not found | Twen',
    kind: 'home-contact',
    support: false,
  },
  408: {
    eyebrow: 'Timed out',
    title: 'That take took too long.',
    description: 'The request stalled before it finished. Try again.',
    documentTitle: '408 · Timed out | Twen',
    kind: 'retry',
    support: false,
  },
  429: {
    eyebrow: 'Slow down',
    title: 'Too many takes in a row.',
    description: 'Wait a moment, then try again.',
    documentTitle: '429 · Slow down | Twen',
    kind: 'retry',
    support: false,
  },
  500: {
    eyebrow: 'Something went wrong',
    title: 'We dropped the frame.',
    description: `Refresh to try this page again. If it keeps happening, write ${SUPPORT_EMAIL}.`,
    documentTitle: 'Something went wrong | Twen',
    kind: 'retry',
    support: true,
  },
  502: {
    eyebrow: 'Upstream',
    title: "The feed behind Twen didn't answer.",
    description: `A partner service failed. Refresh in a minute. If it keeps happening, write ${SUPPORT_EMAIL}.`,
    documentTitle: '502 · Upstream | Twen',
    kind: 'retry',
    support: true,
  },
  503: {
    eyebrow: 'Unavailable',
    title: 'Twen is down for a moment.',
    description: `We're up again soon. Refresh, or write ${SUPPORT_EMAIL}.`,
    documentTitle: '503 · Unavailable | Twen',
    kind: 'retry',
    support: true,
  },
  504: {
    eyebrow: 'Timed out',
    title: "The feed didn't come back in time.",
    description: `Try again. If it keeps happening, write ${SUPPORT_EMAIL}.`,
    documentTitle: '504 · Timed out | Twen',
    kind: 'retry',
    support: true,
  },
};

export function isHttpErrorCode(value: number): value is HttpErrorCode {
  return (HTTP_ERROR_CODES as readonly number[]).includes(value);
}

/** `/401` → 401. Unknown three-digit paths (405, 418) are not catalog codes. */
export function httpErrorPath(pathname: string): HttpErrorCode | null {
  const match = pathname.match(/^\/(\d{3})\/?$/);
  if (!match) return null;
  const code = Number(match[1]);
  return isHttpErrorCode(code) ? code : null;
}

export function httpErrorCopy(code: HttpErrorCode): HttpErrorCopy {
  return { code, ...COPY[code] };
}
