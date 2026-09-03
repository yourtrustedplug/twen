import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Submission } from '@/types/unignored';
import { formatMoney, formatDate, formatRate, formatViews } from '@/lib/format';
import { campaignImage } from '@/lib/campaign-image';
import { Loader2, ArrowLeft } from 'lucide-react';

const CreatorCampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
    setCampaign((c as Campaign) ?? null);
    if (c && user) {
      const { data: s } = await supabase
        .from('submissions')
        .select('*')
        .eq('campaign_id', id)
        .eq('creator_id', user.id)
        .maybeSingle();
      setSubmission((s as Submission) ?? null);
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!campaign || !user) return;
    const trimmed = url.trim();
    if (!/^https:\/\/(www\.)?tiktok\.com\/.+/.test(trimmed)) {
      toast({ title: 'That doesn\'t look like a TikTok link', description: 'Paste the full link to your posted video.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('submissions').insert({
      campaign_id: campaign.id,
      creator_id: user.id,
      tiktok_url: trimmed,
      creator_name: profile?.full_name || 'Creator',
      tiktok_handle: profile?.tiktok_handle || '@unknown',
      status: 'submitted',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Submitted', description: 'The brand reviews it before it earns. Views verify on a schedule.' });
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
          <h1 className="font-display text-3xl font-bold mb-4">Campaign not found or no longer open</h1>
          <Button variant="invofy" size="invofy" asChild>
            <Link to="/creator">Back to browse</Link>
          </Button>
        </main>
      </div>
    );
  }

  const remaining = Number(campaign.funded_amount) - Number(campaign.spent_amount);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
        <Link to="/creator" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="relative rounded-[34px] overflow-hidden mb-8 aspect-[16/9]">
          <img
            src={campaignImage(campaign.id)}
            alt={`${campaign.brand_name} campaign`}
            width={768}
            height={576}
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-5 right-5">
            <StatusBadge status={campaign.status} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-8 max-md:p-6 bg-gradient-to-t from-black/75 to-transparent">
            <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80 mb-1">
              {campaign.brand_name} · {formatDate(campaign.deadline)}
            </p>
            <h1 className="font-display text-4xl max-md:text-2xl font-bold text-white">{campaign.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-6">
            <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Rate</p>
            <p className="font-display text-2xl font-bold">{formatRate(campaign.rate_per_1k)}</p>
          </div>
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-6">
            <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Remaining</p>
            <p className="font-display text-2xl font-bold">{formatMoney(remaining)}</p>
          </div>
        </div>

        <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-6 mb-10">
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

        {submission ? (
          <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="font-display text-2xl font-bold">Your submission</h2>
              <StatusBadge status={submission.status} />
            </div>
            <a href={submission.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
              {submission.tiktok_url}
            </a>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
              <span className="font-semibold text-foreground">{formatViews(submission.verified_views)} verified views</span>
              <span>{formatMoney(submission.earnings)} earned</span>
              {submission.last_verified_at && <span>Last checked {formatDate(submission.last_verified_at)}</span>}
            </div>
            {submission.status === 'rejected' && submission.rejection_reason && (
              <p className="text-sm text-rose-600 mt-4">Rejected: {submission.rejection_reason}</p>
            )}
            {submission.status === 'submitted' && (
              <p className="text-sm text-muted-foreground mt-4">
                Waiting for brand review. It starts earning once approved.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5">
            <h2 className="font-display text-2xl font-bold">Post it, then drop the link</h2>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tiktok-url">TikTok video link</Label>
              <Input
                id="tiktok-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@you/video/..."
              />
            </div>
            <div>
              <Button variant="invofy" size="invofy" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit for review
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorCampaignDetail;
