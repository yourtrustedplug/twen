import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import ConversationList, { type ChatPreview } from '@/components/messages/ConversationList';
import ChatThread from '@/components/messages/ChatThread';
import type { Conversation, Message } from '@/types/unignored';
import { isPro } from '@/lib/plan';
import { onboardingFor } from '@/lib/onboarding';
import { usePlanCheckout } from '@/hooks/use-plan-checkout';
import {
  SYNTHETIC_TWEN_ID,
  isTwenConversation,
  pinTwenFirst,
  resolveSelectedChat,
  syntheticTwenConversation,
  syntheticTwenMessages,
} from '@/lib/twen-welcome';
import { cn } from '@/lib/utils';
import { Loader2, MessageSquare } from 'lucide-react';

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

const Messages = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { startPlanCheckout, busy: upgrading } = usePlanCheckout();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [previews, setPreviews] = useState<Record<string, ChatPreview>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [brandColors, setBrandColors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [inboxEpoch, setInboxEpoch] = useState(0);
  const activeId = params.get('c');
  const isBrand = profile?.role === 'brand';
  const brandNeedsPro = isBrand && !isPro(profile);
  const onboarding = onboardingFor(profile);

  const nameOf = useCallback(
    (c: Conversation) => {
      if (isTwenConversation(c)) return 'Twen';
      return isBrand ? c.creator_name || 'Creator' : c.brand_name || 'Brand';
    },
    [isBrand],
  );
  const peerIdOf = useCallback(
    (c: Conversation) => (isTwenConversation(c) ? null : isBrand ? c.creator_id : c.brand_id),
    [isBrand],
  );

  const applyRows = useCallback(
    (rows: Conversation[]) => {
      let next = rows;
      if (user && !next.some(isTwenConversation)) {
        next = [syntheticTwenConversation(user.id), ...next];
      }
      if (brandNeedsPro) next = next.filter(isTwenConversation);
      setConversations(pinTwenFirst(next));
    },
    [user, brandNeedsPro],
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const selected = new URLSearchParams(window.location.search).get('c');
    const load = async () => {
      try {
        try {
          await supabase.rpc('ensure_twen_welcome');
        } catch {
          /* RPC is optional until TWEN_WELCOME.sql is applied */
        }
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .order('last_message_at', { ascending: false });
        const rows = error ? [] : ((data as Conversation[]) ?? []);
        applyRows(rows);
        const visible = brandNeedsPro ? rows.filter(isTwenConversation) : rows;
        const pinned = pinTwenFirst(
          visible.some(isTwenConversation) || !user ? visible : [syntheticTwenConversation(user.id), ...visible],
        );
        const nextId = resolveSelectedChat(pinned, selected, isDesktop());
        if (nextId && nextId !== selected) setParams({ c: nextId }, { replace: true });
        else if (!nextId && selected) setParams({}, { replace: true });

      const ids = pinned.filter((c) => c.id !== SYNTHETIC_TWEN_ID).map((c) => c.id);
      const lastMessages = await Promise.all(
        ids.map(async (id) => {
          const { data: last } = await supabase
            .from('messages')
            .select('conversation_id, body, sender_id')
            .eq('conversation_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return last as {
            conversation_id: string;
            body: string;
            sender_id: string;
          } | null;
        }),
      );
      const previewMap: Record<string, ChatPreview> = Object.fromEntries(
        lastMessages
          .filter((m): m is NonNullable<typeof m> => Boolean(m))
          .map((m) => [
            m.conversation_id,
            { body: m.body, senderId: m.sender_id, fromTwen: pinned.some((c) => c.id === m.conversation_id && isTwenConversation(c)) },
          ]),
      );
      const synthetic = pinned.find((c) => c.id === SYNTHETIC_TWEN_ID);
      if (synthetic) {
        const last = syntheticTwenMessages(user.id, profile?.role, onboarding.complete, profile).at(-1);
        if (last) previewMap[synthetic.id] = { body: last.body, senderId: last.sender_id, fromTwen: true };
      }
      setPreviews(previewMap);

      const peerIds = [...new Set(pinned.map(peerIdOf).filter((id): id is string => Boolean(id)))];
      if (peerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url, brand_primary_color')
          .in('id', peerIds);
        const rows =
          (profiles as { id: string; avatar_url: string | null; brand_primary_color: string | null }[]) ?? [];
        setAvatars(Object.fromEntries(rows.map((p) => [p.id, p.avatar_url])));
        setBrandColors(Object.fromEntries(rows.map((p) => [p.id, p.brand_primary_color])));
      }
      setInboxEpoch((n) => n + 1);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, setParams, brandNeedsPro, peerIdOf, applyRows, profile?.role, onboarding.complete]);

  const active = conversations.find((c) => c.id === activeId);
  const twenThread = isTwenConversation(active) || activeId === SYNTHETIC_TWEN_ID;

  const loadMessages = useCallback(async () => {
    if (!activeId || !user) {
      setMessages([]);
      return;
    }
    if (activeId === SYNTHETIC_TWEN_ID) {
      setMessages(syntheticTwenMessages(user.id, profile?.role, onboarding.complete, profile));
      return;
    }
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true });
    const rows = error ? [] : ((data as Message[]) ?? []);
    if (!rows.length && twenThread) {
      setMessages(syntheticTwenMessages(user.id, profile?.role, onboarding.complete, profile));
      return;
    }
    setMessages(rows);
  }, [
    activeId,
    user,
    twenThread,
    profile?.role,
    profile?.first_name,
    profile?.full_name,
    profile?.company_name,
    onboarding.complete,
  ]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages, inboxEpoch]);

  useEffect(() => {
    setDraft('');
  }, [activeId]);

  useEffect(() => {
    if (!activeId || activeId === SYNTHETIC_TWEN_ID) return;
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          setPreviews((prev) => ({
            ...prev,
            [row.conversation_id]: { body: row.body, senderId: row.sender_id, fromTwen: row.from_twen },
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || !user || sending || twenThread) return;
    setSending(true);
    setDraft('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: activeId, sender_id: user.id, body })
      .select('*')
      .maybeSingle();
    if (error || !data) {
      setDraft(body);
      toast({ title: 'Could not send', description: error?.message, variant: 'destructive' });
    } else {
      const row = data as Message;
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      setPreviews((prev) => ({ ...prev, [activeId]: { body, senderId: user.id } }));
      const stamp = new Date().toISOString();
      setConversations((prev) =>
        pinTwenFirst(
          prev.map((c) => (c.id === activeId ? { ...c, last_message_at: stamp } : c)),
        ),
      );
      await supabase.from('conversations').update({ last_message_at: stamp }).eq('id', activeId);
    }
    setSending(false);
  };

  const activeName = active ? nameOf(active) : 'Chat';
  const peerId = active ? peerIdOf(active) : null;
  const activeAvatar = peerId ? avatars[peerId] : null;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      <AppHeader />
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <aside
            className={cn(
              'w-full lg:w-[22rem] xl:w-[24rem] shrink-0 border-r border-[#ebebeb] min-h-0',
              activeId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col',
            )}
          >
            {conversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <MessageSquare className="h-8 w-8 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {isBrand ? 'Open a creator profile to start a chat.' : 'Brands start the conversation. Yours will appear here.'}
                </p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={activeId}
                userId={user?.id}
                nameOf={nameOf}
                avatarOf={(c) => {
                  if (!isBrand) return null;
                  const id = peerIdOf(c);
                  return id ? avatars[id] : null;
                }}
                markOf={(c) => !isBrand && !isTwenConversation(c)}
                colorOf={(c) => {
                  const id = peerIdOf(c);
                  return id ? brandColors[id] : null;
                }}
                seedOf={peerIdOf}
                previewOf={(id) => previews[id]}
                onSelect={(id) => setParams({ c: id })}
              />
            )}
            {brandNeedsPro ? (
              <div className="shrink-0 px-4 py-3 border-t border-[#ebebeb] bg-white">
                <p className="text-[12px] text-[#8e8e93] mb-2">Direct chats with creators are Twen Plus.</p>
                <Button variant="invofy" size="sm" className="w-full" disabled={upgrading} onClick={() => startPlanCheckout('brand')}>
                  {upgrading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Get Twen Plus
                </Button>
              </div>
            ) : null}
          </aside>

          <section className={cn('flex-1 min-w-0 min-h-0', activeId ? 'flex flex-col' : 'hidden lg:flex lg:flex-col')}>
            {activeId ? (
              <ChatThread
                name={activeName}
                avatarUrl={isBrand ? activeAvatar : null}
                official={twenThread}
                mark={!isBrand && !twenThread}
                color={peerId ? brandColors[peerId] : null}
                seed={peerId ?? undefined}
                subtitle={twenThread ? 'Official' : undefined}
                messages={messages}
                userId={user?.id}
                draft={draft}
                sending={sending}
                emptyHint={
                  twenThread
                    ? 'Twen will write here when your account is ready.'
                    : `This is the beginning of your conversation with ${activeName}.`
                }
                readOnly={twenThread}
                readOnlyHint={
                  twenThread ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[13px] text-[#8e8e93]">
                        This chat is from Twen. We don&apos;t reply here.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {!onboarding.complete ? (
                          <Button variant="invofy" size="sm" asChild>
                            <Link to={onboarding.profilePath}>Complete profile</Link>
                          </Button>
                        ) : profile?.role === 'creator' ? (
                          <Button variant="invofyOutline" size="sm" asChild>
                            <Link to="/creator/earnings">Earnings & payouts</Link>
                          </Button>
                        ) : (
                          <Button variant="invofyOutline" size="sm" asChild>
                            <Link to="/brand/campaigns/new">New campaign</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null
                }
                banner={
                  twenThread && !onboarding.complete ? (
                    <div className="bg-white/90 border border-[#f1f1f1] rounded-[18px] px-4 py-3 mb-3 shadow-[0_1px_0.5px_rgba(10,16,29,0.06)]">
                      <p className="text-[13px] font-semibold text-[#0A101D]">Finish onboarding to get started</p>
                      <p className="text-[12px] text-[#8e8e93] mt-0.5">
                        Still needed:{' '}
                        {onboarding.missing.map((m, i) => (
                          <span key={m.key}>
                            {i > 0 ? ', ' : ''}
                            <Link to={m.path} className="underline underline-offset-2 hover:text-[#0A101D]">
                              {m.label}
                            </Link>
                          </span>
                        ))}
                        .
                      </p>
                    </div>
                  ) : null
                }
                onDraft={setDraft}
                onSend={send}
                onBack={() => setParams({}, { replace: true })}
              />
            ) : (
              <div className="chat-wallpaper flex-1 flex flex-col items-center justify-center px-8 text-center">
                <MessageSquare className="h-10 w-10 mb-4 text-[#8e8e93]" />
                <p className="font-semibold text-[#0A101D] mb-1">Select a chat</p>
                <p className="text-sm text-[#8e8e93]">Pick a conversation from the list to start messaging.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Messages;
