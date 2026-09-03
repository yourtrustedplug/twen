import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { MetricTile, VerdictPill } from '@/components/MetricTile';
import type { Campaign, Submission } from '@/types/unignored';
import { formatMoney, formatViews } from '@/lib/format';
import { cpm, cpmVerdict, engagementVerdict, formatPercent, daysRemaining, BENCHMARKS } from '@/lib/metrics';
import { campaignImage } from '@/lib/campaign-image';
import { Loader2 } from 'lucide-react';

interface Row {
  campaign: Campaign;
  creators: number;
  videos: number;
  views: number;
  interactions: number;
  engagement: number;
  spent: number;
  cpm: number;
}

const BrandAnalytics = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', user.id)
      .then(async ({ data }) => {
        const cs = (data as Campaign[]) ?? [];
        setCampaigns(cs);
        if (cs.length) {
          const { data: s } = await supabase
            .from('submissions')
            .select('*')
            .in('campaign_id', cs.map((c) => c.id));
          setSubmissions((s as Submission[]) ?? []);
        }
        setLoading(false);
      });
  }, [user]);

  const rows = useMemo<Row[]>(
    () =>
      campaigns
        .map((campaign) => {
          const subs = submissions.filter((s) => s.campaign_id === campaign.id);
          const views = subs.reduce((n, s) => n + Number(s.verified_views), 0);
          const interactions = subs.reduce((n, s) => n + Number(s.likes) + Number(s.comments) + Number(s.shares), 0);
          const spent = Number(campaign.spent_amount);
          return {
            campaign,
            creators: new Set(subs.map((s) => s.creator_id)).size,
            videos: subs.length,
            views,
            interactions,
            engagement: views ? interactions / views : 0,
            spent,
            cpm: cpm(spent, views),
          };
        })
        .sort((a, b) => b.views - a.views),
    [campaigns, submissions]
  );

  const totals = useMemo(() => {
    const views = rows.reduce((n, r) => n + r.views, 0);
    const spent = rows.reduce((n, r) => n + r.spent, 0);
    const interactions = rows.reduce((n, r) => n + r.interactions, 0);
    return {
      views,
      spent,
      interactions,
      engagement: views ? interactions / views : 0,
      cpm: cpm(spent, views),
      saved: views ? (BENCHMARKS.facebookCpm / 1000) * views - spent : 0,
      creators: new Set(submissions.map((s) => s.creator_id)).size,
    };
  }, [rows, submissions]);

  const best = rows.reduce<Row | null>((b, r) => (r.views > 0 && (!b || r.cpm < b.cpm) ? r : b), null);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground mb-10">Every campaign side by side.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center text-muted-foreground">
            Run a campaign to see analytics.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <MetricTile label="Verified views" value={formatViews(totals.views)} />
              <MetricTile label="Spent" value={formatMoney(totals.spent)} />
              <MetricTile label="Blended CPM" value={`$${totals.cpm.toFixed(2)}`} />
              <MetricTile label="Interactions" value={formatViews(totals.interactions)} />
              <MetricTile label="Engagement" value={formatPercent(totals.engagement)} />
              <MetricTile label="Creators" value={String(totals.creators)} />
            </div>
            <div className="flex flex-wrap gap-3 mb-12">
              <VerdictPill verdict={cpmVerdict(totals.cpm)} />
              <VerdictPill verdict={engagementVerdict(totals.engagement)} />
              {totals.saved > 0 && (
                <VerdictPill
                  verdict={{
                    label: `${formatMoney(totals.saved)} saved vs Facebook ads`,
                    tone: 'good',
                    detail: 'Same reach bought at Meta CPM',
                  }}
                />
              )}
              {best && (
                <VerdictPill
                  verdict={{ label: `Best value: ${best.campaign.title}`, tone: 'good', detail: `$${best.cpm.toFixed(2)} CPM` }}
                />
              )}
            </div>

            <div className="flex flex-col gap-4">
              {rows.map((r) => {
                const share = totals.views ? (r.views / totals.views) * 100 : 0;
                return (
                  <Link
                    key={r.campaign.id}
                    to={`/brand/campaigns/${r.campaign.id}`}
                    className="bg-white border border-[#f1f1f1] rounded-[30px] p-5 flex flex-col md:flex-row gap-6 hover:border-[#dcdcdc] transition-colors"
                  >
                    <img
                      src={campaignImage(r.campaign.id)}
                      alt={r.campaign.title}
                      loading="lazy"
                      className="w-full md:w-56 aspect-[16/10] object-cover rounded-[22px]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-4 mb-4">
                        <h2 className="font-display text-xl font-bold truncate">{r.campaign.title}</h2>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {r.campaign.status === 'open' ? `${daysRemaining(r.campaign.deadline)} days left` : r.campaign.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <MetricTile label="Creators" value={String(r.creators)} />
                        <MetricTile label="Videos" value={String(r.videos)} />
                        <MetricTile label="Views" value={formatViews(r.views)} />
                        <MetricTile label="Engagement" value={formatPercent(r.engagement)} />
                        <MetricTile label="Spent" value={formatMoney(r.spent)} />
                        <MetricTile label="CPM" value={`$${r.cpm.toFixed(2)}`} />
                      </div>
                      <div className="h-2 rounded-full bg-[#efefef] overflow-hidden mt-4">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{share.toFixed(0)}% of all your views</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BrandAnalytics;
