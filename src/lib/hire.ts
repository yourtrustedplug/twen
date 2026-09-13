import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/format';
import { goToAppPath } from '@/lib/hosts';
import { BOOK_NOTE_MAX, peekPendingBook, takePendingBook } from '@/lib/pending-signup';

export function defaultHireMessage(creatorName: string, ratePerVideo?: number): string {
  const name = creatorName.trim() || 'you';
  const rate = Number(ratePerVideo) || 0;
  return rate
    ? `Hi ${name}, we'd like to book you for a paid video at ${formatMoney(rate)}. Are you available?`
    : `Hi ${name}, we'd like to book you. Are you available?`;
}

export function hireMessage(input: {
  body?: string;
  hire?: boolean;
  creatorName: string;
  ratePerVideo?: number;
}): string {
  const custom = (input.body ?? '').trim().slice(0, BOOK_NOTE_MAX);
  if (custom) return custom;
  if (input.hire) return defaultHireMessage(input.creatorName, input.ratePerVideo);
  return '';
}

/** Open (or reuse) the brand↔creator thread, optionally sending a hire line. */
export async function startBrandCreatorChat(input: {
  brandId: string;
  creatorId: string;
  brandName: string;
  creatorName: string;
  ratePerVideo?: number;
  hire?: boolean;
  body?: string;
}): Promise<{ conversationId: string } | { error: string }> {
  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      {
        brand_id: input.brandId,
        creator_id: input.creatorId,
        brand_name: input.brandName,
        creator_name: input.creatorName,
      },
      { onConflict: 'brand_id,creator_id' },
    )
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message || 'Could not open the chat' };
  }

  const conversationId = (data as { id: string }).id;
  const body = hireMessage(input);
  if (body) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: input.brandId,
      body,
    });
    void supabase.functions.invoke('notify-hire', {
      body: { conversation_id: conversationId },
    });
  }

  return { conversationId };
}

type PendingBookResult = { conversationId: string } | { error: string } | { needsPlus: true } | null;

let delivering: Promise<PendingBookResult> | null = null;

/** Send a stashed Book me note once a brand account exists. Shared so SignIn and AuthRedirect don't double-send. */
export function completePendingBook(input: {
  brandId: string;
  brandName: string;
  isPro: boolean;
}): Promise<PendingBookResult> {
  if (!delivering) {
    delivering = (async () => {
      const pending = peekPendingBook();
      if (!pending) return null;
      if (!input.isPro) return { needsPlus: true as const };
      takePendingBook();
      return startBrandCreatorChat({
        brandId: input.brandId,
        creatorId: pending.creatorId,
        brandName: input.brandName,
        creatorName: pending.creatorName || 'Creator',
        ratePerVideo: pending.ratePerVideo,
        hire: !pending.body,
        body: pending.body,
      });
    })().finally(() => {
      delivering = null;
    });
  }
  return delivering;
}

export async function deliverPendingBookAndGo(input: {
  brandId: string;
  brandName: string;
  isPro: boolean;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}): Promise<'sent' | 'needsPlus' | false> {
  const result = await completePendingBook({
    brandId: input.brandId,
    brandName: input.brandName,
    isPro: input.isPro,
  });
  if (!result) return false;
  if ('needsPlus' in result) return 'needsPlus';
  const path = 'conversationId' in result ? `/messages?c=${result.conversationId}` : '/messages';
  await goToAppPath('brand', path, input.navigate);
  return 'sent';
}
