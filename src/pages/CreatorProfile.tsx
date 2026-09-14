import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import SignedImage from '@/components/SignedImage';
import CreatorCard, { CreatorPhoto } from '@/components/CreatorCard';
import { MetricTile } from '@/components/MetricTile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { ProfileRow } from '@/types/unignored';
import type { Json } from '@/integrations/supabase/types';
import { PLATFORMS, PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney, formatViews } from '@/lib/format';
import FilterSelect from '@/components/creator/FilterSelect';
import { formatPlace, CONTINENTS, countriesIn, continentOf } from '@/lib/geo';
import { joinName, splitName } from '@/lib/name';
import { formatPercent } from '@/lib/metrics';
import { suggestRatePerVideo } from '@/lib/suggest-rate';
import {
  accountStatList,
  combineAccountStats,
  parseAccountStats,
  type AccountStats,
} from '@/lib/account-stats';
import { isPro } from '@/lib/plan';
import {
  bookMeDisplay,
  bookSlugError,
  normalizeBookSlug,
  parseBookMeWork,
  suggestBookSlug,
  type BookMeWork,
} from '@/lib/book-me';
import { bookMeHref } from '@/lib/hosts';
import { usePlanCheckout } from '@/hooks/use-plan-checkout';
import { ID_BUCKET, uploadAsset } from '@/lib/storage';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { OnboardingBanner } from '@/components/OnboardingRequired';
import { focusOnboardingField } from '@/lib/onboarding';
import ProfilePlanPanel from '@/components/ProfilePlanPanel';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import BookMeCard from '@/components/creator/BookMeCard';
import { PlatformMark } from '@/components/creator/PlatformMark';
import { Loader2, Upload, CheckCircle2, ShieldCheck, Lock, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'plan', label: 'Plan' },
  { id: 'billing', label: 'Billing' },
  { id: 'rate', label: 'Rate card' },
  { id: 'account', label: 'Accounts' },
  { id: 'kyc', label: 'KYC' },
  { id: 'public', label: 'Book me' },
] as const;

type ProfileTab = (typeof TABS)[number]['id'];
type IdKind = 'passport' | 'national_id';
type SocialPlatform = 'tiktok' | 'instagram';

const SocialAvatar = ({
  photo,
  platform,
  connected,
  label,
}: {
  photo: string | null;
  platform: SocialPlatform;
  connected: boolean;
  label: string;
}) => {
  const showPhoto = Boolean(connected && photo);
  return (
    <div className="relative w-10 h-10 shrink-0">
      <div className="w-10 h-10 rounded-[12px] overflow-hidden bg-[#f5f5f5] flex items-center justify-center">
        {showPhoto && photo ? (
          /^https?:\/\//.test(photo) ? (
            <img src={photo} alt={label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <SignedImage path={photo} alt={label} className="w-full h-full object-cover" />
          )
        ) : (
          <PlatformMark platform={platform} className="w-6 h-6" />
        )}
      </div>
      {showPhoto && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-[#f1f1f1] flex items-center justify-center">
          <PlatformMark platform={platform} className="w-3 h-3" />
        </span>
      )}
    </div>
  );
};

const isProfileTab = (value: string | null): value is ProfileTab =>
  TABS.some((tab) => tab.id === value);

const resolveTab = (requested: string | null, connected: string | null, upgraded: string | null): ProfileTab => {
  if (isProfileTab(requested)) return requested;
  if (requested === 'platforms') return 'account';
  if (connected === 'tiktok' || connected === 'instagram') return 'rate';
  if (upgraded === 'pending') return 'plan';
  return 'about';
};

const card = 'bg-[#fafafa] border border-[#f1f1f1] rounded-[20px] p-4 md:p-5 flex flex-col gap-3 mb-4';

const CreatorProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { startPlanCheckout, busy: upgrading } = usePlanCheckout();
  const fileRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveTab(searchParams.get('tab'), searchParams.get('connected'), searchParams.get('upgraded'));
  const creatorIsPro = isPro(profile);

  const setTab = (next: ProfileTab) => {
    const params = new URLSearchParams(searchParams);
    params.delete('connected');
    params.delete('focus');
    if (next === 'about') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewWork, setPreviewWork] = useState<BookMeWork[]>([]);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    city: '',
    country: '',
    continent: '',
    rate_per_video: '',
    avg_views: '',
    engagement_rate: '',
    follower_count: '',
    platforms: [] as string[],
    marketplace_visible: false,
    book_slug: '',
    avatar_url: null as string | null,
    tiktok_handle: null as string | null,
    instagram_handle: null as string | null,
    tiktok_connected_at: null as string | null,
    instagram_connected_at: null as string | null,
    tiktok_avatar_url: null as string | null,
    instagram_avatar_url: null as string | null,
    id_verification_status: 'unverified',
    id_document_type: '' as '' | IdKind,
    id_document_path: null as string | null,
    id_document_back_path: null as string | null,
    rate_overridden: false,
    account_stats: {} as AccountStats,
  });

  const hydrate = (p: ProfileRow) => {
    const names = splitName(p.full_name);
    setForm({
      first_name: p.first_name ?? names.first,
      last_name: p.last_name ?? names.last,
      bio: p.bio ?? '',
      city: p.city ?? '',
      country: p.country ?? '',
      continent: p.continent || continentOf(p.country ?? ''),
      rate_per_video: String(p.rate_per_video ?? ''),
      avg_views: String(p.avg_views ?? ''),
      engagement_rate: String(p.engagement_rate ?? ''),
      follower_count: String(p.follower_count ?? ''),
      platforms: parseStringArray(p.platforms).filter((x): x is (typeof PLATFORMS)[number] =>
        (PLATFORMS as readonly string[]).includes(x),
      ),
      marketplace_visible: p.marketplace_visible ?? false,
      book_slug: p.book_slug || suggestBookSlug({
        tiktokHandle: p.tiktok_handle,
        instagramHandle: p.instagram_handle,
        firstName: p.first_name,
        lastName: p.last_name,
        id: p.id,
      }),
      avatar_url: p.avatar_url,
      tiktok_handle: p.tiktok_handle,
      instagram_handle: p.instagram_handle,
      tiktok_connected_at: p.tiktok_connected_at,
      instagram_connected_at: p.instagram_connected_at,
      tiktok_avatar_url: p.tiktok_avatar_url,
      instagram_avatar_url: p.instagram_avatar_url,
      id_verification_status: p.id_verification_status ?? 'unverified',
      id_document_type: (p.id_document_type as IdKind | null) ?? '',
      id_document_path: p.id_document_path,
      id_document_back_path: p.id_document_back_path,
      rate_overridden: p.rate_overridden ?? false,
      account_stats: parseAccountStats(p.account_stats),
    });
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as ProfileRow | null;
        if (p) hydrate(p);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user || tab !== 'public') return;
    supabase
      .from('submissions')
      .select('id, tiktok_url, platform, verified_views, likes, comments, shares, engagement_rate')
      .eq('creator_id', user.id)
      .eq('status', 'approved')
      .neq('tiktok_url', '')
      .order('verified_views', { ascending: false })
      .limit(9)
      .then(({ data }) => {
        setPreviewWork(
          parseBookMeWork(
            (data ?? []).map((row) => ({
              id: row.id,
              url: row.tiktok_url,
              platform: row.platform,
              verified_views: row.verified_views,
              likes: row.likes,
              comments: row.comments,
              shares: row.shares,
              engagement_rate: row.engagement_rate,
            })),
          ),
        );
      });
  }, [user, tab]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected !== 'tiktok' && connected !== 'instagram') return;
    if (!user) return;

    toast({
      title: `${PLATFORM_LABELS[connected]} connected`,
      description: 'Followers, views, and your rate card were filled from the account. Set your Book me link next.',
    });
    const params = new URLSearchParams(searchParams);
    params.delete('connected');
    params.set('tab', 'rate');
    setSearchParams(params, { replace: true });

    void (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!data) {
        await refreshProfile();
        return;
      }
      const row = data as ProfileRow;
      let next = row;
      if (!String(row.book_slug ?? '').trim()) {
        const slug = suggestBookSlug({
          tiktokHandle: row.tiktok_handle,
          instagramHandle: row.instagram_handle,
          firstName: row.first_name,
          lastName: row.last_name,
          id: row.id,
        });
        if (!bookSlugError(slug)) {
          const saved = await supabase.from('profiles').update({ book_slug: slug }).eq('id', user.id);
          if (!saved.error) next = { ...row, book_slug: slug };
        }
      }
      hydrate(next);
      await refreshProfile();
    })();
  }, [searchParams, setSearchParams, toast, refreshProfile, user]);

  useEffect(() => {
    if (searchParams.get('upgraded') !== 'pending') return;
    toast({
      title: 'Payment received',
      description: 'Creator Pro unlocks in a few seconds once NardoPay confirms.',
    });
    const params = new URLSearchParams(searchParams);
    params.delete('upgraded');
    params.set('tab', 'plan');
    setSearchParams(params, { replace: true });
    const t = window.setTimeout(() => {
      void refreshProfile();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [searchParams, setSearchParams, toast, refreshProfile]);

  useEffect(() => {
    if (loading) return;
    const focus = searchParams.get('focus');
    if (!focus) return;
    const t = window.setTimeout(() => focusOnboardingField(focus), 50);
    return () => window.clearTimeout(t);
  }, [loading, searchParams, tab]);

  const combinedReach = useMemo(() => {
    const fromStats = combineAccountStats(form.account_stats);
    if (fromStats.followerCount || fromStats.avgViews) return fromStats;
    return {
      followerCount: Number(form.follower_count) || 0,
      avgViews: Number(form.avg_views) || 0,
      engagementRate: Number(form.engagement_rate) || 0,
    };
  }, [form.account_stats, form.follower_count, form.avg_views, form.engagement_rate]);

  const suggested = useMemo(
    () =>
      suggestRatePerVideo({
        followerCount: combinedReach.followerCount,
        avgViews: combinedReach.avgViews,
        engagementRate: combinedReach.engagementRate,
      }),
    [combinedReach],
  );
  const accountBreakdown = accountStatList(form.account_stats);

  const accountConnected = (platform: SocialPlatform) =>
    Boolean(
      platform === 'tiktok'
        ? form.tiktok_connected_at || form.tiktok_handle
        : form.instagram_connected_at || form.instagram_handle,
    );

  const connectedAccounts = (['tiktok', 'instagram'] as const).filter(accountConnected);
  const connectedPlatforms = connectedAccounts.length > 0 ? [...connectedAccounts] : form.platforms;

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'File too large', description: 'Use a JPG or PNG under 5 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      // Same private bucket + {userId}/… path rules as brand logos (campaign-assets).
      const path = await uploadAsset(file, user.id, 'avatars');
      setForm((f) => ({ ...f, avatar_url: path }));
      toast({ title: 'Photo ready', description: 'Click Save profile to keep it.' });
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Could not upload photo',
        variant: 'destructive',
      });
    }
    setUploading(false);
  };

  const connect = async (platform: SocialPlatform) => {
    setConnecting(platform);
    const { data, error } = await supabase.functions.invoke('connect-social', { body: { platform } });
    setConnecting(null);
    if (error || data?.error || !data?.url) {
      toast({
        title: `Could not start ${PLATFORM_LABELS[platform]} login`,
        description: await edgeFunctionErrorMessage(error, data, 'OAuth is not configured yet'),
        variant: 'destructive',
      });
      return;
    }
    window.location.href = data.url as string;
  };

  const uploadId = async (file: File, side: 'front' | 'back') => {
    if (!user) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/${side}.${ext}`;
    const { error } = await supabase.storage.from(ID_BUCKET).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }
    setForm((f) => ({
      ...f,
      id_document_path: side === 'front' ? path : f.id_document_path,
      id_document_back_path: side === 'back' ? path : f.id_document_back_path,
      id_verification_status: f.id_verification_status === 'verified' ? f.id_verification_status : 'unverified',
    }));
  };

  const submitId = async () => {
    if (!user || !form.id_document_path || !form.id_document_type) {
      toast({ title: 'Add a document first', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        id_document_type: form.id_document_type,
        id_document_path: form.id_document_path,
        id_document_back_path: form.id_document_back_path,
        id_verification_status: 'pending',
      })
      .eq('id', user.id);
    if (saveError) {
      setVerifying(false);
      toast({ title: 'Could not save ID', description: saveError.message, variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.functions.invoke('verify-id', { body: {} });
    setVerifying(false);
    const status = (data?.status as string) || 'pending';
    setForm((f) => ({ ...f, id_verification_status: status }));
    await refreshProfile();
    toast({
      title: status === 'verified' ? 'ID verified' : status === 'rejected' ? 'ID declined' : 'ID submitted',
      description: data?.message ?? (await edgeFunctionErrorMessage(error, data, 'A moderator will review it.')),
      variant: status === 'rejected' ? 'destructive' : 'default',
    });
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const fullName = joinName(form.first_name, form.last_name);
    const location = formatPlace(form.city, form.country);
    const patch: Record<string, unknown> = {
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      full_name: fullName,
      bio: form.bio.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      continent: form.continent,
      location,
      platforms: connectedPlatforms as unknown as Json,
      avatar_url: form.avatar_url,
      rate_suggested: suggested,
    };
    if (creatorIsPro) {
      patch.rate_per_video = Number(form.rate_per_video) || 0;
      patch.rate_overridden = form.rate_overridden;
      patch.marketplace_visible = form.marketplace_visible;
    }
    const slug = normalizeBookSlug(form.book_slug);
    const slugErr = bookSlugError(slug);
    if (slugErr) {
      setSaving(false);
      toast({ title: 'Check your Book me link', description: slugErr, variant: 'destructive' });
      return;
    }
    patch.book_slug = slug;
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    setSaving(false);
    if (error) {
      const taken = /book_slug|duplicate|unique/i.test(error.message);
      toast({
        title: taken ? 'That link is taken' : 'Could not save',
        description: taken ? 'Pick another name for twen.app/@…' : error.message,
        variant: 'destructive',
      });
      return;
    }
    await refreshProfile();
    setForm((f) => ({ ...f, book_slug: slug }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast({
      title: 'Profile saved',
      description: creatorIsPro && form.marketplace_visible
        ? "You're visible to brands."
        : 'Profile saved.',
    });
  };

  const persistBookSlug = async (slug: string) => {
    if (!user) return false;
    const slugErr = bookSlugError(slug);
    if (slugErr) {
      toast({ title: 'Check your Book me link', description: slugErr, variant: 'destructive' });
      return false;
    }
    const { error } = await supabase.from('profiles').update({ book_slug: slug }).eq('id', user.id);
    if (error) {
      const taken = /book_slug|duplicate|unique/i.test(error.message);
      toast({
        title: taken ? 'That link is taken' : 'Could not save',
        description: taken ? 'Pick another name for twen.app/@…' : error.message,
        variant: 'destructive',
      });
      return false;
    }
    setForm((f) => ({ ...f, book_slug: slug }));
    return true;
  };

  const applySuggested = () => {
    if (!suggested) return;
    setForm((f) => ({ ...f, rate_per_video: String(suggested), rate_overridden: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const idStatus = form.id_verification_status;
  const countryOptions = form.continent ? countriesIn(form.continent) : countriesIn('africa').concat(
    CONTINENTS.filter((c) => c.id !== 'africa').flatMap((c) => countriesIn(c.id)),
  );
  const showSave = tab === 'about' || tab === 'public' || (tab === 'rate' && creatorIsPro);
  const previewName = joinName(form.first_name, form.last_name) ?? 'Creator';
  const previewCreator = {
    id: user?.id ?? 'preview',
    avatar_url: form.avatar_url,
    full_name: previewName,
    tiktok_handle: form.tiktok_handle,
    instagram_handle: form.instagram_handle,
    city: form.city,
    country: form.country,
    location: formatPlace(form.city, form.country),
    rate_per_video: Number(form.rate_per_video) || 0,
    avg_views: combinedReach.avgViews,
    engagement_rate: combinedReach.engagementRate,
    platforms: connectedPlatforms,
  };
  const impliedCpm =
    combinedReach.avgViews > 0 && Number(form.rate_per_video) > 0
      ? (Number(form.rate_per_video) / combinedReach.avgViews) * 1000
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className={cn('mx-auto px-5 md:px-10 py-5 md:py-6', tab === 'public' ? 'max-w-6xl' : 'max-w-3xl')}>
        <h1 className="font-display text-2xl font-bold mb-1">My Profile</h1>
        <p className="text-sm text-muted-foreground mb-4">
          This is what brands see when they browse the creator marketplace.
        </p>

        <OnboardingBanner />

        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex w-full overflow-x-auto scrollbar-none p-1 rounded-full border border-[#e9e9e9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] mb-5"
        >
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`profile-tab-${item.id}`}
                aria-controls={`profile-panel-${item.id}`}
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={cn(
                  'shrink-0 flex-1 sm:flex-none sm:min-w-[5.5rem] px-3 sm:px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'about' && (
          <div role="tabpanel" id="profile-panel-about" aria-labelledby="profile-tab-about">
            <div className={card}>
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-[14px] overflow-hidden bg-[#efefef]">
                    <CreatorPhoto
                      id={user?.id ?? 'preview'}
                      avatarUrl={form.avatar_url}
                      alt={previewName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                  />
                  <Button
                    variant="invofyOutline"
                    size="sm"
                    className="mt-2 h-8 px-2.5 text-xs"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                    Photo
                  </Button>
                </div>
                <div className="flex-1 grid sm:grid-cols-2 gap-3 min-w-0">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="first_name">First name</Label>
                    <Input id="first_name" value={form.first_name} onChange={set('first_name')} placeholder="Jane" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input id="last_name" value={form.last_name} onChange={set('last_name')} placeholder="Doe" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={2}
                  className="min-h-[64px]"
                  value={form.bio}
                  onChange={set('bio')}
                  placeholder="Tell brands what you create and who watches."
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="continent">Continent</Label>
                  <FilterSelect
                    id="continent"
                    value={form.continent}
                    onChange={(continent) => {
                      setForm((f) => ({
                        ...f,
                        continent,
                        country: continentOf(f.country) === continent ? f.country : '',
                      }));
                    }}
                    ariaLabel="Continent"
                    inactiveValue=""
                    placeholder="Select"
                    variant="field"
                    triggerClassName="h-9 text-sm"
                    options={[
                      { value: '', label: 'Select' },
                      ...CONTINENTS.map((c) => ({ value: c.id, label: c.label })),
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="country">Country</Label>
                  <FilterSelect
                    id="country"
                    value={form.country}
                    onChange={(country) => {
                      setForm((f) => ({
                        ...f,
                        country,
                        continent: continentOf(country) || f.continent,
                      }));
                    }}
                    ariaLabel="Country"
                    inactiveValue=""
                    placeholder="Select"
                    variant="field"
                    searchable
                    searchPlaceholder="Filter countries"
                    triggerClassName="h-9 text-sm"
                    options={countryOptions.map((name) => ({ value: name, label: name }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={set('city')} placeholder="Kampala" />
                </div>
              </div>
            </div>
          </div>
        )}

        {(tab === 'plan' || tab === 'billing') && (
          <ProfilePlanPanel
            audience="creator"
            isPro={creatorIsPro}
            pending={searchParams.get('upgraded') === 'pending'}
            upgrading={upgrading}
            renewsAt={profile?.plan_renews_at}
            focus={tab === 'billing' ? 'billing' : 'plan'}
            onUpgrade={() => startPlanCheckout('creator')}
          />
        )}

        {tab === 'rate' && (
          <div role="tabpanel" id="profile-panel-rate" aria-labelledby="profile-tab-rate">
            <div className={card}>
              <h2 className="font-display text-base font-bold">Rate card</h2>
              <p className="text-xs text-muted-foreground -mt-1">
                Totals add every connected TikTok and Instagram account.
                {creatorIsPro
                  ? ' You can set your price per video.'
                  : ' Price per video can be edited on Creator Pro.'}
              </p>
              {connectedAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => setTab('account')}>
                    Connect an account
                  </button>
                  {' '}to fill followers, views, and engagement.
                </p>
              )}
              {connectedAccounts.length > 0 && !combinedReach.avgViews && (
                <p className="text-xs text-muted-foreground">
                  Views are still empty.{' '}
                  <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => setTab('account')}>
                    Reconnect
                  </button>
                  {' '}each account to pull them from recent videos.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <MetricTile compact label="Followers" value={combinedReach.followerCount ? formatViews(combinedReach.followerCount) : '—'} />
                <MetricTile compact label="Average views" value={combinedReach.avgViews ? formatViews(combinedReach.avgViews) : '—'} />
                <MetricTile
                  compact
                  label="Engagement"
                  value={combinedReach.engagementRate ? formatPercent(combinedReach.engagementRate) : '—'}
                />
              </div>
              {accountBreakdown.length > 0 && (
                <div className="bg-white border border-[#f1f1f1] rounded-[14px] overflow-hidden">
                  <div className="grid grid-cols-[1fr_repeat(3,minmax(0,4.5rem))] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <p>Account</p>
                    <p className="text-right">Followers</p>
                    <p className="text-right">Views</p>
                    <p className="text-right">Eng.</p>
                  </div>
                  {accountBreakdown.map(({ platform, reach }, index) => {
                    const handle = platform === 'tiktok' ? form.tiktok_handle : form.instagram_handle;
                    return (
                      <div
                        key={platform}
                        className={cn(
                          'grid grid-cols-[1fr_repeat(3,minmax(0,4.5rem))] gap-2 items-center px-3 py-2.5 text-xs',
                          index > 0 && 'border-t border-[#f1f1f1]',
                        )}
                      >
                        <p className="font-semibold truncate">
                          {PLATFORM_LABELS[platform]}
                          {handle ? ` · ${handle}` : ''}
                        </p>
                        <p className="text-right tabular-nums">{reach.followerCount ? formatViews(reach.followerCount) : '—'}</p>
                        <p className="text-right tabular-nums">{reach.avgViews ? formatViews(reach.avgViews) : '—'}</p>
                        <p className="text-right tabular-nums">{reach.engagementRate ? formatPercent(reach.engagementRate) : '—'}</p>
                      </div>
                    );
                  })}
                  {accountBreakdown.length > 1 && (
                    <div className="grid grid-cols-[1fr_repeat(3,minmax(0,4.5rem))] gap-2 items-center px-3 py-2.5 text-xs border-t border-[#f1f1f1] bg-[#fafafa] font-semibold">
                      <p>All accounts</p>
                      <p className="text-right tabular-nums">{formatViews(combinedReach.followerCount)}</p>
                      <p className="text-right tabular-nums">{formatViews(combinedReach.avgViews)}</p>
                      <p className="text-right tabular-nums">{formatPercent(combinedReach.engagementRate)}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rate_per_video">Price per video (USD)</Label>
                <Input
                  id="rate_per_video"
                  type="number"
                  min="0"
                  step="10"
                  value={form.rate_per_video}
                  disabled={!creatorIsPro}
                  onChange={(e) => setForm((f) => ({ ...f, rate_per_video: e.target.value, rate_overridden: true }))}
                  placeholder={suggested ? String(suggested) : '500'}
                />
                {!creatorIsPro && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Subscribe to Creator Pro to edit your price.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#f1f1f1] rounded-[14px] px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Suggested: <span className="font-semibold text-foreground">{suggested ? formatMoney(suggested) : '—'}</span>
                  {impliedCpm > 0 && (
                    <> · implied CPM <span className="font-semibold text-foreground">${impliedCpm.toFixed(2)}</span></>
                  )}
                </p>
                {creatorIsPro ? (
                  <Button variant="invofyOutline" size="sm" onClick={applySuggested} disabled={!suggested}>
                    Use suggested
                  </Button>
                ) : (
                  <Button
                    variant="invofy"
                    size="sm"
                    disabled={upgrading}
                    onClick={() => void startPlanCheckout('creator')}
                  >
                    {upgrading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Get Creator Pro
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'account' && (
          <div role="tabpanel" id="profile-panel-account" aria-labelledby="profile-tab-account">
            <div className={card}>
              <h2 className="font-display text-base font-bold">Accounts</h2>
              <p className="text-xs text-muted-foreground -mt-1">
                Connect TikTok or Instagram so we can confirm your posts when you submit.
              </p>
              {(['tiktok', 'instagram'] as const).map((platform) => {
                const connected = platform === 'tiktok' ? form.tiktok_connected_at : form.instagram_connected_at;
                const handle = platform === 'tiktok' ? form.tiktok_handle : form.instagram_handle;
                return (
                  <div key={platform} className="flex items-center justify-between gap-3 bg-white border border-[#f1f1f1] rounded-[14px] px-4 py-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <SocialAvatar
                        photo={
                          (platform === 'tiktok' ? form.tiktok_avatar_url : form.instagram_avatar_url)
                          || (connected ? form.avatar_url : null)
                        }
                        platform={platform}
                        connected={Boolean(connected)}
                        label={PLATFORM_LABELS[platform]}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold">{PLATFORM_LABELS[platform]}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {connected
                            ? `${handle || 'Connected'} · ${new Date(connected).toLocaleDateString()}`
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={connected ? 'invofyOutline' : 'invofy'}
                      size="sm"
                      onClick={() => connect(platform)}
                      disabled={connecting !== null}
                    >
                      {connecting === platform ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {connected ? 'Reconnect' : 'Connect'}
                    </Button>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                {creatorIsPro
                  ? 'More account types are coming soon.'
                  : (
                    <>
                      To add more accounts,{' '}
                      <button
                        type="button"
                        className="font-semibold text-foreground underline underline-offset-2 disabled:opacity-60"
                        disabled={upgrading}
                        onClick={() => void startPlanCheckout('creator')}
                      >
                        {upgrading ? 'Opening…' : 'subscribe to Creator Pro'}
                      </button>
                      .
                    </>
                  )}
              </p>
            </div>
          </div>
        )}

        {tab === 'kyc' && (
          <div role="tabpanel" id="profile-panel-kyc" aria-labelledby="profile-tab-kyc">
            <div className={card}>
              <h2 className="font-display text-base font-bold">Passport / ID</h2>
              <p className="text-xs text-muted-foreground -mt-1">
                We verify with Didit (passports and national IDs). If Didit is not configured yet, a moderator reviews the photo.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className={cn('h-4 w-4', idStatus === 'verified' ? 'text-emerald-600' : 'text-muted-foreground')} />
                <span className="font-semibold capitalize">{idStatus}</span>
              </div>
              {idStatus !== 'verified' && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(['passport', 'national_id'] as const).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, id_document_type: kind }))}
                        className={cn(
                          'text-sm font-semibold px-4 py-2 rounded-full border transition-colors',
                          form.id_document_type === kind
                            ? 'bg-primary text-primary-foreground border-transparent'
                            : 'border-[#e0e0e0] text-muted-foreground hover:border-foreground hover:text-foreground',
                        )}
                      >
                        {kind === 'passport' ? 'Passport' : 'National ID'}
                      </button>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <input
                        ref={idFrontRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadId(e.target.files[0], 'front')}
                      />
                      <Button variant="invofyOutline" size="sm" onClick={() => idFrontRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {form.id_document_type === 'national_id' ? 'Front of ID' : 'Passport photo page'}
                      </Button>
                      {form.id_document_path && (
                        <div className="mt-2 h-20 rounded-[12px] overflow-hidden bg-[#efefef]">
                          <SignedImage path={form.id_document_path} alt="ID front" bucket={ID_BUCKET} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    {form.id_document_type === 'national_id' && (
                      <div>
                        <input
                          ref={idBackRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadId(e.target.files[0], 'back')}
                        />
                        <Button variant="invofyOutline" size="sm" onClick={() => idBackRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" /> Back of ID
                        </Button>
                        {form.id_document_back_path && (
                          <div className="mt-2 h-20 rounded-[12px] overflow-hidden bg-[#efefef]">
                            <SignedImage path={form.id_document_back_path} alt="ID back" bucket={ID_BUCKET} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Button variant="invofy" size="sm" onClick={submitId} disabled={verifying || !form.id_document_path}>
                      {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Submit for verification
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'public' && (
          <div role="tabpanel" id="profile-panel-public" aria-labelledby="profile-tab-public">
            <div className={card}>
              <h2 className="font-display text-base font-bold">Book me link</h2>
              <p className="text-xs text-muted-foreground -mt-1">
                Put this in your TikTok or Instagram bio. Brands land here and tap Book me.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="book_slug">twen.app/@</Label>
                <div className="flex gap-2">
                  <Input
                    id="book_slug"
                    value={form.book_slug}
                    onChange={(e) => setForm((f) => ({ ...f, book_slug: normalizeBookSlug(e.target.value) }))}
                    placeholder="your-name"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="invofyOutline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const slug = normalizeBookSlug(form.book_slug);
                      void persistBookSlug(slug).then((ok) => {
                        if (!ok) return;
                        void navigator.clipboard.writeText(bookMeHref(slug)).then(
                          () => toast({ title: 'Copied', description: bookMeDisplay(slug) }),
                          () => toast({ title: 'Could not copy', variant: 'destructive' }),
                        );
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{bookMeDisplay(form.book_slug)}</p>
              </div>
            </div>

            <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[20px] p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold mb-0.5">In brand search</h2>
                  <p className="text-xs text-muted-foreground">
                    {creatorIsPro
                      ? 'When on, your profile also appears in the brand creator directory.'
                      : 'Creator Pro lets brands find you in search. Your Book me link works either way.'}
                  </p>
                </div>
                {creatorIsPro ? (
                  <Switch
                    checked={form.marketplace_visible}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, marketplace_visible: v }))}
                  />
                ) : (
                  <Button
                    variant="invofyOutline"
                    size="sm"
                    disabled={upgrading}
                    onClick={() => void startPlanCheckout('creator')}
                  >
                    {upgrading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Upgrade
                  </Button>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(180px,16rem)_1fr] gap-5 items-start">
              <div>
                <p className="text-xs text-muted-foreground mb-2">In search</p>
                <div className="max-w-[16rem] [&_.font-display.text-xl]:text-base [&_p.text-sm]:text-xs">
                  <CreatorCard creator={previewCreator} preview />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Book me page</p>
                <div className={cn(card, 'mb-0')}>
                  <BookMeCard
                    compact
                    profile={{
                      id: previewCreator.id,
                      full_name: previewName,
                      bio: form.bio,
                      avatar_url: form.avatar_url,
                      city: form.city,
                      country: form.country,
                      location: formatPlace(form.city, form.country),
                      rate_per_video: Number(form.rate_per_video) || 0,
                      avg_views: combinedReach.avgViews,
                      engagement_rate: combinedReach.engagementRate,
                      follower_count: combinedReach.followerCount,
                      platforms: connectedPlatforms,
                      tiktok_handle: form.tiktok_handle,
                      instagram_handle: form.instagram_handle,
                      book_slug: normalizeBookSlug(form.book_slug) || 'your-name',
                      account_stats: form.account_stats,
                      work: previewWork,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {showSave && (
          <Button variant="invofy" size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : null}
            {saved ? 'Saved' : 'Save profile'}
          </Button>
        )}

        {tab === 'about' && <DeleteAccountCard />}
      </main>
    </div>
  );
};

export default CreatorProfile;
