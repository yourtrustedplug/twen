import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import CampaignPickCard from '@/components/creator/CampaignPickCard';
import type { Campaign } from '@/types/unignored';
import { loadWatchlist, persistWatchlistToggle } from '@/lib/watchlist';
import { attachBrandLogos } from '@/lib/campaign-logo';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Heart } from 'lucide-react';

const CreatorWatchlist = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadWatchlist('creator', user?.id).then((next) => {
      if (!cancelled) setIds(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (ids === null) return;
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
      .then(async ({ data }) => {
        setCampaigns(await attachBrandLogos((data as Campaign[]) ?? []));
        setLoading(false);
      });
  }, [ids]);

  const remove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    void persistWatchlistToggle('creator', id, user?.id).then(() => {
      setIds((current) => (current ?? []).filter((saved) => saved !== id));
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-8 md:py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Watchlist</h1>
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
            {campaigns.map((c) => (
              <CampaignPickCard key={c.id} campaign={c} saved onToggleSave={remove} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorWatchlist;
