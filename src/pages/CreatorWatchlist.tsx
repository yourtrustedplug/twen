import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import type { Campaign } from '@/types/unignored';
import { formatMoney, formatDate, formatRate } from '@/lib/format';
import { useCampaignCover } from '@/lib/campaign-image';
import { getWatchlist, toggleWatchlist } from '@/lib/watchlist';
import { Loader2, Heart } from 'lucide-react';

const CampaignCover = ({ id, coverImage, alt }: { id: string; coverImage?: string | null; alt: string }) => {
  const src = useCampaignCover(id, coverImage);
  return <img src={src} alt={alt} className="w-full h-full object-cover" />;
};

const CreatorWatchlist = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState<string[]>(() => getWatchlist('creator'));

  useEffect(() => {
    if (!ids.length) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('campaigns')
      .select('*')
      .in('id', ids)
      .then(({ data }) => {
        setCampaigns((data as Campaign[]) ?? []);
        setLoading(false);
      });
  }, [ids]);

  const remove = (id: string) => {
    toggleWatchlist('creator', id);
    setIds(getWatchlist('creator'));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">Watchlist</h1>
        <p className="text-muted-foreground mb-10">Campaigns you saved to come back to.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center">
            <Heart className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-display text-2xl font-bold mb-3">Nothing saved yet</h2>
            <p className="text-muted-foreground mb-6">Save campaigns while you browse, then pick one when you are ready.</p>
            <Link to="/creator" className="text-sm font-semibold text-primary underline">
              Browse campaigns
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map((c) => {
              const remaining = Number(c.funded_amount) - Number(c.spent_amount);
              return (
                <div key={c.id} className="relative bg-white border border-[#f1f1f1] rounded-[30px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/90 flex items-center justify-center"
                    aria-label="Remove from watchlist"
                  >
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  </button>
                  <Link to={`/creator/campaigns/${c.id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <CampaignCover id={c.id} coverImage={c.cover_image} alt={c.title} />
                      <div className="absolute top-4 right-4">
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80">{c.brand_name}</p>
                        <h3 className="font-display text-xl font-bold text-white">{c.title}</h3>
                      </div>
                    </div>
                    <div className="p-6 flex items-center justify-between text-sm">
                      <span className="font-semibold">{formatRate(c.rate_per_1k)}</span>
                      <span className="text-muted-foreground">{formatMoney(remaining)} left · {formatDate(c.deadline)}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorWatchlist;
