import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Conversation } from '@/types/unignored';
import { cn } from '@/lib/utils';
import { formatListTime, previewLine } from '@/lib/chat';
import { isTwenConversation } from '@/lib/twen-welcome';
import ChatAvatar from './ChatAvatar';

export type ChatPreview = { body: string; senderId: string; fromTwen?: boolean };

const ConversationList = ({
  conversations,
  activeId,
  userId,
  nameOf,
  avatarOf,
  markOf,
  colorOf,
  seedOf,
  previewOf,
  onSelect,
}: {
  conversations: Conversation[];
  activeId: string | null;
  userId?: string;
  nameOf: (c: Conversation) => string;
  avatarOf: (c: Conversation) => string | null | undefined;
  markOf?: (c: Conversation) => boolean;
  colorOf?: (c: Conversation) => string | null | undefined;
  seedOf?: (c: Conversation) => string | null | undefined;
  previewOf: (id: string) => ChatPreview | undefined;
  onSelect: (id: string) => void;
}) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((c) => nameOf(c).toLowerCase().includes(needle));
  }, [conversations, q, nameOf]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="px-4 pt-3 pb-2 shrink-0">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8e93] pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full h-9 rounded-full bg-[#f2f2f7] pl-9 pr-3 text-sm placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0A101D]/10"
          />
        </label>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center px-6 py-10">
            {conversations.length === 0 ? 'No chats yet.' : 'No chats match that name.'}
          </p>
        ) : (
          filtered.map((c) => {
            const name = nameOf(c);
            const preview = previewOf(c.id);
            const selected = c.id === activeId;
            const official = isTwenConversation(c);
            const previewSender = preview?.fromTwen ? 'twen' : preview?.senderId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  selected ? 'bg-[#f2f2f7]' : 'hover:bg-[#f7f7f8]',
                )}
              >
                <ChatAvatar
                  name={name}
                  avatarUrl={official ? null : avatarOf(c)}
                  official={official}
                  mark={!official && markOf?.(c)}
                  color={colorOf?.(c)}
                  seed={seedOf?.(c) ?? undefined}
                  className="h-12 w-12 text-base shrink-0"
                />
                <span className="min-w-0 flex-1 border-b border-[#f1f1f1] pb-3">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-[15px] text-[#0A101D] truncate flex items-center gap-1.5">
                      {name}
                      {official ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">Official</span>
                      ) : null}
                    </span>
                    <span className="text-[11px] text-[#8e8e93] shrink-0 tabular-nums">
                      {formatListTime(c.last_message_at)}
                    </span>
                  </span>
                  <span className="block text-[13px] text-[#8e8e93] truncate mt-0.5">
                    {preview ? previewLine(preview.body, previewSender ?? '', userId) : 'No messages yet'}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
