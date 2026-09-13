import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/logos';
import BookMeCard from '@/components/creator/BookMeCard';
import { ErrorPoster } from '@/components/ErrorPoster';
import { formatMissingPath } from '@/lib/not-found';
import {
  bookMePath,
  bookMeSlugFromPath,
  normalizeBookSlug,
  parseBookMeProfile,
  type BookMeProfile,
} from '@/lib/book-me';
import { startBrandCreatorChat } from '@/lib/hire';
import { isPro } from '@/lib/plan';
import {
  beginAuth,
  BOOK_NOTE_MAX,
  markAuthRedirect,
  pendingBookSearch,
  peekPendingBook,
  setPendingBook,
} from '@/lib/pending-signup';
import { authStartHref, goToAppPath } from '@/lib/hosts';
import { Loader2 } from 'lucide-react';

export const BookMeRedirect = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const clean = normalizeBookSlug(slug);
  if (!clean) return <Navigate to="/" replace />;
  return <Navigate to={bookMePath(clean)} replace />;
};

const BookMe = () => {
  const { slug: paramSlug = '' } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const slug = bookMeSlugFromPath(pathname) || normalizeBookSlug(paramSlug);
  const { user, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<BookMeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(() => peekPendingBook()?.body ?? '');

  useEffect(() => {
    const clean = normalizeBookSlug(slug);
    if (!clean) {
      setMissing(true);
      setLoading(false);
      return;
    }
    supabase
      .rpc('book_me_profile', { p_slug: clean })
      .then(({ data, error }) => {
        const parsed = parseBookMeProfile(data);
        if (error || !parsed) {
          setMissing(true);
          setCreator(null);
        } else {
          setCreator(parsed);
          setMissing(false);
        }
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!creator) return;
    document.title = `${creator.full_name || 'Creator'} · Book me | Twen`;
  }, [creator]);

  const startBrandAuth = (draft: string) => {
    if (!creator) return;
    const pending = {
      creatorId: creator.id,
      creatorName: creator.full_name || 'Creator',
      ratePerVideo: creator.rate_per_video,
      body: draft,
    };
    setPendingBook(pending);
    beginAuth('brand');
    markAuthRedirect();
    const query = pendingBookSearch(pending);
    const hop = authStartHref('brand');
    if (hop) {
      const url = new URL(hop);
      url.search = query;
      window.location.assign(url.toString());
      return;
    }
    navigate(`/signin?${query}`);
  };

  const send = async () => {
    if (!creator || busy) return;
    const draft = note.trim().slice(0, BOOK_NOTE_MAX);
    if (!draft) {
      toast({ title: 'Write a message first', description: 'Say what you want them to post, and when.' });
      return;
    }
    if (profile?.role === 'creator' && user?.id === creator.id) {
      navigate('/creator/profile?tab=public');
      return;
    }
    if (!user || profile?.role !== 'brand') {
      startBrandAuth(draft);
      return;
    }
    if (!isPro(profile)) {
      const pending = {
        creatorId: creator.id,
        creatorName: creator.full_name || 'Creator',
        ratePerVideo: creator.rate_per_video,
        body: draft,
      };
      setPendingBook(pending);
      setBusy(true);
      const params = new URLSearchParams(pendingBookSearch(pending));
      params.set('tab', 'plan');
      params.set('upgrade', '1');
      void goToAppPath('brand', `/brand/profile?${params.toString()}`, navigate);
      return;
    }
    setBusy(true);
    const result = await startBrandCreatorChat({
      brandId: user.id,
      creatorId: creator.id,
      brandName: profile.company_name || profile.full_name || 'Brand',
      creatorName: creator.full_name ?? 'Creator',
      ratePerVideo: creator.rate_per_video,
      body: draft,
    });
    setBusy(false);
    if ('error' in result) {
      toast({ title: 'Could not send', description: result.error, variant: 'destructive' });
      return;
    }
    void goToAppPath('brand', `/messages?c=${result.conversationId}`, navigate);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (missing || !creator) {
    return (
      <ErrorPoster
        logoHref="/"
        documentTitle="Book me not live | Twen"
        watermark="@"
        eyebrow="Book me"
        title="This Book me page is not live."
        description="The creator may still be setting their link, or that name is free."
        chip={slug ? formatMissingPath(`/@${slug}`) : undefined}
        actions={[
          { label: 'Go home', href: '/' },
          { label: 'Contact', href: '/contact', variant: 'invofyOutline' },
        ]}
      />
    );
  }

  const ownPage = Boolean(user && creator.id === user.id);
  const firstName = (creator.full_name || 'them').trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <div className="max-w-[28rem] mx-auto px-4 pt-8 pb-10">
        <Link to="/" className="flex justify-center mb-6">
          <Logo variant="full" className="h-7" />
        </Link>
        <BookMeCard profile={creator} />

        {ownPage ? (
          <div className="mt-5">
            <Button
              variant="invofy"
              size="invofy"
              className="w-full"
              onClick={() => navigate('/creator/profile?tab=public')}
            >
              Edit Book me
            </Button>
          </div>
        ) : (
          <form
            className="mt-5 rounded-[28px] border border-[#f1f1f1] bg-white p-4 shadow-[0_1px_2px_rgba(10,16,29,0.04)]"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="book-me-note" className="block font-display font-bold text-lg mb-1">
              Message {firstName}
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              {user && profile?.role === 'brand'
                ? isPro(profile)
                  ? 'Sent straight to their Twen inbox.'
                  : 'Twen Plus is required to message this creator. We’ll open checkout next.'
                : 'Write the brief first. You’ll create a brand account next so we can deliver it.'}
            </p>
            <textarea
              id="book-me-note"
              rows={4}
              maxLength={BOOK_NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Hi ${firstName}, we’d like to book you for a paid video. Here’s the brief…`}
              className="w-full resize-none rounded-[20px] bg-[#f6f6f6] border border-[#ececec] px-4 py-3 text-[15px] leading-snug placeholder:text-[#8e8e93] focus:outline-none focus:border-[#c7c7cc] min-h-[7.5rem]"
            />
            <div className="flex items-center justify-between gap-3 mt-2 mb-4">
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {note.trim().length}/{BOOK_NOTE_MAX}
              </p>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-full bg-[#0A101D] text-white font-semibold hover:bg-[#0A101D]/90 hover:text-white"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy
                ? user && profile?.role === 'brand' && !isPro(profile)
                  ? 'Opening checkout…'
                  : 'Sending…'
                : user && profile?.role === 'brand' && !isPro(profile)
                  ? 'Get Twen Plus'
                  : 'Send'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookMe;
