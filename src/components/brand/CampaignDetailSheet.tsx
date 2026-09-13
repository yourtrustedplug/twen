import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricTile } from '@/components/MetricTile';
import SignedImage from '@/components/SignedImage';
import { BrandKitCard } from '@/components/BrandKitCard';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Submission, ProfileRow } from '@/types/unignored';
import { PLATFORM_LABELS, parseChecklist, parseChecklistResults, parseStringArray } from '@/types/unignored';
import { formatMoney, formatDate, formatViews, formatRate } from '@/lib/format';
import { cartoonAvatar } from '@/lib/cartoon-avatar';
import CampaignCover from '@/components/CampaignCover';
import { formatPercent, daysRemaining } from '@/lib/metrics';
import { isPro } from '@/lib/plan';
import { kitFromCampaign } from '@/lib/brand-kit';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { campaignCheckoutUrlIfReusable } from '@/lib/nardopay-checkout';
import { usePlanCheckout } from '@/hooks/use-plan-checkout';
import { Loader2, ShieldCheck, CalendarPlus, Check, X, MessageSquare, Wallet } from 'lucide-react';

type Props = {
  campaignId: string | null;
  seed?: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

export function CampaignDetailSheet({ campaignId, seed, open, onOpenChange, onUpdated }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { startPlanCheckout, busy: upgrading } = usePlanCheckout();
  const [campaign, setCampaign] = useState<Campaign | null>(seed ?? null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [creators, setCreators] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const brandIsPro = isPro(profile);

  const load = useCallback(async () => {
    if (!campaignId || !user) return;
    setLoading(true);
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).eq('brand_id', user.id).maybeSingle(),
      supabase.from('submissions').select('*').eq('campaign_id', campaignId).order('verified_views', { ascending: false }),
    ]);
    setCampaign((c as Campaign) ?? null);
    const subs = (s as Submission[]) ?? [];
    setSubmissions(subs);
    const ids = [...new Set(subs.map((x) => x.creator_id))];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('*').in('id', ids);
      setCreators(Object.fromEntries(((p as ProfileRow[]) ?? []).map((x) => [x.id, x])));
    } else {
      setCreators({});
    }
    setLoading(false);
  }, [campaignId, user]);

  useEffect(() => {
    if (!open || !campaignId) return;
    if (seed?.id === campaignId) {
      setCampaign(seed);
    } else {
      setCampaign(null);
      setSubmissions([]);
      setCreators({});
    }
    load();
  }, [open, campaignId, seed, load]);

  const fund = async () => {
    if (!campaign) return;
    const cached = campaignCheckoutUrlIfReusable(campaign);
    if (cached) {
      window.location.href = cached;
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-campaign-checkout', {
      body: { campaignId: campaign.id },
    });
    if (error || data?.error || !data?.url) {
      setBusy(false);
      toast({
        title: 'Funding failed',
        description: await edgeFunctionErrorMessage(error, data, 'Could not start checkout'),
        variant: 'destructive',
      });
      return;
    }
    window.location.href = data.url as string;
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
    await load();
    onUpdated?.();
  };

  const closeCampaign = async () => {
    if (!campaign) return;
    setBusy(true);
    const { error } = await supabase.rpc('close_campaign', { p_campaign_id: campaign.id });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not close', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Campaign closed', description: 'Unused escrow is queued to be returned.' });
    await load();
    onUpdated?.();
  };

  const message = async (creatorId: string, creatorName: string) => {
    if (!user) return;
    if (!brandIsPro) {
      startPlanCheckout('brand');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('conversations').upsert(
      {
        brand_id: user.id,
        creator_id: creatorId,
        campaign_id: campaign?.id ?? null,
        brand_name: profile?.company_name || profile?.full_name || 'Brand',
        creator_name: creatorName,
      },
      { onConflict: 'brand_id,creator_id' },
    );
    setBusy(false);
    if (error) {
      toast({ title: 'Could not start the chat', description: error.message, variant: 'destructive' });
      return;
    }
    window.location.assign('/messages');
  };

  const stats = useMemo(() => {
    const live = submissions.filter((s) => s.status !== 'rejected');
    const views = live.reduce((n, s) => n + Number(s.verified_views), 0);
    const likes = live.reduce((n, s) => n + Number(s.likes), 0);
    const comments = live.reduce((n, s) => n + Number(s.comments), 0);
    const shares = live.reduce((n, s) => n + Number(s.shares), 0);
    return {
      creators: new Set(submissions.map((s) => s.creator_id)).size,
      videos: submissions.length,
      views,
      likes,
      comments,
      engagement: views ? (likes + comments + shares) / views : 0,
    };
  }, [submissions]);

  const remaining = campaign ? Number(campaign.funded_amount) - Number(campaign.spent_amount) : 0;
  const pct =
    campaign && Number(campaign.funded_amount) > 0
      ? (Number(campaign.spent_amount) / Number(campaign.funded_amount)) * 100
      : 0;
  const checklist = campaign ? parseChecklist(campaign.checklist) : [];
  const assets = campaign ? parseStringArray(campaign.asset_urls) : [];
  const days = campaign ? daysRemaining(campaign.deadline) : 0;
  const brandKit = campaign ? kitFromCampaign(campaign) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="space-y-1 border-b border-[#f1f1f1] px-5 py-4 pr-12 text-left">
          <SheetTitle className="font-display text-xl truncate">{campaign?.title ?? 'Campaign'}</SheetTitle>
          <SheetDescription>
            {campaign
              ? campaign.status === 'closed'
                ? `${campaign.brand_name} · Ended`
                : `${campaign.brand_name} · ${days} days left`
              : 'Campaign details'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && !campaign ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !campaign ? (
            <p className="text-muted-foreground py-10">This campaign isn't on the board.</p>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="relative overflow-hidden rounded-[22px] aspect-[16/9]">
                <CampaignCover
                  id={campaign.id}
                  coverImage={campaign.cover_image}
                  alt={campaign.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={campaign.status} />
                </div>
              </div>

              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[22px] p-5 flex flex-col gap-4">
                <h2 className="font-display text-lg font-bold">Escrow</h2>
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
                      Campaigns run at least 15 days. You can extend anytime. Unused escrow is returned after the deadline — you cannot cancel early.
                    </p>
                    <div className="flex gap-2">
                      {[7, 14, 30].map((d) => (
                        <Button key={d} variant="invofyOutline" size="sm" onClick={() => extend(d)} disabled={busy}>
                          <CalendarPlus className="h-4 w-4 mr-1.5" /> {d}d
                        </Button>
                      ))}
                    </div>
                    {days === 0 && (
                      <Button variant="invofy" size="invofy" onClick={closeCampaign} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
                        Close and return unused escrow
                      </Button>
                    )}
                  </>
                )}
                {campaign.status === 'closed' && (
                  <p className="text-xs text-muted-foreground">
                    {remaining > 0
                      ? `This campaign ended. ${formatMoney(remaining)} unused escrow is queued to be returned.`
                      : 'This campaign ended and used its full budget.'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricTile compact label="Creators" value={String(stats.creators)} />
                <MetricTile compact label="Videos" value={String(stats.videos)} />
                <MetricTile compact label="Verified views" value={formatViews(stats.views)} />
                <MetricTile compact label="Likes" value={formatViews(stats.likes)} />
                <MetricTile compact label="Comments" value={formatViews(stats.comments)} />
                <MetricTile compact label="Engagement" value={formatPercent(stats.engagement)} />
              </div>

              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[22px] p-5 flex flex-col gap-5">
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
                      <p className="leading-relaxed text-sm">{value}</p>
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
              </div>

              {brandKit && <BrandKitCard kit={brandKit} className="bg-[#fafafa] border border-[#f1f1f1] rounded-[22px] p-5 flex flex-col gap-5" />}

              {assets.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {assets.map((a) => (
                    <SignedImage
                      key={a}
                      path={a}
                      alt={`${campaign.title} campaign asset`}
                      className="w-full aspect-square object-cover rounded-[18px]"
                    />
                  ))}
                </div>
              )}

              <div>
                <h2 className="font-display text-xl font-bold mb-4">
                  Submissions <span className="text-muted-foreground font-normal">({submissions.length})</span>
                </h2>
                {submissions.length === 0 ? (
                  <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[22px] p-5 text-sm text-muted-foreground">
                    {campaign.status === 'open'
                      ? 'Creators are browsing now.'
                      : campaign.status === 'closed'
                        ? 'This campaign has ended.'
                        : 'Fund the campaign to make it visible.'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {submissions.map((s) => {
                      const creator = creators[s.creator_id];
                      const eng =
                        Number(s.engagement_rate) ||
                        (Number(s.verified_views)
                          ? (Number(s.likes) + Number(s.comments) + Number(s.shares)) / Number(s.verified_views)
                          : 0);
                      const results = parseChecklistResults(s.checklist_results);
                      return (
                        <div key={s.id} className="bg-white border border-[#f1f1f1] rounded-[22px] p-4 flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              {creator?.avatar_url ? (
                                <SignedImage path={creator.avatar_url} alt={s.creator_name} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <img src={cartoonAvatar(s.creator_id)} alt={s.creator_name} className="h-10 w-10 rounded-full object-cover" />
                              )}
                              <div className="min-w-0">
                                {brandIsPro ? (
                                  <Link to={`/brand/creators/${s.creator_id}`} className="font-semibold hover:underline">
                                    {s.creator_name || 'Creator'}
                                  </Link>
                                ) : (
                                  <p className="font-semibold">{s.creator_name || 'Creator'}</p>
                                )}
                                <p className="text-sm text-muted-foreground truncate">
                                  {s.tiktok_handle} · {PLATFORM_LABELS[s.platform] ?? s.platform}
                                </p>
                              </div>
                            </div>
                            <StatusBadge status={s.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <MetricTile compact label="Views" value={formatViews(s.verified_views)} />
                            <MetricTile compact label="Likes" value={formatViews(s.likes)} />
                            <MetricTile compact label="Comments" value={formatViews(s.comments)} />
                            <MetricTile compact label="Engagement" value={formatPercent(eng)} />
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
                            {brandIsPro ? (
                              <Button variant="invofyOutline" size="sm" onClick={() => message(s.creator_id, s.creator_name)} disabled={busy}>
                                <MessageSquare className="h-4 w-4 mr-1.5" /> Message
                              </Button>
                            ) : (
                              <Button variant="invofy" size="sm" onClick={() => startPlanCheckout('brand')} disabled={upgrading}>
                                {upgrading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                                Get Twen Plus
                              </Button>
                            )}
                          </div>
                          {s.status === 'submitted' && (
                            <p className="text-sm text-muted-foreground">Waiting for moderator review before it earns.</p>
                          )}
                          {s.status === 'rejected' && s.rejection_reason && (
                            <p className="text-sm text-rose-600">Rejected: {s.rejection_reason}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
