import { Database } from '@/integrations/supabase/types';

export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type Earning = Database['public']['Tables']['earnings']['Row'];
export type Payout = Database['public']['Tables']['payouts']['Row'];
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
