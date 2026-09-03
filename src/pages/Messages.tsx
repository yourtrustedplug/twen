import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Conversation, Message } from '@/types/unignored';
import { cn } from '@/lib/utils';
import { Loader2, Send, MessageSquare } from 'lucide-react';

const Messages = () => {
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const activeId = params.get('c');
  const isBrand = profile?.role === 'brand';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data as Conversation[]) ?? [];
        setConversations(rows);
        setLoading(false);
        if (!activeId && rows[0]) setParams({ c: rows[0].id }, { replace: true });
      });
  }, [user, activeId, setParams]);

  const loadMessages = useCallback(async () => {
    if (!activeId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [activeId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        () => loadMessages()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, loadMessages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || !user) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ conversation_id: activeId, sender_id: user.id, body });
    if (!error) {
      setDraft('');
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeId);
      loadMessages();
    }
    setSending(false);
  };

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[80rem] mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-8">Messages</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isBrand ? 'Open a creator profile to start a chat.' : 'Brands start the conversation. Yours will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            <aside className="flex flex-col gap-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setParams({ c: c.id })}
                  className={cn(
                    'text-left rounded-[22px] border px-5 py-4 transition-colors',
                    c.id === activeId ? 'bg-[#fafafa] border-[#dcdcdc]' : 'border-[#f1f1f1] hover:bg-[#fafafa]'
                  )}
                >
                  <p className="font-semibold truncate">{isBrand ? c.creator_name || 'Creator' : c.brand_name || 'Brand'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.last_message_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </aside>

            <section className="bg-white border border-[#f1f1f1] rounded-[30px] flex flex-col h-[32rem]">
              <div className="px-6 py-4 border-b border-[#f1f1f1]">
                <p className="font-semibold">{isBrand ? active?.creator_name : active?.brand_name}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground m-auto">No messages yet.</p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[75%] rounded-[20px] px-4 py-3 text-sm',
                      m.sender_id === user?.id
                        ? 'self-end bg-primary text-primary-foreground'
                        : 'self-start bg-[#fafafa] border border-[#f1f1f1]'
                    )}
                  >
                    {m.body}
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <div className="p-4 border-t border-[#f1f1f1] flex gap-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send();
                  }}
                  placeholder="Write a message"
                />
                <Button variant="invofy" size="sm" onClick={send} disabled={sending || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
