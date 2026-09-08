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
import type { Json } from '@/integrations/supabase/types';
import {
  PLATFORMS,
  PLATFORM_LABELS,
  NICHE_LABELS,
  parseChecklist,
  parseChecklistResults,
  parseStringArray,
  parseListText,
  type ChecklistResult,
} from '@/types/unignored';
import { formatMoney, formatDate, formatRate, formatViews } from '@/lib/format';
import { useCampaignCover } from '@/lib/campaign-image';
import { canApplyToCampaign, daysRemaining, MIN_APPLY_DAYS } from '@/lib/metrics';
import { signedUrl } from '@/lib/storage';
import { isOnboardingComplete } from '@/lib/onboarding';
import { OnboardingRequired } from '@/components/OnboardingRequired';
import { BrandKitCard } from '@/components/BrandKitCard';
import { Loader2, ArrowLeft, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { kitFromCampaign } from '@/lib/brand-kit';
import { isValidPlatformUrl, platformUrlHint, type SocialPlatform } from '@/lib/platform-links';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';

const CreatorCampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [submitting, setSubmitting] = useState(false);
  const [checklistResults, setChecklistResults] = useState<ChecklistResult[]>([]);
  const coverSrc = useCampaignCover(campaign?.id ?? 'x', campaign?.cover_image);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
    const camp = (c as Campaign) ?? null;
    setCampaign(camp);
    if (camp) {
      const fromChecklist = parseChecklist(camp.checklist);
      const fromMust = parseListText(camp.must_include).map((label) => ({
        id: crypto.randomUUID(),
        label,
        met: false,
      }));
      const items =
        fromChecklist.length > 0
          ? fromChecklist.map((i) => ({ ...i, met: false }))
          : fromMust;
      setChecklistResults(items);
      const plats = parseStringArray(camp.platforms);
      if (plats[0]) setPlatform(plats[0]);
    }
    if (camp && user) {
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

  useEffect(() => { load(); }, [load]);

  const toggleCheck = (itemId: string) =>
    setChecklistResults((prev) =>
      prev.map((r) => (r.id === itemId ? { ...r, met: !r.met } : r))
    );

  const submit = async () => {
    if (!campaign || !user) return;
    if (!isOnboardingComplete(profile)) {
      toast({
        title: 'Finish onboarding first',
        description: 'Complete your profile before submitting to a campaign.',
      });
      return;
    }
    if (!canApplyToCampaign(campaign.deadline)) {
      toast({
        title: 'Too late to apply',
        description: `Campaigns close to new submissions when fewer than ${MIN_APPLY_DAYS} days remain.`,
        variant: 'destructive',
      });
      return;
    }
    const trimmed = url.trim();
    const plat = platform as SocialPlatform;
    if (plat !== 'tiktok' && plat !== 'instagram') {
      toast({ title: 'Pick a platform', description: 'Choose TikTok or Instagram.', variant: 'destructive' });
      return;
    }
    if (!isValidPlatformUrl(plat, trimmed)) {
      toast({
        title: 'Invalid link',
        description: `Paste your real ${plat === 'tiktok' ? 'TikTok' : 'Instagram'} URL, e.g. ${platformUrlHint(plat)}`,
        variant: 'destructive',
      });
      return;
    }
    const connected =
      plat === 'tiktok' ? profile?.tiktok_connected_at : profile?.instagram_connected_at;
    if (!connected) {
      toast({
        title: `Connect ${plat === 'tiktok' ? 'TikTok' : 'Instagram'} first`,
        description: 'We verify the post is yours via Meta/TikTok. Connect the account in your profile.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('verify-submission', {
      body: {
        campaign_id: campaign.id,
        url: trimmed,
        platform: plat,
        checklist_results: checklistResults as unknown as Json,
      },
    });
    setSubmitting(false);
    if (error || data?.error || !data?.ok) {
      toast({
        title: 'Could not verify link',
        description: edgeFunctionErrorMessage(error, data, 'TikTok/Meta could not confirm that post.'),
        variant: 'destructive',
      });
      return;
    }
    const viewsHint =
      typeof data?.verification?.views_at_submit === 'number'
        ? ` Platform shows ${Number(data.verification.views_at_submit).toLocaleString()} views.`
        : '';
    toast({
      title: 'Submitted for review',
      description: `Link confirmed on your account.${viewsHint} A moderator reviews before it earns.`,
    });
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
  const assetUrls = parseStringArray(campaign.asset_urls as unknown);
  const campaignPlatforms = parseStringArray(campaign.platforms);
  const mustItems = parseListText(campaign.must_include);
  const avoidItems = parseListText(campaign.avoid);
  const openForApply = canApplyToCampaign(campaign.deadline);
  const brandKit = kitFromCampaign(campaign);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
        <Link to="/creator" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="relative rounded-[34px] overflow-hidden mb-8 aspect-[16/9]">
          <img
            src={coverSrc}
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
              {campaign.brand_name} · {formatDate(campaign.deadline)} · {daysRemaining(campaign.deadline)} days left
            </p>
            <h1 className="font-display text-4xl max-md:text-2xl font-bold text-white">{campaign.title}</h1>
          </div>
        </div>

        {(campaign.niche || campaignPlatforms.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {campaign.niche && (
              <span className="text-xs font-semibold bg-[#fafafa] border border-[#f1f1f1] rounded-full px-4 py-2">
                {NICHE_LABELS[campaign.niche] ?? campaign.niche}
              </span>
            )}
            {campaignPlatforms.map((p) => (
              <span key={p} className="text-xs font-semibold bg-[#fafafa] border border-[#f1f1f1] rounded-full px-4 py-2">
                {PLATFORM_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        )}

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

        <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-6 mb-6">
          {campaign.topic && (
            <div>
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Topic</p>
              <p className="leading-relaxed whitespace-pre-wrap">{campaign.topic}</p>
            </div>
          )}
          {campaign.angle && (
            <div>
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Angle</p>
              <p className="leading-relaxed whitespace-pre-wrap">{campaign.angle}</p>
            </div>
          )}
          {mustItems.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Must include</p>
              <ul className="flex flex-col gap-2">
                {mustItems.map((item) => (
                  <li key={item} className="text-sm leading-relaxed">· {item}</li>
                ))}
              </ul>
            </div>
          )}
          {avoidItems.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">Avoid</p>
              <ul className="flex flex-col gap-2">
                {avoidItems.map((item) => (
                  <li key={item} className="text-sm leading-relaxed">· {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <BrandKitCard kit={brandKit} />

        {assetUrls.length > 0 && (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 mb-6">
            <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-4">Campaign materials</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assetUrls.map((path) => (
                <AssetThumb key={path} path={path} />
              ))}
            </div>
          </div>
        )}

        {checklistResults.length > 0 && !submission && openForApply && (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 mb-6">
            <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-4">
              You will declare these on submit
            </p>
            <ul className="flex flex-col gap-3">
              {checklistResults.map((item) => (
                <li key={item.id} className="text-sm">{item.label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submission panel */}
        {submission ? (
          <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="font-display text-2xl font-bold">Your submission</h2>
              <StatusBadge status={submission.status} />
            </div>
            <a href={submission.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
              {submission.tiktok_url}
            </a>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
              <span className="font-semibold text-foreground">{formatViews(submission.verified_views)} verified views</span>
              <span>{formatMoney(submission.earnings)} earned</span>
              {submission.posted_at && <span>Posted {formatDate(submission.posted_at)}</span>}
              {submission.link_verified_at && <span>Link verified</span>}
              {submission.last_verified_at && <span>Last checked {formatDate(submission.last_verified_at)}</span>}
            </div>
            {submission.status === 'rejected' && submission.rejection_reason && (
              <p className="text-sm text-rose-600 mt-4">Rejected: {submission.rejection_reason}</p>
            )}
            {submission.status === 'submitted' && (
              <p className="text-sm text-muted-foreground mt-4">
                Waiting for moderator review. You&apos;ll earn once it&apos;s approved and views are verified.
              </p>
            )}
            {submission.status === 'approved' && (
              <p className="text-sm text-emerald-600 mt-4">
                Approved — live. Earnings accrue as views are verified.
              </p>
            )}
            {/* Show submitted checklist results */}
            {parseChecklistResults(submission.checklist_results).length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">Your declared checklist</p>
                <ul className="flex flex-col gap-2">
                  {parseChecklistResults(submission.checklist_results).map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-sm">
                      {r.met ? (
                        <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={r.met ? '' : 'text-muted-foreground'}>{r.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : !isOnboardingComplete(profile) ? (
          <OnboardingRequired action="submit to a campaign" />
        ) : !openForApply ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Applications closed</h2>
            <p className="text-sm text-muted-foreground">
              Fewer than {MIN_APPLY_DAYS} days remain on this campaign. You can no longer submit.
            </p>
          </div>
        ) : (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5">
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Post it, then drop the link</h2>
              <p className="text-sm text-muted-foreground">
                We check the link with TikTok or Meta (views, publish date, and that it&apos;s on your
                connected account) before a moderator reviews it.
              </p>
            </div>

            {/* Platform picker */}
            <div className="flex flex-col gap-2">
              <Label>Platform</Label>
              <div className="flex flex-wrap gap-2">
                {(campaignPlatforms.length ? campaignPlatforms : [...PLATFORMS]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={cn(
                      'text-sm font-semibold px-4 py-2 rounded-full border transition-colors',
                      platform === p
                        ? 'bg-primary text-primary-foreground border-transparent'
                        : 'border-[#e0e0e0] text-muted-foreground hover:border-foreground hover:text-foreground'
                    )}
                  >
                    {PLATFORM_LABELS[p] ?? p}
                  </button>
                ))}
              </div>
            </div>

            {/* Video URL */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="video-url">Video link</Label>
              <Input
                id="video-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={platformUrlHint(platform as SocialPlatform)}
              />
              <p className="text-xs text-muted-foreground">
                Must be a video you posted on your connected {platform === 'instagram' ? 'Instagram' : 'TikTok'}{' '}
                account during this campaign.
              </p>
            </div>

            {/* Self-declared checklist */}
            {checklistResults.length > 0 && (
              <div className="flex flex-col gap-3">
                <Label>Declare what you included</Label>
                {checklistResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center gap-3 text-sm text-left"
                  >
                    {item.met ? (
                      <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div>
              <Button variant="invofy" size="invofy" onClick={submit} disabled={submitting || !url.trim()}>
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

/** Renders a signed URL for a storage asset or falls back to filename */
const AssetThumb = ({ path }: { path: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    signedUrl(path).then((url) => {
      if (url) setSrc(url);
    });
  }, [path]);

  const name = path.split('/').pop() ?? path;
  if (!src) {
    return (
      <div className="rounded-[16px] bg-white border border-[#e9e9e9] aspect-square flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
        {name}
      </div>
    );
  }

  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  if (isImage) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="rounded-[16px] overflow-hidden block aspect-square">
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </a>
    );
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-[16px] bg-white border border-[#e9e9e9] flex items-center justify-center gap-2 text-sm font-medium text-primary underline p-3 text-center"
    >
      <ExternalLink className="h-4 w-4 shrink-0" /> {name}
    </a>
  );
};

export default CreatorCampaignDetail;
