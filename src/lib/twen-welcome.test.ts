import { describe, expect, it } from 'vitest';
import {
  CREATOR_READY,
  isTwenConversation,
  pinTwenFirst,
  resolveSelectedChat,
  syntheticTwenMessages,
  twenWelcomeBodies,
} from './twen-welcome';
import type { Conversation } from '@/types/unignored';

const conv = (over: Partial<Conversation> & Pick<Conversation, 'id'>): Conversation => ({
  brand_id: 'u',
  creator_id: 'u',
  brand_name: 'Twen',
  creator_name: 'Twen',
  campaign_id: null,
  created_at: '2026-09-13T12:00:00',
  last_message_at: '2026-09-13T12:00:00',
  kind: 'direct',
  twen_stage: null,
  ...over,
});

describe('twen welcome', () => {
  it('greets the creator by first name and pays out immediately after the hold', () => {
    const creator = twenWelcomeBodies('creator', { first_name: 'Ada' }).join('\n');
    expect(creator).toMatch(/^Hi Ada\./);
    expect(creator).toMatch(/Welcome to Twen/);
    expect(creator).toMatch(/7 days/);
    expect(creator).toMatch(/pay out immediately/);
    expect(creator).toMatch(/payout number is on file/);
    expect(creator).not.toMatch(/withdraw from Earnings/);
    expect(creator).not.toMatch(/1–2 business days/);
    expect(creator).toMatch(/passport or national ID/i);

    const brand = twenWelcomeBodies('brand', { first_name: 'Ada' }).join('\n');
    expect(brand).toMatch(/^Hi Ada\./);
    expect(brand).toMatch(/escrow/);
    expect(brand).toMatch(/pay creators immediately/);
    expect(brand).not.toMatch(/1–2 business days/);
  });

  it('pins the Twen thread above other chats', () => {
    const rows = pinTwenFirst([
      conv({ id: 'a', kind: 'direct', last_message_at: '2026-09-13T14:00:00', creator_name: 'Ada' }),
      conv({ id: 'twen', kind: 'twen', last_message_at: '2026-09-13T10:00:00' }),
    ]);
    expect(isTwenConversation(rows[0])).toBe(true);
    expect(rows[1].id).toBe('a');
  });

  it('maps the synthetic Twen id onto a real conversation', () => {
    const real = conv({ id: 'uuid-twen', kind: 'twen' });
    const dm = conv({ id: 'dm', kind: 'direct', creator_name: 'Ada' });
    expect(resolveSelectedChat([real, dm], 'twen', true)).toBe('uuid-twen');
    expect(resolveSelectedChat([real, dm], 'dm', true)).toBe('dm');
    expect(resolveSelectedChat([real, dm], null, true)).toBe('uuid-twen');
    expect(resolveSelectedChat([real, dm], null, false)).toBeNull();
  });

  it('adds the you-are-set note once onboarding is complete', () => {
    const pending = syntheticTwenMessages('u', 'creator', false);
    expect(pending.some((m) => m.body === CREATOR_READY)).toBe(false);
    const done = syntheticTwenMessages('u', 'creator', true);
    expect(done.at(-1)?.body).toBe(CREATOR_READY);
  });
});
