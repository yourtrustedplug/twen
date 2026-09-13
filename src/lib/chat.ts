import type { Message } from '@/types/unignored';

const GROUP_MS = 2 * 60 * 1000;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const dayDiff = (iso: string, now: Date) => {
  const that = startOfDay(new Date(iso));
  const today = startOfDay(now);
  return Math.round((today.getTime() - that.getTime()) / 86_400_000);
};

export const formatDayLabel = (iso: string, now = new Date()) => {
  const diff = dayDiff(iso, now);
  const d = new Date(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatListTime = (iso: string, now = new Date()) => {
  const diff = dayDiff(iso, now);
  const d = new Date(iso);
  if (diff === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
};

export const formatBubbleTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const closeInTime = (a: string, b: string) =>
  Math.abs(new Date(b).getTime() - new Date(a).getTime()) < GROUP_MS;

export type ChatItem =
  | { type: 'day'; id: string; label: string }
  | { type: 'msg'; message: Message; grouped: boolean; lastInGroup: boolean };

export const buildChatItems = (messages: Message[], now = new Date()): ChatItem[] => {
  const items: ChatItem[] = [];
  messages.forEach((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayKey(prev.created_at) !== dayKey(message.created_at);
    if (newDay) {
      items.push({ type: 'day', id: `day-${dayKey(message.created_at)}`, label: formatDayLabel(message.created_at, now) });
    }
    const grouped =
      Boolean(prev) &&
      !newDay &&
      prev.sender_id === message.sender_id &&
      closeInTime(prev.created_at, message.created_at);
    const nextNewDay = !next || dayKey(next.created_at) !== dayKey(message.created_at);
    const lastInGroup =
      !next ||
      nextNewDay ||
      next.sender_id !== message.sender_id ||
      !closeInTime(message.created_at, next.created_at);
    items.push({ type: 'msg', message, grouped, lastInGroup });
  });
  return items;
};

export const previewLine = (body: string, senderId: string, userId: string | undefined) =>
  `${senderId === userId ? 'You: ' : ''}${body}`;
