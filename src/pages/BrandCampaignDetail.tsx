import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Submission } from '@/types/unignored';
import { formatMoney, formatDate, formatViews, formatRate } from '@/lib/format';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

const REVIEW_WINDOW_DAYS = 3;

const BrandCampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).eq('brand_id', user.id).maybeSingle(),
      supabase.from('submissions').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
    ]);
    setCampaign((c as Campaign) ?? null);
    setSubmissions((s as Submission[]) ?? []);
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
    toast({ title: 'Campaign funded and live', description: `${formatMoney(campaign.budget)} is in escrow.` });
    load();
  };

  const close = async () => {
    if (!campaign) return;
    if (!window.confirm('Close this campaign? Unspent budget is refunded and submissions stop earning.')) return;
    setBusy(true);
    const { error } = await supabase.rpc('close_campaign', { p_campaign_id: campaign.id });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not close the campaign', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Campaign closed', description: 'Unspent budget has been returned.' });
    load();
  };

  const review = async (submission: Submission, status: 'approved' | 'rejected') => {
    const reason =
      status === 'rejected' ? window.prompt('Why is this off-brief? (shown to the creator)') ?? '' : null;
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <Link to="/brand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Brief */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="font-display text-4xl font-bold">{campaign.title}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-muted-foreground mb-8">
              {campaign.brand_name} · Deadline {formatDate(campaign.deadline)}
            </p>

            <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-6 mb-8">
              {[
                ['Topic', campaign.topic],
                ['Angle', campaign.angle],
                ['Must include', campaign.must_include],
                ['Avoid', campaign.avoid],
                ['Hashtags', campaign.hashtags],
                ['Ad disclosure', campaign.disclosure],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">{label}</p>
                    <p className="leading-relaxed">{value}</p>
                  </div>
                ))}
            </div>

            <h2 className="font-display text-2xl font-bold mb-6">
              Submissions <span className="text-muted-foreground font-normal">({submissions.length})</span>
            </h2>
            {submissions.length === 0 ? (
              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 text-muted-foreground">
                No submissions yet. {campaign.status === 'open' ? 'Creators are browsing now.' : 'Fund the campaign to make it visible.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {submissions.map((s) => (
                  <div key={s.id} className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold">{s.creator_name || 'Creator'}</p>
                        <p className="text-sm text-muted-foreground">{s.tiktok_handle}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <a
                      href={s.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline break-all"
                    >
                      {s.tiktok_url}
                    </a>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{formatViews(s.verified_views)} verified views</span>
                      <span>{formatMoney(s.earnings)} earned</span>
                      {s.last_verified_at && <span>Checked {formatDate(s.last_verified_at)}</span>}
                    </div>
                    {s.status === 'submitted' && (
                      <div className="flex gap-3">
                        <Button variant="invofy" size="sm" onClick={() => review(s, 'approved')} disabled={busy}>
                          Approve
                        </Button>
                        <Button variant="invofyOutline" size="sm" onClick={() => review(s, 'rejected')} disabled={busy}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {s.status === 'rejected' && s.rejection_reason && (
                      <p className="text-sm text-muted-foreground">Reason: {s.rejection_reason}</p>
                    )}
                  </div>
                ))}
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
                <span className="text-muted-foreground">Budget</span>
                <span className="font-semibold">{formatMoney(campaign.budget)}</span>
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
                  <Button variant="invofyOutline" size="invofy" onClick={close} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Close campaign & refund
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You have a {REVIEW_WINDOW_DAYS}-day review window on every submission. Anything off-brief gets rejected before it earns.
                  </p>
                </>
              )}
              {campaign.status === 'closed' && campaign.closed_at && (
                <p className="text-xs text-muted-foreground">
                  Closed {formatDate(campaign.closed_at)}. Unspent budget refunded; creator earnings release 7 days after close.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BrandCampaignDetail;
