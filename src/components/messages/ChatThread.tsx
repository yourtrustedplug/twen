import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { ArrowUp, ChevronLeft } from 'lucide-react';
import type { Message } from '@/types/unignored';
import { cn } from '@/lib/utils';
import { buildChatItems, formatBubbleTime } from '@/lib/chat';
import { isTwenMessage } from '@/lib/twen-welcome';
import ChatAvatar from './ChatAvatar';

const ChatThread = ({
  name,
  avatarUrl,
  official,
  mark,
  color,
  seed,
  subtitle,
  messages,
  userId,
  draft,
  sending,
  emptyHint,
  readOnly,
  readOnlyHint,
  banner,
  onDraft,
  onSend,
  onBack,
}: {
  name: string;
  avatarUrl?: string | null;
  official?: boolean;
  mark?: boolean;
  color?: string | null;
  seed?: string;
  subtitle?: string;
  messages: Message[];
  userId?: string;
  draft: string;
  sending: boolean;
  emptyHint: string;
  readOnly?: boolean;
  readOnlyHint?: ReactNode;
  banner?: ReactNode;
  onDraft: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const items = useMemo(() => buildChatItems(messages), [messages]);
  const canSend = !readOnly && Boolean(draft.trim()) && !sending;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, banner]);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 h-14 px-2 md:px-4 flex items-center gap-1 border-b border-[#ebebeb] bg-white/90 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chats"
          className="lg:hidden h-11 w-11 rounded-full flex items-center justify-center text-[#0A101D] hover:bg-[#f4f4f4]"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </button>
        <ChatAvatar
          name={name}
          avatarUrl={avatarUrl}
          official={official}
          mark={mark}
          color={color}
          seed={seed}
          className="h-9 w-9 text-sm"
        />
        <div className="min-w-0 px-2">
          <p className="font-semibold text-[15px] truncate leading-tight">{name}</p>
          {subtitle ? <p className="text-[11px] text-[#8e8e93] truncate">{subtitle}</p> : null}
        </div>
      </header>

      <div ref={scroller} className="chat-wallpaper flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 md:px-5 py-4">
        {banner}
        {messages.length === 0 ? (
          <p className="text-sm text-[#8e8e93] text-center mt-16 px-6">{emptyHint}</p>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => {
              if (item.type === 'day') {
                return (
                  <div key={item.id} className="self-center my-3">
                    <span className="inline-block text-[11px] font-semibold text-[#6d6d72] bg-white/75 backdrop-blur px-3 py-1 rounded-full shadow-[0_1px_1px_rgba(10,16,29,0.06)]">
                      {item.label}
                    </span>
                  </div>
                );
              }
              const mine = !isTwenMessage(item.message) && item.message.sender_id === userId;
              return (
                <div
                  key={item.message.id}
                  className={cn(
                    'flex flex-col max-w-[78%] md:max-w-[68%]',
                    mine ? 'self-end items-end' : 'self-start items-start',
                    item.grouped ? 'mt-0.5' : 'mt-2.5',
                  )}
                >
                  <div
                    className={cn(
                      'relative px-[14px] py-[8px] text-[15px] leading-snug break-words whitespace-pre-wrap',
                      mine ? 'bg-[#0A101D] text-white' : 'bg-white text-[#0A101D] shadow-[0_1px_0.5px_rgba(10,16,29,0.08)]',
                      mine
                        ? item.lastInGroup
                          ? 'rounded-[18px] rounded-br-[4px]'
                          : 'rounded-[18px] rounded-tr-[6px] rounded-br-[6px]'
                        : item.lastInGroup
                          ? 'rounded-[18px] rounded-bl-[4px]'
                          : 'rounded-[18px] rounded-tl-[6px] rounded-bl-[6px]',
                      item.grouped && mine && 'rounded-tr-[6px]',
                      item.grouped && !mine && 'rounded-tl-[6px]',
                    )}
                  >
                    {item.message.body}
                  </div>
                  {item.lastInGroup && (
                    <span className="text-[11px] text-[#8e8e93] mt-1 px-1.5 tabular-nums">
                      {formatBubbleTime(item.message.created_at)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {readOnly ? (
        <div className="shrink-0 px-4 pt-2 pb-[max(0.7rem,env(safe-area-inset-bottom))] bg-[#f6f6f6]/95 backdrop-blur border-t border-[#ebebeb] text-center">
          {readOnlyHint ?? <p className="text-[13px] text-[#8e8e93]">This chat is from Twen.</p>}
        </div>
      ) : (
        <form
          className="shrink-0 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] bg-[#f6f6f6]/95 backdrop-blur border-t border-[#ebebeb] flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) onSend();
          }}
        >
          <textarea
            ref={textarea}
            rows={1}
            value={draft}
            maxLength={4000}
            autoComplete="off"
            enterKeyHint="send"
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (canSend) onSend();
            }}
          placeholder="Message"
          className="flex-1 resize-none rounded-[20px] bg-white border border-[#e5e5ea] px-4 py-2.5 text-base leading-snug max-h-[120px] placeholder:text-[#8e8e93] focus:outline-none focus:border-[#c7c7cc]"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              'h-11 w-11 mb-0.5 rounded-full flex items-center justify-center shrink-0 transition-opacity',
              canSend ? 'bg-[#0A101D] text-white' : 'bg-[#e5e5ea] text-[#8e8e93]',
            )}
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatThread;
