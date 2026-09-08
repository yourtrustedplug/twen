export const joinName = (first: string, last: string) =>
  [first, last].map((s) => s.trim()).filter(Boolean).join(' ') || null;

export const splitName = (full: string | null | undefined): { first: string; last: string } => {
  const trimmed = (full ?? '').trim();
  if (!trimmed) return { first: '', last: '' };
  const space = trimmed.indexOf(' ');
  if (space < 0) return { first: trimmed, last: '' };
  return { first: trimmed.slice(0, space), last: trimmed.slice(space + 1).trim() };
};
