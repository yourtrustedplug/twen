import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import type { Campaign } from '@/types/unignored';
import { formatMoney, formatDate, formatRate } from '@/lib/format';
import { campaignImage } from '@/lib/campaign-image';
import { Loader2 } from 'lucide-react';

const CreatorBrowse = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'open')
      .gt('deadline', new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCampaigns((data as Campaign[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <div className="max-w-2xl mb-10">
          <h1 className="font-display text-4xl font-bold mb-2">Browse campaigns</h1>
          <p className="text-muted-foreground">All funded upfront. Budgets shown live.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center">
            <h2 className="font-display text-2xl font-bold mb-3">No open campaigns right now</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Check back soon — brands fund new campaigns regularly.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map((c) => {
              const remaining = Number(c.funded_amount) - Number(c.spent_amount);
              return (
                <Link
                  key={c.id}
                  to={`/creator/campaigns/${c.id}`}
                  className="group bg-white border border-[#f1f1f1] rounded-[30px] overflow-hidden flex flex-col hover:border-[#dcdcdc] transition-colors"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={campaignImage(c.id)}
                      alt={`${c.brand_name} campaign`}
                      width={768}
                      height={576}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute top-4 right-4">
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80">{c.brand_name}</p>
                      <h3 className="font-display text-xl font-bold leading-snug text-white">{c.title}</h3>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-3">
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
