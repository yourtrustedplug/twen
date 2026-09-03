import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import SignedImage from '@/components/SignedImage';
import { MetricTile } from '@/components/MetricTile';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ProfileRow, Submission } from '@/types/unignored';
import { PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPercent, engagement } from '@/lib/metrics';
import { campaignImage } from '@/lib/campaign-image';
import { Loader2, ArrowLeft, MessageSquare, Handshake } from 'lucide-react';

const BrandCreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<ProfileRow | null>(null);
  const [work, setWork] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('submissions').select('*').eq('creator_id', id).order('verified_views', { ascending: false }).limit(6),
    ]).then(([{ data: p }, { data: s }]) => {
      setCreator((p as ProfileRow) ?? null);
      setWork((s as Submission[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  const startChat = async (hire: boolean) => {
    if (!user || !creator) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('conversations')
      .upsert(
        {
          brand_id: user.id,
          creator_id: creator.id,
          brand_name: profile?.company_name || profile?.full_name || 'Brand',
          creator_name: creator.full_name ?? 'Creator',
        },
        { onConflict: 'brand_id,creator_id' }
      )
      .select('id')
      .maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: 'Could not open the chat', description: error?.message, variant: 'destructive' });
      return;
    }
    if (hire) {
      await supabase.from('messages').insert({
        conversation_id: (data as { id: string }).id,
        sender_id: user.id,
        body: `We'd like to hire you for a paid video at your rate of ${formatMoney(creator.rate_per_video)}. Are you available?`,
      });
    }
    setBusy(false);
    navigate(`/messages?c=${(data as { id: string }).id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Creator not found</h1>
          <Button variant="invofy" size="invofy" asChild>
            <Link to="/brand/creators">Back to creators</Link>
          </Button>
        </main>
      </div>
    );
  }

  const platforms = parseStringArray(creator.platforms);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[80rem] mx-auto px-5 md:px-10 py-12">
        <Link to="/brand/creators" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Creators
        </Link>

        <div className="grid lg:grid-cols-[380px_1fr] gap-10">
          <div>
            <div className="rounded-[34px] overflow-hidden aspect-[4/5] mb-5">
              {creator.avatar_url ? (
                <SignedImage path={creator.avatar_url} alt={creator.full_name ?? 'Creator'} className="w-full h-full object-cover" />
              ) : (
                <img src={campaignImage(creator.id)} alt={creator.full_name ?? 'Creator'} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="invofy" size="invofy" onClick={() => startChat(true)} disabled={busy}>
                <Handshake className="h-4 w-4 mr-2" /> Hire at {formatMoney(creator.rate_per_video)}
              </Button>
              <Button variant="invofyOutline" size="invofy" onClick={() => startChat(false)} disabled={busy}>
                <MessageSquare className="h-4 w-4 mr-2" /> Message
              </Button>
            </div>
          </div>

          <div>
            <h1 className="font-display text-4xl font-bold mb-1">{creator.full_name ?? 'Creator'}</h1>
            <p className="text-muted-foreground mb-6">
              {creator.tiktok_handle} {creator.location ? `· ${creator.location}` : ''}
            </p>
            {creator.bio && <p className="leading-relaxed mb-8 max-w-2xl">{creator.bio}</p>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricTile label="Price per video" value={formatMoney(creator.rate_per_video)} />
              <MetricTile label="Average views" value={formatViews(creator.avg_views)} />
              <MetricTile label="Engagement" value={formatPercent(Number(creator.engagement_rate))} />
              <MetricTile
                label="Implied CPM"
                value={`$${(Number(creator.avg_views) ? (Number(creator.rate_per_video) / Number(creator.avg_views)) * 1000 : 0).toFixed(2)}`}
              />
            </div>

            {platforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-10">
                {platforms.map((p) => (
                  <span key={p} className="text-xs font-semibold bg-[#fafafa] border border-[#f1f1f1] rounded-full px-4 py-2">
                    {PLATFORM_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            )}

            {work.length > 0 && (
              <>
                <h2 className="font-display text-2xl font-bold mb-5">Recent work</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {work.map((s) => (
                    <a
                      key={s.id}
                      href={s.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-[24px] overflow-hidden aspect-[9/12]"
                    >
                      <img
                        src={campaignImage(s.id)}
                        alt="Creator video"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 to-transparent text-white">
                        <p className="font-semibold text-sm">{formatViews(s.verified_views)} views</p>
                        <p className="text-xs text-white/80">{formatPercent(engagement(s))} engagement</p>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BrandCreatorProfile;
