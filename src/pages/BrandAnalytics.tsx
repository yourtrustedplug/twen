import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { MetricTile } from '@/components/MetricTile';
import { CampaignDetailSheet } from '@/components/brand/CampaignDetailSheet';
import type { Campaign, Submission } from '@/types/unignored';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPercent, daysRemaining } from '@/lib/metrics';
import {
  analyticsSearchWithoutCampaign,
  campaignIdFromSearch,
} from '@/lib/brand-analytics';
import CampaignCover from '@/components/CampaignCover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Row {
  campaign: Campaign;
  creators: number;
  videos: number;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  spent: number;
}

const BrandAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedId = campaignIdFromSearch(searchParams);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('campaigns').select('*').eq('brand_id', user.id);
    const cs = (data as Campaign[]) ?? [];
    setCampaigns(cs);
    if (cs.length) {
      const { data: s } = await supabase
        .from('submissions')
        .select('*')
        .in('campaign_id', cs.map((c) => c.id));
      setSubmissions((s as Submission[]) ?? []);
    } else {
      setSubmissions([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('funded') !== 'pending') return;
    toast({
      title: 'Payment received — confirming escrow',
      description: 'If the campaign is still draft, refresh in a few seconds while NardoPay webhook settles.',
    });
    const next = new URLSearchParams(searchParams);
    next.delete('funded');
    setSearchParams(next, { replace: true });
    const t = window.setTimeout(() => load(), 2500);
    return () => window.clearTimeout(t);
  }, [searchParams, setSearchParams, toast, load]);

  const openCampaign = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('campaign', id);
    setSearchParams(next);
  };

  const closeCampaign = () => {
    setSearchParams(analyticsSearchWithoutCampaign(searchParams), { replace: true });
  };

  const rows = useMemo<Row[]>(
    () =>
      campaigns
        .map((campaign) => {
          const subs = submissions.filter((s) => s.campaign_id === campaign.id);
          const views = subs.reduce((n, s) => n + Number(s.verified_views), 0);
          const likes = subs.reduce((n, s) => n + Number(s.likes), 0);
          const comments = subs.reduce((n, s) => n + Number(s.comments), 0);
          const shares = subs.reduce((n, s) => n + Number(s.shares), 0);
          return {
            campaign,
            creators: new Set(subs.map((s) => s.creator_id)).size,
            videos: subs.length,
            views,
            likes,
            comments,
            engagement: views ? (likes + comments + shares) / views : 0,
            spent: Number(campaign.spent_amount),
          };
        })
        .sort((a, b) => b.views - a.views),
    [campaigns, submissions],
  );

  const totals = useMemo(() => {
    const views = rows.reduce((n, r) => n + r.views, 0);
    const likes = rows.reduce((n, r) => n + r.likes, 0);
    const comments = rows.reduce((n, r) => n + r.comments, 0);
    const spent = rows.reduce((n, r) => n + r.spent, 0);
    const shares = submissions.reduce((n, s) => n + Number(s.shares), 0);
    return {
      views,
      likes,
      comments,
      spent,
      engagement: views ? (likes + comments + shares) / views : 0,
      creators: new Set(submissions.map((s) => s.creator_id)).size,
    };
  }, [rows, submissions]);

  const selectedCampaign = rows.find((r) => r.campaign.id === selectedId)?.campaign ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-8 md:py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Campaign analytics</h1>
        <p className="text-muted-foreground mb-10">Views, likes, comments, and engagement across your campaigns.</p>

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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
              <MetricTile label="Verified views" value={formatViews(totals.views)} />
              <MetricTile label="Likes" value={formatViews(totals.likes)} />
              <MetricTile label="Comments" value={formatViews(totals.comments)} />
              <MetricTile label="Engagement rate" value={formatPercent(totals.engagement)} />
              <MetricTile label="Spent" value={formatMoney(totals.spent)} />
              <MetricTile label="Creators" value={String(totals.creators)} />
            </div>

            <div className="flex flex-col gap-4">
              {rows.map((r) => {
                const share = totals.views ? (r.views / totals.views) * 100 : 0;
                const selected = r.campaign.id === selectedId;
                return (
                  <button
                    key={r.campaign.id}
                    type="button"
                    onClick={() => openCampaign(r.campaign.id)}
                    className={cn(
                      'bg-white border rounded-[30px] p-5 flex flex-col md:flex-row gap-6 text-left transition-colors',
                      selected ? 'border-[#cfcfcf]' : 'border-[#f1f1f1] hover:border-[#dcdcdc]',
                    )}
                  >
                    <CampaignCover
                      id={r.campaign.id}
                      coverImage={r.campaign.cover_image}
                      alt={r.campaign.title}
                      className="w-full md:w-56 aspect-[16/10] object-cover rounded-[22px]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-4 mb-4">
                        <h2 className="font-display text-xl font-bold truncate">{r.campaign.title}</h2>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {r.campaign.status === 'open'
                            ? `${daysRemaining(r.campaign.deadline)} days left`
                            : r.campaign.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <MetricTile label="Creators" value={String(r.creators)} />
                        <MetricTile label="Videos" value={String(r.videos)} />
                        <MetricTile label="Views" value={formatViews(r.views)} />
                        <MetricTile label="Likes" value={formatViews(r.likes)} />
                        <MetricTile label="Comments" value={formatViews(r.comments)} />
                        <MetricTile label="Engagement" value={formatPercent(r.engagement)} />
                      </div>
                      <div className="h-2 rounded-full bg-[#efefef] overflow-hidden mt-4">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{share.toFixed(0)}% of all your views</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      <CampaignDetailSheet
        campaignId={selectedId}
        seed={selectedCampaign}
        open={Boolean(selectedId)}
        onOpenChange={(next) => {
          if (!next) closeCampaign();
        }}
        onUpdated={load}
      />
    </div>
  );
};

export default BrandAnalytics;
