import { normalizeHex } from '@/lib/brand-kit';

const SKIP = new Set(['a', 'an', 'and', 'co', 'for', 'inc', 'llc', 'ltd', 'of', 'pty', 'the']);

const PALETTE = [
  '#0A101D',
  '#C45C26',
  '#1F6B4A',
  '#3D4FA8',
  '#8B3A62',
  '#B45309',
  '#0F766E',
  '#6D28D9',
] as const;

const tokens = (name: string) =>
  name
    .trim()
    .split(/[\s\-_/]+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((part) => part && !SKIP.has(part.toLowerCase()));

/** One letter for a single word, two for a multi-word name. */
export const brandInitials = (name: string) => {
  const words = tokens(name);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const hash = (seed: string) => {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return n;
};

const inkOn = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#0A101D' : '#FFFFFF';
};

/** Brand primary when set, otherwise a stable color from the account. */
export const brandMarkTone = (seed: string, primaryHex?: string | null) => {
  const bg = normalizeHex(primaryHex) || PALETTE[hash(seed || 'brand') % PALETTE.length];
  return { bg, fg: inkOn(bg) };
};
