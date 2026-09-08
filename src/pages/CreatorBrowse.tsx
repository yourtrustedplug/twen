import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import type { Campaign } from '@/types/unignored';
import { NICHE_LABELS, PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney, formatDate, formatRate } from '@/lib/format';
import { useCampaignCover } from '@/lib/campaign-image';
import { isWatched, toggleWatchlist } from '@/lib/watchlist';
import { canApplyToCampaign } from '@/lib/metrics';
import { OnboardingBanner } from '@/components/OnboardingRequired';
import { Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const CampaignCover = ({ id, coverImage, alt }: { id: string; coverImage?: string | null; alt: string }) => {
  const src = useCampaignCover(id, coverImage);
  return (
    <img
      src={src}
      alt={alt}
      width={768}
      height={576}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
    />
  );
};

const CreatorBrowse = () => {
  const [searchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const niche = searchParams.get('niche') ?? 'all';
  const platform = searchParams.get('platform') ?? 'all';

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'open')
      .gt('deadline', new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data as Campaign[]) ?? [];
        setCampaigns(rows);
        setSaved(Object.fromEntries(rows.map((c) => [c.id, isWatched('creator', c.id)])));
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (!canApplyToCampaign(c.deadline)) return false;
      if (niche !== 'all' && c.niche !== niche) return false;
      if (platform !== 'all') {
        const plats = parseStringArray(c.platforms);
        if (plats.length > 0 && !plats.includes(platform)) return false;
      }
      if (!q) return true;
      const hay = `${c.title} ${c.brand_name} ${c.topic} ${c.angle} ${c.niche}`.toLowerCase();
      return hay.includes(q);
    });
  }, [campaigns, q, niche, platform]);

  const onToggleSave = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleWatchlist('creator', id);
    setSaved((s) => ({ ...s, [id]: next }));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-10">
        <div className="max-w-2xl mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Pick a campaign</h1>
          <p className="text-muted-foreground">Funded upfront. Rate and budget shown live. Post on IG or TikTok and get paid.</p>
        </div>

        <OnboardingBanner />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center">
            <h2 className="font-display text-2xl font-bold mb-3">
              {campaigns.length === 0 ? 'No open campaigns right now' : 'No campaigns match those filters'}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {campaigns.length === 0
                ? 'Check back soon — brands fund new campaigns regularly.'
                : 'Try another niche or platform, or clear the search.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((c) => {
              const remaining = Number(c.funded_amount) - Number(c.spent_amount);
              return (
                <Link
                  key={c.id}
                  to={`/creator/campaigns/${c.id}`}
                  className="group bg-white border border-[#f1f1f1] rounded-[30px] overflow-hidden flex flex-col hover:border-[#dcdcdc] transition-colors"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <CampaignCover id={c.id} coverImage={c.cover_image} alt={`${c.brand_name} campaign`} />
                    <button
                      type="button"
                      onClick={(e) => onToggleSave(e, c.id)}
                      className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
                      aria-label={saved[c.id] ? 'Remove from watchlist' : 'Save to watchlist'}
                    >
                      <Heart
                        className={cn(
                          'h-4 w-4',
                          saved[c.id] ? 'fill-rose-500 text-rose-500' : 'text-foreground'
                        )}
                      />
                    </button>
                    <div className="absolute top-4 right-4">
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80">{c.brand_name}</p>
                      <h3 className="font-display text-xl font-bold leading-snug text-white">{c.title}</h3>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {c.niche && (
                        <span className="text-[11px] font-semibold bg-[#fafafa] border border-[#f1f1f1] rounded-full px-3 py-1">
                          {NICHE_LABELS[c.niche] ?? c.niche}
                        </span>
                      )}
                      {parseStringArray(c.platforms).map((p) => (
                        <span key={p} className="text-[11px] font-semibold bg-[#fafafa] border border-[#f1f1f1] rounded-full px-3 py-1">
                          {PLATFORM_LABELS[p] ?? p}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{formatRate(c.rate_per_1k)}</span>
                      <span className="text-muted-foreground">{formatDate(c.deadline)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-dashed border-[#e9e9e9] pt-3">
                      <span className="text-muted-foreground">Left</span>
                      <span className="font-semibold">{formatMoney(remaining)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorBrowse;
