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
import { formatMoney } from '@/lib/format';
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
    if (user?.id === creator.id) {
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
      <div className="h-dvh bg-white flex items-center justify-center">
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
  const bookLabel = user && profile?.role === 'brand' && !isPro(profile)
    ? 'Get Twen Plus'
    : `Book ${firstName} · ${formatMoney(creator.rate_per_video)}`;

  const action = ownPage ? (
    <Button
      variant="invofy"
      className="w-full h-12 rounded-full"
      onClick={() => navigate('/creator/profile?tab=public')}
    >
      Edit Book me
    </Button>
  ) : (
    <form
      className="border-t border-[#ececec] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <label htmlFor="book-me-note" className="sr-only">
        Message {firstName}
      </label>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <textarea
          id="book-me-note"
          rows={2}
          maxLength={BOOK_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Hi ${firstName}, we’d like to book you for a paid video…`}
          className="w-full resize-none h-[4.35rem] rounded-[18px] bg-[#f6f6f6] border border-[#ececec] px-4 py-3 text-sm leading-snug placeholder:text-[#8e8e93] focus:outline-none focus:border-[#c7c7cc]"
        />
        <Button
          type="submit"
          disabled={busy}
          className="h-12 shrink-0 rounded-full px-6 bg-[#0A101D] text-white font-semibold hover:bg-[#0A101D]/90 hover:text-white"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy
            ? user && profile?.role === 'brand' && !isPro(profile)
              ? 'Opening checkout…'
              : 'Sending…'
            : bookLabel}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="relative h-dvh overflow-hidden bg-white">
      <Link
        to="/"
        className="absolute z-20 top-4 left-4 lg:top-6 lg:left-6 rounded-full bg-white/90 px-3 py-1.5 shadow-[0_1px_2px_rgba(10,16,29,0.08)]"
      >
        <Logo variant="full" className="h-6" iconClassName="h-6 w-6" />
      </Link>
      <BookMeCard profile={creator} action={action} />
    </div>
  );
};

export default BookMe;
