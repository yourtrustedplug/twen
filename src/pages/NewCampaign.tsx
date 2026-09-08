import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { OnboardingRequired } from '@/components/OnboardingRequired';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck, Plus, Trash2, Upload, ImagePlus, Check } from 'lucide-react';
import { formatMoney, formatRate } from '@/lib/format';
import { minDeadlineInput, MIN_CAMPAIGN_DAYS } from '@/lib/metrics';
import { uploadAsset, signedUrl } from '@/lib/storage';
import type { ChecklistItem } from '@/types/unignored';
import {
  NICHES,
  NICHE_LABELS,
  CAMPAIGN_PLATFORMS,
  PLATFORM_LABELS,
  joinListText,
} from '@/types/unignored';
import type { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { isOnboardingComplete } from '@/lib/onboarding';
import { kitFromProfile, socialsToUrls, toCampaignKit } from '@/lib/brand-kit';

const RATE_SUGGESTIONS = [
  { value: 0.75, label: 'Lean', hint: 'More creators, lower cost per view' },
  { value: 1.25, label: 'Standard', hint: 'Balanced reach and quality' },
  { value: 2.0, label: 'Premium', hint: 'Attracts stronger creators' },
  { value: 3.0, label: 'Top', hint: 'Competitive for high performers' },
];

type Step = 1 | 2;

const ListBuilder = ({
  label,
  hint,
  items,
  draft,
  onDraft,
  onAdd,
  onRemove,
  placeholder,
  emptyLabel,
}: {
  label: string;
  hint: string;
  items: string[];
  draft: string;
  onDraft: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder: string;
  emptyLabel: string;
}) => (
  <div className="flex flex-col gap-3">
    <div>
      <Label>
        {label}
        <span className="ml-2 font-normal text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </Label>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
    <div className="rounded-[20px] border border-[#e9e9e9] bg-white overflow-hidden">
      {items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground text-center">{emptyLabel}</p>
      ) : (
        <ol className="divide-y divide-[#f1f1f1]">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-center gap-3 px-4 py-3">
              <span className="h-6 w-6 shrink-0 rounded-full border border-[#e9e9e9] bg-[#fafafa] text-xs font-semibold flex items-center justify-center text-muted-foreground">
                {i + 1}
              </span>
              <span className="flex-1 text-sm leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-rose-500 hover:text-rose-700 shrink-0"
                aria-label={`Remove ${item}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2 p-3 border-t border-[#f1f1f1] bg-[#fafafa]">
        <Input
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          aria-label={`Add to ${label}`}
        />
        <Button type="button" variant="invofyOutline" size="sm" className="shrink-0 px-4" onClick={onAdd} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  </div>
);

const NewCampaign = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    topic: '',
    angle: '',
    niche: '',
    platforms: [] as string[],
    mustInclude: [] as string[],
    avoid: [] as string[],
    cover_image: '' as string,
    asset_urls: [] as string[],
    budget: '',
    rate: '',
    deadline: '',
  });

  const [mustDraft, setMustDraft] = useState('');
  const [avoidDraft, setAvoidDraft] = useState('');

  const set = (key: 'title' | 'topic' | 'angle' | 'niche' | 'budget' | 'rate' | 'deadline') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const togglePlatform = (p: string) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));

  const budget = Number(form.budget) || 0;
  const rate = Number(form.rate) || 0;
  const estimatedViews = rate > 0 ? Math.floor((budget / rate) * 1000) : 0;
  const minDeadline = minDeadlineInput();

  useEffect(() => {
    if (!form.cover_image) {
      setCoverPreview('');
      return;
    }
    signedUrl(form.cover_image).then(setCoverPreview);
  }, [form.cover_image]);

  const validateBrief = () => {
    if (!form.cover_image) return 'Upload a campaign image first.';
    if (!form.title.trim()) return 'Give the campaign a title.';
    if (!form.niche) return 'Pick a niche.';
    if (form.platforms.length === 0) return 'Pick TikTok, Instagram Reels, or both.';
    if (!form.topic.trim()) return 'Describe what the video should cover.';
    if (!form.angle.trim()) return 'Describe how it should feel.';
    if (form.mustInclude.length === 0) return 'Add at least one measurable must-include.';
    return null;
  };

  const validateFinance = () => {
    if (budget <= 0) return 'Set a budget above zero.';
    if (rate <= 0) return 'Set a rate per 1,000 views.';
    if (!form.deadline) return 'Pick a deadline.';
    if (form.deadline < minDeadline) return `Deadline must be at least ${MIN_CAMPAIGN_DAYS} days from today.`;
    return null;
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Use an image', description: 'JPG, PNG, or WebP.', variant: 'destructive' });
      return;
    }
    setUploadingCover(true);
    try {
      const path = await uploadAsset(file, user.id, 'covers');
      setForm((f) => ({ ...f, cover_image: path }));
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload',
        variant: 'destructive',
      });
    }
    setUploadingCover(false);
  };

  const uploadCampaignFile = async (file: File) => {
    if (!user) return;
    setUploadingFile(true);
    try {
      const path = await uploadAsset(file, user.id, 'materials');
      setForm((f) => ({ ...f, asset_urls: [...f.asset_urls, path] }));
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload',
        variant: 'destructive',
      });
    }
    setUploadingFile(false);
  };

  const goToFinances = () => {
    const error = validateBrief();
    if (error) {
      toast({ title: 'Almost there', description: error, variant: 'destructive' });
      return;
    }
    setStep(2);
  };

  const saveAndFund = async () => {
    if (!isOnboardingComplete(profile)) {
      toast({ title: 'Finish onboarding first', description: 'Complete your brand profile before creating a campaign.' });
      return;
    }
    const briefError = validateBrief();
    const financeError = validateFinance();
    const error = briefError || financeError;
    if (error || !user) {
      if (error) toast({ title: 'Almost there', description: error, variant: 'destructive' });
      return;
    }

    setSaving(true);
    const checklist: ChecklistItem[] = form.mustInclude.map((label) => ({
      id: crypto.randomUUID(),
      label,
    }));

    const kit = kitFromProfile(profile);
    const payload = {
      brand_id: user.id,
      brand_name: profile?.company_name || profile?.full_name || 'A brand on Twen',
      title: form.title.trim(),
      topic: form.topic.trim(),
      angle: form.angle.trim(),
      must_include: joinListText(form.mustInclude),
      avoid: joinListText(form.avoid),
      hashtags: '',
      disclosure: '#ad',
      budget,
      rate_per_1k: rate,
      deadline: form.deadline,
      status: 'draft' as const,
      niche: form.niche,
      platforms: form.platforms as unknown as Json,
      cover_image: form.cover_image,
      checklist: checklist as unknown as Json,
      asset_urls: form.asset_urls as unknown as Json,
      links: (kit.website ? [kit.website] : []) as unknown as Json,
      socials: socialsToUrls(kit.socials) as unknown as Json,
      brand_kit: toCampaignKit(kit) as unknown as Json,
    };

    let id = draftId;
    if (!id) {
      const { data, error: insertError } = await supabase
        .from('campaigns')
        .insert(payload)
        .select('id')
        .maybeSingle();
      if (insertError || !data) {
        setSaving(false);
        toast({ title: 'Could not save the campaign', description: insertError?.message, variant: 'destructive' });
        return;
      }
      id = (data as { id: string }).id;
      setDraftId(id);
    } else {
      const { error: updateError } = await supabase.from('campaigns').update(payload).eq('id', id);
      if (updateError) {
        setSaving(false);
        toast({ title: 'Could not update the campaign', description: updateError.message, variant: 'destructive' });
        return;
      }
    }

    const { data: checkout, error: fundError } = await supabase.functions.invoke('create-campaign-checkout', {
      body: { campaignId: id },
    });
    setSaving(false);
    if (fundError || checkout?.error || !checkout?.url) {
      toast({
        title: 'Saved as draft — checkout failed',
        description: edgeFunctionErrorMessage(
          fundError,
          checkout,
          'Could not start NardoPay checkout',
        ),
        variant: 'destructive',
      });
      navigate(`/brand/campaigns/${id}`);
      return;
    }

    toast({
      title: 'Complete payment to go live',
      description: 'Redirecting to NardoPay checkout…',
    });
    window.location.href = checkout.url as string;
  };

  if (!isOnboardingComplete(profile)) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
          <Link to="/brand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to my campaigns
          </Link>
          <OnboardingRequired action="create a campaign" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
        <Link to="/brand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to my campaigns
        </Link>

        <div className="flex items-center gap-3 mb-8 text-sm">
          <span className={cn('font-semibold', step === 1 ? 'text-foreground' : 'text-muted-foreground')}>1. Brief</span>
          <span className="text-muted-foreground">/</span>
          <span className={cn('font-semibold', step === 2 ? 'text-foreground' : 'text-muted-foreground')}>2. Finances</span>
        </div>

        {step === 1 ? (
          <>
            <h1 className="font-display text-4xl font-bold mb-2">Create a campaign</h1>
            <p className="text-muted-foreground mb-10">
              Start with the image creators will see. Then tell them what to make.
            </p>

            <div className="flex flex-col gap-8 bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8">
              {/* Cover image first */}
              <div className="flex flex-col gap-3">
                <Label>Campaign image</Label>
                <p className="text-xs text-muted-foreground -mt-1">This is the first thing creators see when browsing.</p>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploadingCover}
                  className="relative w-full aspect-[16/9] rounded-[24px] border-2 border-dashed border-[#dcdcdc] bg-white overflow-hidden flex flex-col items-center justify-center gap-3 hover:border-foreground/40 transition-colors"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Campaign cover" className="absolute inset-0 w-full h-full object-cover" />
                  ) : uploadingCover ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Upload cover image</span>
                    </>
                  )}
                </button>
                {form.cover_image && (
                  <Button type="button" variant="invofyOutline" size="sm" className="w-fit" onClick={() => coverRef.current?.click()}>
                    Replace image
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Campaign title</Label>
                <Input id="title" value={form.title} onChange={set('title')} placeholder="Sparkling Yuzu Soda — Summer Push" />
              </div>

              <div className="flex flex-col gap-3">
                <Label>Niche</Label>
                <select
                  value={form.niche}
                  onChange={set('niche')}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a niche</option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>
                      {NICHE_LABELS[n]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3">
                <Label>Platforms</Label>
                <p className="text-xs text-muted-foreground -mt-1">Creators can only post on the platforms you select.</p>
                <div className="flex flex-col gap-2">
                  {CAMPAIGN_PLATFORMS.map((p) => (
                    <label
                      key={p}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors',
                        form.platforms.includes(p) ? 'border-primary bg-primary/5' : 'border-[#e9e9e9] bg-white'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.platforms.includes(p)}
                        onChange={() => togglePlatform(p)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm font-semibold">{PLATFORM_LABELS[p]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="topic">Topic</Label>
                <p className="text-xs text-muted-foreground -mt-1">What should the video cover? Describe what you want.</p>
                <Textarea
                  id="topic"
                  value={form.topic}
                  onChange={set('topic')}
                  placeholder="Taste-test the new Sparkling Yuzu Soda and react honestly to the first sip."
                  rows={4}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="angle">Angle</Label>
                <p className="text-xs text-muted-foreground -mt-1">How it should feel.</p>
                <Textarea
                  id="angle"
                  value={form.angle}
                  onChange={set('angle')}
                  placeholder="Casual, funny, no script — kitchen or outdoors."
                  rows={3}
                />
              </div>

              <ListBuilder
                label="Must include"
                hint="This is a checklist. Add one requirement at a time — creators tick each item when they submit."
                emptyLabel="The list is empty. Type a requirement, then click Add."
                items={form.mustInclude}
                draft={mustDraft}
                onDraft={setMustDraft}
                onAdd={() => {
                  const v = mustDraft.trim();
                  if (!v) return;
                  setForm((f) => ({ ...f, mustInclude: [...f.mustInclude, v] }));
                  setMustDraft('');
                }}
                onRemove={(i) => setForm((f) => ({ ...f, mustInclude: f.mustInclude.filter((_, j) => j !== i) }))}
                placeholder="e.g. Show the product on camera"
              />

              <ListBuilder
                label="Avoid"
                hint="This is also a list. Add one restriction at a time."
                emptyLabel="The list is empty. Type something they must not do, then click Add."
                items={form.avoid}
                draft={avoidDraft}
                onDraft={setAvoidDraft}
                onAdd={() => {
                  const v = avoidDraft.trim();
                  if (!v) return;
                  setForm((f) => ({ ...f, avoid: [...f.avoid, v] }));
                  setAvoidDraft('');
                }}
                onRemove={(i) => setForm((f) => ({ ...f, avoid: f.avoid.filter((_, j) => j !== i) }))}
                placeholder="e.g. No competitor logos in frame"
              />

              <div className="flex flex-col gap-3">
                <Label>Campaign materials</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Images, videos, PDFs — anything that helps creators make this specific campaign.
                </p>
                <input
                  ref={filesRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    Array.from(e.target.files ?? []).forEach(uploadCampaignFile);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="invofyOutline"
                  size="sm"
                  className="w-fit"
                  onClick={() => filesRef.current?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload files
                </Button>
                {form.asset_urls.length > 0 && (
                  <ul className="text-sm flex flex-col gap-2">
                    {form.asset_urls.map((u, i) => (
                      <li key={u} className="flex items-center gap-2 bg-white border border-[#e9e9e9] rounded-xl px-4 py-2">
                        <span className="truncate flex-1 text-muted-foreground">{u.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, asset_urls: f.asset_urls.filter((_, j) => j !== i) }))}
                          className="text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button variant="invofy" size="invofy" onClick={goToFinances}>
                Continue to finances
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold mb-2">Finances</h1>
            <p className="text-muted-foreground mb-10">
              Set the budget and rate. Campaigns must run at least {MIN_CAMPAIGN_DAYS} days.
            </p>

            <div className="flex flex-col gap-8 bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 mb-8">
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget">Budget (USD)</Label>
                <Input id="budget" type="number" min="0" step="1" value={form.budget} onChange={set('budget')} placeholder="500" />
              </div>

              <div className="flex flex-col gap-3">
                <Label>Rate per 1,000 views (USD)</Label>
                <p className="text-xs text-muted-foreground -mt-1">Pick a suggestion or enter your own.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {RATE_SUGGESTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, rate: String(s.value) }))}
                      className={cn(
                        'text-left rounded-2xl border px-4 py-3 transition-colors',
                        Number(form.rate) === s.value
                          ? 'border-primary bg-primary/5'
                          : 'border-[#e9e9e9] bg-white hover:border-[#d0d0d0]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold">{formatRate(s.value)}</span>
                        {Number(form.rate) === s.value && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.hint}</p>
                    </button>
                  ))}
                </div>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.05"
                  value={form.rate}
                  onChange={set('rate')}
                  placeholder="Or type a custom rate"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="deadline">Deadline</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Minimum {MIN_CAMPAIGN_DAYS} days from today. Creators stop applying when fewer than 5 days remain.
                </p>
                <Input id="deadline" type="date" min={minDeadline} value={form.deadline} onChange={set('deadline')} />
              </div>

              {estimatedViews > 0 && (
                <p className="text-sm text-muted-foreground">
                  At {formatMoney(rate)} per 1,000 views, {formatMoney(budget)} buys about{' '}
                  <span className="font-semibold text-foreground">{estimatedViews.toLocaleString()} views</span>.
                </p>
              )}
            </div>

            <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 mb-8 flex flex-col gap-4">
              {[
                ['Campaign', form.title],
                ['Niche', NICHE_LABELS[form.niche] ?? form.niche],
                ['Platforms', form.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(', ')],
                ['Budget', formatMoney(budget)],
                ['Rate', rate ? formatRate(rate) : '—'],
                ['Deadline', form.deadline || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-dashed border-[#e9e9e9] pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 bg-white border border-[#f1f1f1] rounded-[30px] p-6 mb-8">
              <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                The full budget goes into escrow when you fund. You only pay for verified views. Unspent budget comes back.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button variant="invofyOutline" size="invofy" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="invofy" size="invofy" onClick={saveAndFund} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Fund {budget > 0 ? formatMoney(budget) : ''} & publish
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NewCampaign;
