import { Database } from '@/integrations/supabase/types';

export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type Earning = Database['public']['Tables']['earnings']['Row'];
export type Payout = Database['public']['Tables']['payouts']['Row'];
export type BrandRefund = Database['public']['Tables']['brand_refunds']['Row'];
export type ContactMessage = Database['public']['Tables']['contact_messages']['Row'];
export type WithdrawalAccount = Database['public']['Tables']['withdrawal_accounts']['Row'];
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

/** One brand requirement a creator must satisfy. */
export interface ChecklistItem {
  id: string;
  label: string;
}

/** A creator's self-declared result for a requirement, visible to the brand. */
export interface ChecklistResult extends ChecklistItem {
  met: boolean;
}

export const PLATFORMS = ['tiktok', 'instagram'] as const;
export type PlatformId = (typeof PLATFORMS)[number];

/** What a creator does. Multi-select, so one account can be several types. */
export const DISCIPLINES = ['creator', 'ugc', 'model'] as const;
export type DisciplineId = (typeof DISCIPLINES)[number];

export const DISCIPLINE_LABELS: Record<string, string> = {
  creator: 'Content creator',
  ugc: 'UGC creator',
  model: 'Model',
};

/** Compact labels for cards and chips. */
export const DISCIPLINE_CHIP_LABELS: Record<string, string> = {
  creator: 'Creator',
  ugc: 'UGC',
  model: 'Model',
};

/** Plural labels for filters and campaign audiences. */
export const DISCIPLINE_PLURAL_LABELS: Record<string, string> = {
  creator: 'Content creators',
  ugc: 'UGC creators',
  model: 'Models',
};

export const parseDisciplines = (value: unknown): DisciplineId[] => {
  const list = Array.isArray(value) ? value : [];
  const picked = list.filter((v): v is DisciplineId =>
    (DISCIPLINES as readonly string[]).includes(v as string),
  );
  return picked.length > 0 ? picked : ['creator'];
};

/** Platforms a campaign can target (same as creator platforms). */
export const CAMPAIGN_PLATFORMS = PLATFORMS;
export type CampaignPlatformId = PlatformId;

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  youtube: 'YouTube Shorts',
  facebook: 'Facebook',
  x: 'X',
};

export const NICHES = [
  'beauty',
  'fashion',
  'food',
  'fitness',
  'tech',
  'gaming',
  'finance',
  'lifestyle',
  'comedy',
  'education',
  'travel',
  'music',
  'parenting',
  'sports',
  'other',
] as const;

export type NicheId = (typeof NICHES)[number];

export const NICHE_LABELS: Record<string, string> = {
  beauty: 'Beauty',
  fashion: 'Fashion',
  food: 'Food',
  fitness: 'Fitness',
  tech: 'Tech',
  gaming: 'Gaming',
  finance: 'Finance',
  lifestyle: 'Lifestyle',
  comedy: 'Comedy',
  education: 'Education',
  travel: 'Travel',
  music: 'Music',
  parenting: 'Parenting',
  sports: 'Sports',
  other: 'Other',
};

export const parseChecklist = (value: unknown): ChecklistItem[] =>
  Array.isArray(value)
    ? (value as ChecklistItem[]).filter((i) => i && typeof i.label === 'string')
    : [];

export const parseChecklistResults = (value: unknown): ChecklistResult[] =>
  Array.isArray(value)
    ? (value as ChecklistResult[]).filter((i) => i && typeof i.label === 'string')
    : [];

export const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as unknown[]).filter((v): v is string => typeof v === 'string') : [];

/** Campaign audience. Missing/empty means every type can apply (legacy campaigns). */
export const parseTargetDisciplines = (value: unknown): DisciplineId[] => {
  const picked = parseStringArray(value).filter((v): v is DisciplineId =>
    (DISCIPLINES as readonly string[]).includes(v),
  );
  return picked.length > 0 ? picked : [...DISCIPLINES];
};

/** True when a creator's profile type overlaps the campaign audience. */
export const creatorMatchesDisciplines = (creator: unknown, targets: unknown): boolean => {
  const audience = parseTargetDisciplines(targets);
  const mine = parseDisciplines(creator);
  return mine.some((discipline) => audience.includes(discipline));
};

/** Human audience line, or null when a campaign is open to every type. */
export const campaignAudienceLabel = (targets: unknown): string | null => {
  const audience = parseTargetDisciplines(targets);
  if (audience.length === DISCIPLINES.length) return null;
  return audience.map((discipline) => DISCIPLINE_PLURAL_LABELS[discipline] ?? discipline).join(' · ');
};

/** Turns a newline / bullet list string into clean items. */
export const parseListText = (value: string | null | undefined): string[] =>
  (value ?? '')
    .split(/\n|•|;/)
    .map((s) => s.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

export const joinListText = (items: string[]) => items.map((s) => s.trim()).filter(Boolean).join('\n');
