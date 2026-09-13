export const SOCIAL_RETURN_KEY = 'twen-social-return';

export const isSafeCreatorReturnPath = (path: string) =>
  path.startsWith('/creator/') && !path.startsWith('//') && !path.includes('://');

export const stashSocialReturnPath = (path: string) => {
  if (typeof sessionStorage === 'undefined') return;
  if (!isSafeCreatorReturnPath(path)) return;
  sessionStorage.setItem(SOCIAL_RETURN_KEY, path);
};

export const takeSocialReturnPath = (): string | null => {
  if (typeof sessionStorage === 'undefined') return null;
  const path = sessionStorage.getItem(SOCIAL_RETURN_KEY);
  sessionStorage.removeItem(SOCIAL_RETURN_KEY);
  if (!path || !isSafeCreatorReturnPath(path)) return null;
  return path;
};
