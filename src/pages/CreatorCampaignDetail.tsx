import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Submission } from '@/types/unignored';
import type { Json } from '@/integrations/supabase/types';
import {
  NICHE_LABELS,
  PLATFORM_LABELS,
  parseChecklist,
  parseStringArray,
  parseListText,
  type ChecklistResult,
} from '@/types/unignored';
import { formatMoney, formatDate, formatRate } from '@/lib/format';
import CampaignCover from '@/components/CampaignCover';
import { ErrorPoster } from '@/components/ErrorPoster';
import { PlatformMark } from '@/components/creator/PlatformMark';
import {
  canApplyToCampaign,
  daysRemaining,
  MIN_APPLY_DAYS,
  payoutDate,
  submitDeadline,
} from '@/lib/metrics';
import { signedUrl } from '@/lib/storage';
import { isOnboardingComplete } from '@/lib/onboarding';
import { OnboardingRequired } from '@/components/OnboardingRequired';
import { BrandKitCard } from '@/components/BrandKitCard';
import { SubmitCampaignPanel, SubmissionStatus } from '@/components/creator/SubmitCampaignPanel';
import { Loader2, ExternalLink } from 'lucide-react';
import { kitFromCampaign } from '@/lib/brand-kit';
import { isValidPlatformUrl, platformUrlHint, type SocialPlatform } from '@/lib/platform-links';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { isPro } from '@/lib/plan';
import {
  allChecksDeclared,
  allowedSubmitPlatforms,
  canReplaceSubmission,
  isPlatformConnected,
  pickSubmitPlatform,
} from '@/lib/submit-campaign';

const CreatorCampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const composing = searchParams.get('submit') === '1';
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [submitting, setSubmitting] = useState(false);
  const [checklistResults, setChecklistResults] = useState<ChecklistResult[]>([]);

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

  useEffect(() => {
    if (!campaign) return;
    setPlatform(pickSubmitPlatform(parseStringArray(campaign.platforms), profile));
  }, [campaign, profile?.tiktok_connected_at, profile?.instagram_connected_at]);

  useEffect(() => {
    load();
  }, [load]);

  const setComposing = (open: boolean) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (open) next.set('submit', '1');
        else next.delete('submit');
        return next;
      },
      { replace: true },
    );
  };

  const toggleCheck = (itemId: string) =>
    setChecklistResults((prev) =>
      prev.map((r) => (r.id === itemId ? { ...r, met: !r.met } : r)),
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
    if (!isPlatformConnected(profile, plat)) {
      toast({
        title: `Connect ${plat === 'tiktok' ? 'TikTok' : 'Instagram'} first`,
        description: 'We verify the post is yours via Meta/TikTok. Connect the account in your profile.',
        variant: 'destructive',
      });
      return;
    }
    if (!allChecksDeclared(checklistResults)) {
      toast({
        title: 'Tick the checklist',
        description: 'Declare every requirement before submitting.',
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
        description: await edgeFunctionErrorMessage(error, data, 'TikTok/Meta could not confirm that post.'),
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
    setUrl('');
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
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <ErrorPoster
          underChrome
          documentTitle="Campaign not found | Twen"
          watermark="404"
          eyebrow="Campaign"
          title="This brief isn't open."
          description="The campaign may have closed, or this link is wrong."
          actions={[{ label: 'Back to browse', href: '/creator' }]}
        />
      </div>
    );
  }

  const remaining = Number(campaign.funded_amount) - Number(campaign.spent_amount);
  const assetUrls = parseStringArray(campaign.asset_urls as unknown);
  const campaignPlatforms = parseStringArray(campaign.platforms);
  const acceptedPlatforms = allowedSubmitPlatforms(campaignPlatforms);
  const mustItems = parseListText(campaign.must_include);
  const avoidItems = parseListText(campaign.avoid);
  const openForApply = canApplyToCampaign(campaign.deadline);
  const brandKit = kitFromCampaign(campaign);
  const resubmit = canReplaceSubmission(submission?.status);
  const showForm = !submission || resubmit;
  const onboarded = isOnboardingComplete(profile);
  const canSubmitNow = showForm && onboarded && openForApply;
  const showSubmitCta = canSubmitNow && !composing;
  const onSubmitScreen = canSubmitNow && composing;
  const instantPayout = isPro(profile);
  const submitBy = submitDeadline(campaign.deadline);
  const payOn = payoutDate(campaign.deadline, instantPayout);
  const submitDaysLeft = daysRemaining(submitBy);

  const statusBlock = () => {
    if (submission && !resubmit) return <SubmissionStatus submission={submission} />;
    if (!onboarded) return <OnboardingRequired action="submit to a campaign" />;
    if (!openForApply) {
      return (
        <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-10 text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Applications closed</h2>
          <p className="text-sm text-muted-foreground">
            The deadline for submitting has passed. Fewer than {MIN_APPLY_DAYS} days remain on this campaign.
          </p>
        </div>
      );
    }
    return null;
  };

  const facts = [
    {
      label: 'Deadline for submitting',
      value: formatDate(submitBy),
      hint: openForApply ? `${submitDaysLeft} day${submitDaysLeft === 1 ? '' : 's'} left` : 'Closed',
    },
    {
      label: 'Payout date',
      value: formatDate(payOn),
      hint: instantPayout ? 'When the campaign ends' : '7 days after the campaign ends',
    },
    { label: 'Rate', value: formatRate(campaign.rate_per_1k) },
    { label: 'Remaining', value: formatMoney(remaining) },
  ];

  if (onSubmitScreen) {
    return (
      <div className="h-dvh bg-background flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 md:px-8 py-6 md:py-8">
            <SubmitCampaignPanel
              campaignPlatforms={campaignPlatforms}
              checklist={checklistResults}
              onToggleCheck={toggleCheck}
              url={url}
              onUrlChange={setUrl}
              platform={platform}
              onPlatformChange={setPlatform}
              onSubmit={submit}
              submitting={submitting}
              profile={profile}
              ratePer1k={Number(campaign.rate_per_1k)}
              isResubmit={resubmit}
              rejectionReason={submission?.rejection_reason}
              onDismiss={() => setComposing(false)}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <AppHeader />
      <div className="relative h-36 md:h-44 shrink-0 overflow-hidden">
        <CampaignCover
          id={campaign.id}
          coverImage={campaign.cover_image}
          alt={`${campaign.brand_name} campaign`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4">
          <StatusBadge status={campaign.status} />
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 md:px-8 py-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80 mb-0.5">
            {[campaign.brand_name, campaign.niche ? NICHE_LABELS[campaign.niche] ?? campaign.niche : '']
              .filter(Boolean)
              .join(' · ')}
          </p>
          <h1 className="font-display text-3xl max-md:text-2xl font-bold text-white">{campaign.title}</h1>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 md:py-5 flex flex-col gap-4">
          <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] gap-4 items-start">
            <div className="flex flex-col gap-4">
              <BrandKitCard
                kit={brandKit}
                title="About the brand"
                className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] p-5 flex flex-col gap-4"
              />
              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] p-5 flex flex-col gap-4">
                {campaign.topic && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">
                      Topic
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{campaign.topic}</p>
                  </div>
                )}
                {campaign.angle && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">
                      Angle
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{campaign.angle}</p>
                  </div>
                )}
                {(mustItems.length > 0 || avoidItems.length > 0) && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {mustItems.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">
                          Must include
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {mustItems.map((item) => (
                            <li key={item} className="text-sm leading-relaxed">
                              · {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {avoidItems.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">
                          Avoid
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {avoidItems.map((item) => (
                            <li key={item} className="text-sm leading-relaxed">
                              · {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] p-4 flex flex-col gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">
                    Platforms accepted
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {acceptedPlatforms.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-2 bg-white border border-[#f1f1f1] rounded-full pl-2 pr-3 py-1.5"
                      >
                        <PlatformMark platform={p} className="w-5 h-5" />
                        <span className="text-sm font-semibold">{PLATFORM_LABELS[p] ?? p}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-[#f1f1f1] rounded-[16px] bg-white border border-[#f1f1f1]">
                  {facts.map((fact) => (
                    <div key={fact.label} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground">
                          {fact.label}
                        </p>
                        {fact.hint && <p className="text-xs text-muted-foreground mt-0.5">{fact.hint}</p>}
                      </div>
                      <p className="font-display text-base font-bold text-right leading-tight shrink-0">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {assetUrls.length > 0 && (
                <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] p-4">
                  <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">
                    Campaign materials
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {assetUrls.map((path) => (
                      <AssetThumb key={path} path={path} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {statusBlock()}
        </div>
      </main>

      {showSubmitCta && (
        <div className="shrink-0 border-t border-[#f1f1f1] bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-6xl mx-auto">
            <Button
              type="button"
              variant="invofy"
              size="invofy"
              className="w-full"
              onClick={() => setComposing(true)}
            >
              {resubmit ? 'Submit a new video' : 'Submit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AssetThumb = ({ path }: { path: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    signedUrl(path).then((next) => {
      if (next) setSrc(next);
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
