export type NotFoundRole = 'creator' | 'brand' | 'moderator' | 'admin' | null | undefined;

export type NotFoundHome = {
  path: string;
  label: string;
};

/** Where the 404 primary button should send this visitor. */
export function notFoundHome(signedIn: boolean, role?: NotFoundRole): NotFoundHome {
  if (!signedIn) return { path: '/', label: 'Go home' };
  if (role === 'brand') return { path: '/brand', label: 'Back to dashboard' };
  if (role === 'admin' || role === 'moderator') return { path: '/admin', label: 'Back to admin' };
  return { path: '/creator', label: 'Back to campaigns' };
}

/** Pathname shown on the 404 poster. Truncates so a garbage URL cannot blow the layout. */
export function formatMissingPath(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path.length <= 56) return path;
  return `${path.slice(0, 28)}…${path.slice(-20)}`;
}

export function isAbsoluteHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}
