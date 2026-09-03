import { Database } from '@/integrations/supabase/types';

export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type Earning = Database['public']['Tables']['earnings']['Row'];
export type Payout = Database['public']['Tables']['payouts']['Row'];
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

export const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'x'] as const;
export type PlatformId = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  youtube: 'YouTube Shorts',
  facebook: 'Facebook',
  x: 'X',
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
