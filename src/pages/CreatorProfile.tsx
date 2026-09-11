import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import SignedImage from '@/components/SignedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { ProfileRow } from '@/types/unignored';
import type { Json } from '@/integrations/supabase/types';
import { PLATFORMS, PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney } from '@/lib/format';
import { formatPlace, CONTINENTS, countriesIn, continentOf } from '@/lib/geo';
import { joinName, splitName } from '@/lib/name';
import { suggestRatePerVideo } from '@/lib/suggest-rate';
import { isPro } from '@/lib/plan';
import { ID_BUCKET, uploadAsset } from '@/lib/storage';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { OnboardingBanner } from '@/components/OnboardingRequired';
import { Loader2, Upload, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'rate', label: 'Rate card' },
  { id: 'platforms', label: 'Platforms' },
] as const;

type ProfileTab = (typeof TABS)[number]['id'];
type IdKind = 'passport' | 'national_id';

const isProfileTab = (value: string | null): value is ProfileTab =>
  TABS.some((tab) => tab.id === value);

const card = 'bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5 mb-6';
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const CreatorProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: ProfileTab = isProfileTab(requestedTab) ? requestedTab : 'about';
  const creatorIsPro = isPro(profile);

  const setTab = (next: ProfileTab) => {
    const params = new URLSearchParams(searchParams);
    params.delete('connected');
    if (next === 'about') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState<'tiktok' | 'instagram' | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);

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
    avatar_url: null as string | null,
    tiktok_handle: null as string | null,
    instagram_handle: null as string | null,
    tiktok_connected_at: null as string | null,
    instagram_connected_at: null as string | null,
    id_verification_status: 'unverified',
    id_document_type: '' as '' | IdKind,
    id_document_path: null as string | null,
    id_document_back_path: null as string | null,
    rate_overridden: false,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as ProfileRow | null;
        if (p) {
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
            avatar_url: p.avatar_url,
            tiktok_handle: p.tiktok_handle,
            instagram_handle: p.instagram_handle,
            tiktok_connected_at: p.tiktok_connected_at,
            instagram_connected_at: p.instagram_connected_at,
            id_verification_status: p.id_verification_status ?? 'unverified',
            id_document_type: (p.id_document_type as IdKind | null) ?? '',
            id_document_path: p.id_document_path,
            id_document_back_path: p.id_document_back_path,
            rate_overridden: p.rate_overridden ?? false,
          });
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected === 'tiktok' || connected === 'instagram') {
      toast({ title: `${PLATFORM_LABELS[connected]} connected` });
      const params = new URLSearchParams(searchParams);
      params.delete('connected');
      setSearchParams(params, { replace: true });
      refreshProfile();
    }
  }, [searchParams, setSearchParams, toast, refreshProfile]);

  const suggested = useMemo(
    () =>
      suggestRatePerVideo({
        followerCount: Number(form.follower_count) || 0,
        avgViews: Number(form.avg_views) || 0,
        engagementRate: Number(form.engagement_rate) || 0,
      }),
    [form.follower_count, form.avg_views, form.engagement_rate],
  );

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const togglePlatform = (p: string) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));

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

  const connect = async (platform: 'tiktok' | 'instagram') => {
    setConnecting(platform);
    const { data, error } = await supabase.functions.invoke('connect-social', { body: { platform } });
    setConnecting(null);
    if (error || data?.error || !data?.url) {
      toast({
        title: `Could not start ${PLATFORM_LABELS[platform]} login`,
        description: edgeFunctionErrorMessage(error, data, 'OAuth is not configured yet'),
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
      description: data?.message ?? edgeFunctionErrorMessage(error, data, 'A moderator will review it.'),
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
      avg_views: Number(form.avg_views) || 0,
      engagement_rate: Number(form.engagement_rate) || 0,
      follower_count: Number(form.follower_count) || 0,
      platforms: form.platforms as unknown as Json,
      avatar_url: form.avatar_url,
      rate_suggested: suggested,
    };
    if (creatorIsPro) {
      patch.rate_per_video = Number(form.rate_per_video) || 0;
      patch.rate_overridden = form.rate_overridden;
      patch.marketplace_visible = form.marketplace_visible;
    }
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast({
      title: 'Profile saved',
      description: creatorIsPro && form.marketplace_visible
        ? "You're visible to brands."
        : 'Profile saved.',
    });
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground mb-8">
          This is what brands see when they browse the creator marketplace.
        </p>

        <OnboardingBanner />

        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex w-full sm:inline-flex p-1 rounded-full border border-[#e9e9e9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] mb-10"
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
                  'flex-1 sm:flex-none sm:min-w-[8.5rem] px-4 sm:px-6 py-2.5 rounded-full text-sm sm:text-base font-semibold transition-colors duration-200',
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
              <h2 className="font-display text-xl font-bold">Photo</h2>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-[18px] overflow-hidden bg-[#efefef] shrink-0">
                  {form.avatar_url ? (
                    <SignedImage path={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                  />
                  <Button variant="invofyOutline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG or PNG, max 5 MB.</p>
                </div>
              </div>
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">About you</h2>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input id="first_name" value={form.first_name} onChange={set('first_name')} placeholder="Jane" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input id="last_name" value={form.last_name} onChange={set('last_name')} placeholder="Doe" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={form.bio} onChange={set('bio')} placeholder="Tell brands what you create and who watches." />
              </div>
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">Accounts</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Connect TikTok and Instagram so we can confirm your posts (views, date, ownership) when you
                submit. Only these two platforms. Reconnect Instagram after we add insight permissions.
              </p>
              {(['tiktok', 'instagram'] as const).map((platform) => {
                const connected = platform === 'tiktok' ? form.tiktok_connected_at : form.instagram_connected_at;
                const handle = platform === 'tiktok' ? form.tiktok_handle : form.instagram_handle;
                return (
                  <div key={platform} className="flex items-center justify-between gap-4 bg-white border border-[#f1f1f1] rounded-[20px] px-5 py-4">
                    <div>
                      <p className="font-semibold">{PLATFORM_LABELS[platform]}</p>
                      <p className="text-sm text-muted-foreground">
                        {connected
                          ? `${handle || 'Connected'} · ${new Date(connected).toLocaleDateString()}`
                          : 'Not connected'}
                      </p>
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
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">Passport / ID</h2>
              <p className="text-sm text-muted-foreground -mt-2">
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
                        <div className="mt-3 h-28 rounded-[16px] overflow-hidden bg-[#efefef]">
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
                          <div className="mt-3 h-28 rounded-[16px] overflow-hidden bg-[#efefef]">
                            <SignedImage path={form.id_document_back_path} alt="ID back" bucket={ID_BUCKET} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Button variant="invofy" size="invofy" onClick={submitId} disabled={verifying || !form.id_document_path}>
                      {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Submit for verification
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">Location</h2>
              <div className="grid md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="continent">Continent</Label>
                  <select
                    id="continent"
                    className={selectClass}
                    value={form.continent}
                    onChange={(e) => {
                      const continent = e.target.value;
                      setForm((f) => ({
                        ...f,
                        continent,
                        country: continentOf(f.country) === continent ? f.country : '',
                      }));
                    }}
                  >
                    <option value="">Select</option>
                    {CONTINENTS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    className={selectClass}
                    value={form.country}
                    onChange={(e) => {
                      const country = e.target.value;
                      setForm((f) => ({
                        ...f,
                        country,
                        continent: continentOf(country) || f.continent,
                      }));
                    }}
                  >
                    <option value="">Select</option>
                    {countryOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={set('city')} placeholder="Kampala" />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'rate' && (
          <div role="tabpanel" id="profile-panel-rate" aria-labelledby="profile-tab-rate">
            <div className={card}>
              <h2 className="font-display text-xl font-bold">Rate card</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                We suggest a price from followers, average views, and engagement. You can change it.
                {creatorIsPro ? '' : ' Publishing a public rate card is Creator Pro.'}
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="follower_count">Follower count</Label>
                  <Input id="follower_count" type="number" min="0" step="100" value={form.follower_count} onChange={set('follower_count')} placeholder="120000" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="avg_views">Average views per video</Label>
                  <Input id="avg_views" type="number" min="0" step="100" value={form.avg_views} onChange={set('avg_views')} placeholder="50000" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="engagement_rate">Engagement rate (0–1, e.g. 0.06 = 6%)</Label>
                  <Input id="engagement_rate" type="number" min="0" max="1" step="0.001" value={form.engagement_rate} onChange={set('engagement_rate')} placeholder="0.06" />
                </div>
                <div className="flex flex-col gap-2">
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
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#f1f1f1] rounded-[20px] px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  Suggested: <span className="font-semibold text-foreground">{suggested ? formatMoney(suggested) : '—'}</span>
                  {Number(form.avg_views) > 0 && Number(form.rate_per_video) > 0 && (
                    <> · implied CPM <span className="font-semibold text-foreground">${((Number(form.rate_per_video) / Number(form.avg_views)) * 1000).toFixed(2)}</span></>
                  )}
                </p>
                {creatorIsPro ? (
                  <Button variant="invofyOutline" size="sm" onClick={applySuggested} disabled={!suggested}>
                    Use suggested
                  </Button>
                ) : (
                  <Button variant="invofy" size="sm" asChild>
                    <Link to="/pricing">Get Creator Pro</Link>
                  </Button>
                )}
              </div>
              {!creatorIsPro && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Brands only see a public rate once you are on Creator Pro.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'platforms' && (
          <div role="tabpanel" id="profile-panel-platforms" aria-labelledby="profile-tab-platforms">
            <div className={cn(card, 'gap-4')}>
              <h2 className="font-display text-xl font-bold">Platforms</h2>
              <p className="text-sm text-muted-foreground -mt-2">TikTok and Instagram only. Connect them on About.</p>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      'text-sm font-semibold px-4 py-2 rounded-full border transition-colors',
                      form.platforms.includes(p)
                        ? 'bg-primary text-primary-foreground border-transparent'
                        : 'border-[#e0e0e0] text-muted-foreground hover:border-foreground hover:text-foreground',
                    )}
                  >
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold mb-1">Marketplace visibility</h2>
                  <p className="text-sm text-muted-foreground">
                    {creatorIsPro
                      ? 'When on, your profile appears in the brand creator directory.'
                      : 'Creator Pro lets brands find you in search.'}
                  </p>
                </div>
                {creatorIsPro ? (
                  <Switch
                    checked={form.marketplace_visible}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, marketplace_visible: v }))}
                  />
                ) : (
                  <Button variant="invofyOutline" size="sm" asChild>
                    <Link to="/pricing">Upgrade</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <Button variant="invofy" size="invofy" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          ) : null}
          {saved ? 'Saved' : 'Save profile'}
        </Button>
      </main>
    </div>
  );
};

export default CreatorProfile;
