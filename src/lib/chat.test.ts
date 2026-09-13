import { describe, expect, it } from 'vitest';
import type { Message } from '@/types/unignored';
import { buildChatItems, formatDayLabel, formatListTime, previewLine } from './chat';

const now = new Date('2026-09-13T14:00:00');

const msg = (over: Partial<Message> & Pick<Message, 'id' | 'sender_id' | 'created_at'>): Message => ({
  body: 'hi',
  conversation_id: 'c1',
  from_twen: false,
  ...over,
});

describe('chat timestamps', () => {
  it('labels today, yesterday, and older days', () => {
    expect(formatDayLabel('2026-09-13T09:00:00', now)).toBe('Today');
    expect(formatDayLabel('2026-09-12T09:00:00', now)).toBe('Yesterday');
    expect(formatDayLabel('2026-09-10T09:00:00', now)).toBe('Thursday');
    expect(formatDayLabel('2026-08-01T09:00:00', now)).toBe('Aug 1');
    expect(formatDayLabel('2025-08-01T09:00:00', now)).toBe('Aug 1, 2025');
  });

  it('uses a short time in the conversation list for today', () => {
    expect(formatListTime('2026-09-13T09:05:00', now)).toMatch(/9:05/);
    expect(formatListTime('2026-09-12T09:05:00', now)).toBe('Yesterday');
  });
});

describe('buildChatItems', () => {
  it('inserts a day chip and groups close messages from the same sender', () => {
    const items = buildChatItems(
      [
        msg({ id: '1', sender_id: 'a', created_at: '2026-09-13T13:00:00', body: 'one' }),
        msg({ id: '2', sender_id: 'a', created_at: '2026-09-13T13:01:00', body: 'two' }),
        msg({ id: '3', sender_id: 'b', created_at: '2026-09-13T13:01:30', body: 'three' }),
      ],
      now,
    );
    expect(items[0]).toMatchObject({ type: 'day', label: 'Today' });
    expect(items[1]).toMatchObject({ type: 'msg', grouped: false, lastInGroup: false });
    expect(items[2]).toMatchObject({ type: 'msg', grouped: true, lastInGroup: true });
    expect(items[3]).toMatchObject({ type: 'msg', grouped: false, lastInGroup: true });
  });

  it('splits a new day even when the sender stays the same', () => {
    const items = buildChatItems(
      [
        msg({ id: '1', sender_id: 'a', created_at: '2026-09-12T23:59:00' }),
        msg({ id: '2', sender_id: 'a', created_at: '2026-09-13T00:01:00' }),
      ],
      now,
    );
    expect(items.filter((i) => i.type === 'day').map((i) => i.label)).toEqual(['Yesterday', 'Today']);
  });
});

describe('previewLine', () => {
  it('prefixes your own last message', () => {
    expect(previewLine('On it', 'me', 'me')).toBe('You: On it');
    expect(previewLine('On it', 'them', 'me')).toBe('On it');
  });
});
