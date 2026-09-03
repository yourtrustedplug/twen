import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import type { Campaign } from '@/types/unignored';
import { formatMoney, formatDate, formatRate } from '@/lib/format';
import { Loader2, Plus, Eye } from 'lucide-react';

const BrandDashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCampaigns((data as Campaign[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const funded = campaigns.reduce((sum, c) => sum + Number(c.funded_amount), 0);
  const spent = campaigns.reduce((sum, c) => sum + Number(c.spent_amount), 0);
  const live = campaigns.filter((c) => c.status === 'open').length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">Brand dashboard</h1>
            <p className="text-muted-foreground">Fund a campaign once — you only ever pay for verified views.</p>
          </div>
          <Button variant="invofy" size="invofy" asChild>
            <Link to="/brand/campaigns/new">
              <Plus className="h-4 w-4 mr-2" /> New Campaign
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Total escrowed', value: formatMoney(funded) },
            { label: 'Spent on views', value: formatMoney(spent) },
            { label: 'Remaining', value: formatMoney(funded - spent) },
            { label: 'Live campaigns', value: String(live) },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-7">
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">
                {stat.label}
              </p>
              <p className="font-display text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center">
            <h2 className="font-display text-2xl font-bold mb-3">No campaigns yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Write your first brief, set a rate per thousand views, and fund it. Creators see it the moment it's funded.
            </p>
            <Button variant="invofy" size="invofy" asChild>
              <Link to="/brand/campaigns/new">Create your first campaign</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map((c) => {
              const pct = Number(c.funded_amount) > 0 ? (Number(c.spent_amount) / Number(c.funded_amount)) * 100 : 0;
              return (
                <Link
                  key={c.id}
                  to={`/brand/campaigns/${c.id}`}
                  className="bg-white border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5 hover:border-[#dcdcdc] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-bold leading-snug">{c.title}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatRate(c.rate_per_1k)}</span>
                    <span>Deadline {formatDate(c.deadline)}</span>
                  </div>
                  <div>
                    <div className="h-2 rounded-full bg-[#efefef] overflow-hidden mb-2">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatMoney(c.spent_amount)} of {formatMoney(c.funded_amount)} spent
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Eye className="h-3.5 w-3.5" /> {formatMoney(Number(c.rate_per_1k) === 0 ? 0 : Number(c.spent_amount) / Number(c.rate_per_1k) * 1000)} views
                      </span>
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

export default BrandDashboard;
