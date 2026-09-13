import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { PlatformMark } from '@/components/creator/PlatformMark';
import type { Submission } from '@/types/unignored';
import { PLATFORM_LABELS, parseChecklistResults, type ChecklistResult } from '@/types/unignored';
import { formatMoney, formatDate, formatViews } from '@/lib/format';
import { creatorHomePath } from '@/lib/creator-home';
import { detectPlatformFromUrl, platformUrlHint, type SocialPlatform } from '@/lib/platform-links';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { stashSocialReturnPath } from '@/lib/social-return';
import { useToast } from '@/hooks/use-toast';
import {
  allChecksDeclared,
  allowedSubmitPlatforms,
  connectedSubmitPlatforms,
  examplePayout,
  isPlatformConnected,
  platformHandle,
  type ConnectedProfile,
  urlFieldState,
} from '@/lib/submit-campaign';
import { cn } from '@/lib/utils';
import { Check, CheckSquare, Loader2, Square } from 'lucide-react';

export function SubmissionStatus({ submission }: { submission: Submission }) {
  const declared = parseChecklistResults(submission.checklist_results);

  return (
    <div className="bg-white border border-[#f1f1f1] rounded-[24px] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="font-display text-2xl font-bold">Your submission</h2>
        <StatusBadge status={submission.status} />
      </div>
      <a
        href={submission.tiktok_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline break-all"
      >
        {submission.tiktok_url}
      </a>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-4">
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
        <p className="text-sm text-emerald-600 mt-4">Approved — live. Earnings accrue as views are verified.</p>
      )}
      {declared.length > 0 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">
            Your declared checklist
          </p>
          <ul className="flex flex-col gap-2">
            {declared.map((r) => (
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
      <Link
        to={creatorHomePath('mine')}
        className="inline-block mt-6 text-sm font-semibold text-primary underline underline-offset-2"
      >
        See my campaigns
      </Link>
    </div>
  );
}

export function SubmitCampaignPanel({
  campaignPlatforms,
  checklist,
  onToggleCheck,
  url,
  onUrlChange,
  platform,
  onPlatformChange,
  onSubmit,
  submitting,
  profile,
  ratePer1k,
  isResubmit = false,
  rejectionReason = null,
  onDismiss,
}: {
  campaignPlatforms: string[];
  checklist: ChecklistResult[];
  onToggleCheck: (id: string) => void;
  url: string;
  onUrlChange: (value: string) => void;
  platform: string;
  onPlatformChange: (value: SocialPlatform) => void;
  onSubmit: () => void;
  submitting: boolean;
  profile: ConnectedProfile | null | undefined;
  ratePer1k: number;
  isResubmit?: boolean;
  rejectionReason?: string | null;
  onDismiss?: () => void;
}) {
  const location = useLocation();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);

  const allowed = allowedSubmitPlatforms(campaignPlatforms);
  const connected = connectedSubmitPlatforms(campaignPlatforms, profile);
  const plat = (connected.includes(platform as SocialPlatform) ? platform : connected[0] ?? allowed[0]) as SocialPlatform;
  const checksReady = allChecksDeclared(checklist);
  const ticked = checklist.filter((item) => item.met).length;
  const urlState = urlFieldState(plat, url, allowed, connected);
  const platformLabel = plat === 'instagram' ? 'Instagram' : 'TikTok';
  const payout = examplePayout(ratePer1k);
  const hasConnected = connected.length > 0;
  const selectedConnected = isPlatformConnected(profile, plat);

  const blocker =
    !hasConnected
      ? 'Connect an accepted account before you post.'
      : urlState === 'empty'
        ? 'Paste the link to the video you posted for this brief.'
        : urlState === 'wrong_platform'
          ? `This campaign only accepts ${allowed.map((p) => PLATFORM_LABELS[p] ?? p).join(' or ')}.`
          : urlState === 'needs_connect'
            ? `Connect ${detectPlatformFromUrl(url) === 'instagram' ? 'Instagram' : 'TikTok'} to submit that link.`
            : urlState === 'invalid'
              ? `Paste a real ${platformLabel} link, e.g. ${platformUrlHint(plat)}`
              : !checksReady
                ? `Tick all ${checklist.length} requirements before submitting.`
                : null;

  const handleUrl = (value: string) => {
    onUrlChange(value);
    const detected = detectPlatformFromUrl(value);
    if (detected !== 'unknown' && connected.includes(detected) && detected !== plat) {
      onPlatformChange(detected);
    }
  };

  const trySubmit = () => {
    if (submitting) return;
    if (blocker) {
      toast({ title: 'Almost there', description: blocker });
      return;
    }
    onSubmit();
  };

  const connect = async (next: SocialPlatform) => {
    stashSocialReturnPath(`${location.pathname}${location.search}`);
    setConnecting(next);
    const { data, error } = await supabase.functions.invoke('connect-social', { body: { platform: next } });
    setConnecting(null);
    if (error || data?.error || !data?.url) {
      toast({
        title: `Could not start ${PLATFORM_LABELS[next]} login`,
        description: await edgeFunctionErrorMessage(error, data, 'OAuth is not configured yet'),
        variant: 'destructive',
      });
      return;
    }
    window.location.href = data.url as string;
  };

  return (
    <form
      className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] p-5 md:p-6 flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        trySubmit();
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-bold mb-1">
            {isResubmit ? 'Submit a new video' : 'Submit your video'}
          </h2>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground shrink-0 mt-1"
            >
              Back
            </button>
          )}
        </div>
        <p className="text-muted-foreground">
          Post on a connected account, then paste the link. We confirm it&apos;s yours before a moderator
          reviews it.
        </p>
      </div>

      {isResubmit && rejectionReason && (
        <div className="rounded-[20px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Last submission was rejected: {rejectionReason}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Label>Post it</Label>
        <div className="grid sm:grid-cols-2 gap-3">
          {allowed.map((p) => {
            const isConnected = isPlatformConnected(profile, p);
            const handle = platformHandle(profile, p);
            const selected = selectedConnected && plat === p;
            if (!isConnected) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => connect(p)}
                  disabled={connecting !== null}
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-[#d5d5d5] bg-white px-3 py-3 text-left hover:border-foreground/40 transition-colors"
                >
                  <PlatformMark platform={p} className="w-8 h-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{PLATFORM_LABELS[p]}</p>
                    <p className="text-sm text-muted-foreground">
                      {connecting === p ? 'Opening login…' : `Connect ${p === 'instagram' ? 'Instagram' : 'TikTok'}`}
                    </p>
                  </div>
                </button>
              );
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPlatformChange(p)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                  selected ? 'border-primary bg-primary/5' : 'border-[#e9e9e9] bg-white hover:border-[#d0d0d0]',
                )}
              >
                <PlatformMark platform={p} className="w-8 h-8 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">{PLATFORM_LABELS[p]}</p>
                  <p className="text-sm text-muted-foreground truncate">{handle || 'Connected'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {hasConnected && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="video-url">Video link</Label>
          <Input
            id="video-url"
            value={url}
            onChange={(e) => handleUrl(e.target.value)}
            placeholder={platformUrlHint(plat)}
            inputMode="url"
            autoComplete="url"
            aria-invalid={urlState === 'invalid' || urlState === 'wrong_platform' || urlState === 'needs_connect'}
          />
          {urlState === 'valid' && (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Looks like a {platformLabel} post. We&apos;ll confirm it&apos;s on your connected account.
            </p>
          )}
          {urlState === 'wrong_platform' && (
            <p className="text-xs text-rose-600">
              That link isn&apos;t from an allowed platform for this campaign.
            </p>
          )}
          {urlState === 'needs_connect' && (
            <p className="text-xs text-rose-600">Connect that account above before submitting this link.</p>
          )}
          {urlState === 'invalid' && (
            <p className="text-xs text-rose-600">
              Paste a full {platformLabel} URL, e.g. {platformUrlHint(plat)}
            </p>
          )}
          {urlState === 'empty' && (
            <p className="text-xs text-muted-foreground">
              Share the post → Copy link. tiktok.com/@you/video/…, tiktok.com/t/…, and vm.tiktok.com
              links all work.
            </p>
          )}
        </div>
      )}

      {checklist.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label>Tick what you included</Label>
            <span className="text-xs font-semibold text-muted-foreground">
              {ticked} of {checklist.length}
            </span>
          </div>
          {checklist.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggleCheck(item.id)}
              className={cn(
                'flex items-center gap-3 text-sm text-left rounded-2xl border px-4 py-3 transition-colors',
                item.met ? 'border-primary bg-primary/5' : 'border-[#e9e9e9] bg-white',
              )}
            >
              {item.met ? (
                <CheckSquare className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {payout > 0 && (
        <p className="text-sm text-muted-foreground">
          At this rate, 10,000 verified views would earn{' '}
          <span className="font-semibold text-foreground">{formatMoney(payout)}</span>.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" variant="invofy" size="invofy" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? `Checking with ${platformLabel}…` : isResubmit ? 'Submit new link' : 'Submit for review'}
        </Button>
        {submitting ? (
          <p className="text-xs text-muted-foreground">
            This can take a few seconds while we confirm the post with {platformLabel}.
          </p>
        ) : blocker ? (
          <p className="text-xs text-muted-foreground">{blocker}</p>
        ) : null}
      </div>
    </form>
  );
}
