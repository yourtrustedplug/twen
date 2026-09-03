import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricTile, VerdictPill } from '@/components/MetricTile';
import SignedImage from '@/components/SignedImage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Submission, ProfileRow } from '@/types/unignored';
import { PLATFORM_LABELS, parseChecklist, parseChecklistResults, parseStringArray } from '@/types/unignored';
import { formatMoney, formatDate, formatViews, formatRate } from '@/lib/format';
import { campaignImage } from '@/lib/campaign-image';
import { cpm, cpmVerdict, engagementVerdict, formatPercent, daysRemaining } from '@/lib/metrics';
import { Loader2, ArrowLeft, ShieldCheck, CalendarPlus, Check, X, MessageSquare, ExternalLink } from 'lucide-react';

const BrandCampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [creators, setCreators] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).eq('brand_id', user.id).maybeSingle(),
      supabase.from('submissions').select('*').eq('campaign_id', id).order('verified_views', { ascending: false }),
    ]);
    setCampaign((c as Campaign) ?? null);
    const subs = (s as Submission[]) ?? [];
    setSubmissions(subs);
    const ids = [...new Set(subs.map((x) => x.creator_id))];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('*').in('id', ids);
      setCreators(Object.fromEntries(((p as ProfileRow[]) ?? []).map((x) => [x.id, x])));
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const fund = async () => {
    if (!campaign) return;
    setBusy(true);
    const { error } = await supabase.rpc('fund_campaign', { p_campaign_id: campaign.id });
    setBusy(false);
    if (error) {
      toast({ title: 'Funding failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Live', description: `${formatMoney(campaign.budget)} in escrow. Runs at least 10 days.` });
    load();
  };

  const extend = async (days: number) => {
    if (!campaign) return;
    setBusy(true);
    const { error } = await supabase.rpc('extend_campaign', { p_campaign_id: campaign.id, p_days: days });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not extend', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Extended by ${days} days` });
    load();
  };

  const review = async (submission: Submission, status: 'approved' | 'rejected') => {
    const reason = status === 'rejected' ? window.prompt('What was missed? (shown to the creator)') ?? '' : null;
    if (status === 'rejected' && !reason) return;
    setBusy(true);
    const { error } = await supabase
      .from('submissions')
      .update({ status, rejection_reason: reason })
      .eq('id', submission.id);
    setBusy(false);
    if (error) {
      toast({ title: 'Review failed', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const message = async (creatorId: string, creatorName: string) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from('conversations').upsert(
      {
        brand_id: user.id,
        creator_id: creatorId,
        campaign_id: campaign?.id ?? null,
        brand_name: profile?.company_name || profile?.full_name || 'Brand',
        creator_name: creatorName,
      },
      { onConflict: 'brand_id,creator_id' }
    );
    setBusy(false);
    if (error) {
      toast({ title: 'Could not start the chat', description: error.message, variant: 'destructive' });
      return;
    }
    window.location.assign('/messages');
  };

  const stats = useMemo(() => {
    const approved = submissions.filter((s) => s.status === 'approved');
    const views = approved.reduce((n, s) => n + Number(s.verified_views), 0);
    const likes = approved.reduce((n, s) => n + Number(s.likes), 0);
    const comments = approved.reduce((n, s) => n + Number(s.comments), 0);
    const shares = approved.reduce((n, s) => n + Number(s.shares), 0);
    const spent = Number(campaign?.spent_amount ?? 0);
    return {
      creators: new Set(submissions.map((s) => s.creator_id)).size,
      videos: submissions.length,
      approved: approved.length,
      views,
      interactions: likes + comments + shares,
      engagement: views ? (likes + comments + shares) / views : 0,
      effectiveCpm: cpm(spent, views),
    };
  }, [submissions, campaign]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Campaign not found</h1>
          <Button variant="invofy" size="invofy" asChild>
            <Link to="/brand">Back to dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const remaining = Number(campaign.funded_amount) - Number(campaign.spent_amount);
  const pct = Number(campaign.funded_amount) > 0 ? (Number(campaign.spent_amount) / Number(campaign.funded_amount)) * 100 : 0;
  const checklist = parseChecklist(campaign.checklist);
  const assets = parseStringArray(campaign.asset_urls);
  const links = parseStringArray(campaign.links);
  const days = daysRemaining(campaign.deadline);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <Link to="/brand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <div className="relative rounded-[34px] overflow-hidden mb-8 aspect-[21/9] max-md:aspect-[4/3]">
          <img
            src={campaignImage(campaign.id)}
            alt={campaign.title}
            className="w-full h-full object-cover"
            decoding="async"
          />
          <div className="absolute top-5 right-5">
            <StatusBadge status={campaign.status} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-8 max-md:p-6 bg-gradient-to-t from-black/75 to-transparent">
            <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80 mb-1">
              {campaign.brand_name} · {days} days left
            </p>
            <h1 className="font-display text-4xl max-md:text-2xl font-bold text-white">{campaign.title}</h1>
          </div>
        </div>

        {/* Campaign stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <MetricTile label="Creators" value={String(stats.creators)} />
          <MetricTile label="Videos" value={String(stats.videos)} />
          <MetricTile label="Verified views" value={formatViews(stats.views)} />
          <MetricTile label="Interactions" value={formatViews(stats.interactions)} />
          <MetricTile label="Engagement" value={formatPercent(stats.engagement)} />
          <MetricTile label="Your CPM" value={`$${stats.effectiveCpm.toFixed(2)}`} />
        </div>
        <div className="flex flex-wrap gap-3 mb-12">
          <VerdictPill verdict={cpmVerdict(stats.effectiveCpm)} />
          <VerdictPill verdict={engagementVerdict(stats.engagement)} />
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            {/* Brief */}
            <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-6 mb-6">
              {[
                ['Topic', campaign.topic],
                ['Angle', campaign.angle],
                ['Must include', campaign.must_include],
                ['Avoid', campaign.avoid],
                ['Hashtags', campaign.hashtags],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">{label}</p>
                    <p className="leading-relaxed">{value}</p>
                  </div>
                ))}
              {checklist.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Checklist</p>
                  <ul className="flex flex-col gap-1.5">
                    {checklist.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" /> {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map((l) => (
                    <a
                      key={l}
                      href={l}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold bg-white border border-[#f1f1f1] rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" /> {new URL(l).hostname}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {assets.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-10">
                {assets.map((a) => (
                  <SignedImage key={a} path={a} alt="Campaign asset" className="w-full aspect-square object-cover rounded-[20px]" />
                ))}
              </div>
            )}

            <h2 className="font-display text-2xl font-bold mb-6">
              Submissions <span className="text-muted-foreground font-normal">({submissions.length})</span>
            </h2>
            {submissions.length === 0 ? (
              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 text-muted-foreground">
                {campaign.status === 'open' ? 'Creators are browsing now.' : 'Fund the campaign to make it visible.'}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {submissions.map((s) => {
                  const creator = creators[s.creator_id];
                  const eng = Number(s.engagement_rate) || (Number(s.verified_views) ? (Number(s.likes) + Number(s.comments) + Number(s.shares)) / Number(s.verified_views) : 0);
                  const results = parseChecklistResults(s.checklist_results);
                  const subCpm = cpm(s.earnings, s.verified_views);
                  return (
                    <div key={s.id} className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 flex flex-col gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {creator?.avatar_url ? (
                            <SignedImage path={creator.avatar_url} alt={s.creator_name} className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <img src={campaignImage(s.creator_id)} alt={s.creator_name} className="h-12 w-12 rounded-full object-cover" />
                          )}
                          <div className="min-w-0">
                            <Link to={`/brand/creators/${s.creator_id}`} className="font-semibold hover:underline">
                              {s.creator_name || 'Creator'}
                            </Link>
                            <p className="text-sm text-muted-foreground truncate">
                              {s.tiktok_handle} · {PLATFORM_LABELS[s.platform] ?? s.platform}
                              {creator?.rate_per_video ? ` · ${formatMoney(creator.rate_per_video)}/video` : ''}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <MetricTile label="Views" value={formatViews(s.verified_views)} />
                        <MetricTile label="Likes" value={formatViews(s.likes)} />
                        <MetricTile label="Comments" value={formatViews(s.comments)} />
                        <MetricTile label="Shares" value={formatViews(s.shares)} />
                        <MetricTile label="Engagement" value={formatPercent(eng)} />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <VerdictPill verdict={cpmVerdict(subCpm)} />
                        <VerdictPill verdict={engagementVerdict(eng)} />
                      </div>

                      {results.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                          {results.map((r) => (
                            <li
                              key={r.id}
                              className={`text-xs font-semibold rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 ${
                                r.met ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {r.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {r.label}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                          Watch video
                        </a>
                        <span className="text-sm text-muted-foreground">{formatMoney(s.earnings)} earned</span>
                        <div className="flex-1" />
                        <Button variant="invofyOutline" size="sm" onClick={() => message(s.creator_id, s.creator_name)} disabled={busy}>
                          <MessageSquare className="h-4 w-4 mr-1.5" /> Message
                        </Button>
                        {s.status !== 'rejected' && (
                          <Button variant="invofyOutline" size="sm" onClick={() => review(s, 'rejected')} disabled={busy}>
                            Reject
                          </Button>
                        )}
                        {s.status === 'rejected' && (
                          <Button variant="invofy" size="sm" onClick={() => review(s, 'approved')} disabled={busy}>
                            Re-approve
                          </Button>
                        )}
                      </div>
                      {s.status === 'rejected' && s.rejection_reason && (
                        <p className="text-sm text-rose-600">Rejected: {s.rejection_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Escrow sidebar */}
          <aside className="w-full lg:w-96 shrink-0">
            <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5 lg:sticky lg:top-24">
              <h2 className="font-display text-xl font-bold">Escrow</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-semibold">{formatRate(campaign.rate_per_1k)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Started</span>
                <span className="font-semibold">{formatDate(campaign.started_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time left</span>
                <span className="font-semibold">{days} days</span>
              </div>
              <div>
                <div className="h-2 rounded-full bg-[#efefef] overflow-hidden mb-2">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spent {formatMoney(campaign.spent_amount)}</span>
                  <span className="font-semibold">{formatMoney(remaining)} left</span>
                </div>
              </div>
              {campaign.status === 'draft' && (
                <Button variant="invofy" size="invofy" onClick={fund} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Fund {formatMoney(campaign.budget)} & publish
                </Button>
              )}
              {campaign.status === 'open' && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Campaigns run a minimum of 10 days. Give it more time instead of stopping it.
                  </p>
                  <div className="flex gap-2">
                    {[7, 14, 30].map((d) => (
                      <Button key={d} variant="invofyOutline" size="sm" onClick={() => extend(d)} disabled={busy}>
                        <CalendarPlus className="h-4 w-4 mr-1.5" /> {d}d
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BrandCampaignDetail;
