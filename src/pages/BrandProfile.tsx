import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import SignedImage from '@/components/SignedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ProfileRow } from '@/types/unignored';
import type { Json } from '@/integrations/supabase/types';
import { formatPlace, CONTINENTS, countriesIn, continentOf } from '@/lib/geo';
import { joinName, splitName } from '@/lib/name';
import { isPro } from '@/lib/plan';
import { uploadAsset } from '@/lib/storage';
import {
  BRAND_SOCIALS,
  normalizeBrandSocials,
  normalizeHex,
  normalizeWebsite,
  parseBrandSocials,
  type BrandSocials,
} from '@/lib/brand-kit';
import { OnboardingBanner } from '@/components/OnboardingRequired';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'company', label: 'Company' },
  { id: 'branding', label: 'Branding' },
  { id: 'contact', label: 'Contact' },
] as const;

type BrandTab = (typeof TABS)[number]['id'];

const isBrandTab = (value: string | null): value is BrandTab =>
  TABS.some((tab) => tab.id === value);

const card = 'bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5 mb-6';
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const emptySocials = (): BrandSocials =>
  Object.fromEntries(BRAND_SOCIALS.map(({ id }) => [id, ''])) as BrandSocials;

const ColorField = ({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}) => {
  const pickerValue = normalizeHex(value) || '#111111';
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={label}
          value={pickerValue}
          onChange={(e) => onChange(normalizeHex(e.target.value))}
          className="h-10 w-10 cursor-pointer rounded-lg border border-[#e9e9e9] bg-white p-0.5"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const hex = normalizeHex(value);
            if (hex) onChange(hex);
          }}
          placeholder="#111111"
          className="font-mono"
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
};

const LogoSlot = ({
  label,
  hint,
  path,
  dark,
  uploading,
  onPick,
}: {
  label: string;
  hint: string;
  path: string | null;
  dark?: boolean;
  uploading: boolean;
  onPick: () => void;
}) => (
  <div className="flex-1 min-w-[12rem]">
    <p className="text-sm font-semibold mb-3">{label}</p>
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'w-20 h-20 rounded-[16px] overflow-hidden shrink-0 border border-[#e9e9e9]',
          dark ? 'bg-[#111]' : 'bg-white',
        )}
      >
        {path ? (
          <SignedImage path={path} alt={label} className="w-full h-full object-contain p-1" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[11px] px-2 text-center">
            No logo
          </div>
        )}
      </div>
      <div>
        <Button variant="invofyOutline" size="sm" onClick={onPick} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload
        </Button>
        <p className="text-xs text-muted-foreground mt-2">{hint}</p>
      </div>
    </div>
  </div>
);

const BrandProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: BrandTab = isBrandTab(requestedTab) ? requestedTab : 'company';
  const brandIsPro = isPro(profile);

  const setTab = (next: BrandTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'company') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'dark' | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    bio: '',
    phone: '',
    city: '',
    country: '',
    continent: '',
    avatar_url: null as string | null,
    logo_dark_url: null as string | null,
    website: '',
    brand_primary_color: '',
    brand_secondary_color: '',
    socials: emptySocials(),
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
          const parsed = parseBrandSocials(p.brand_socials);
          setForm({
            company_name: p.company_name ?? '',
            first_name: p.first_name ?? names.first,
            last_name: p.last_name ?? names.last,
            bio: p.bio ?? '',
            phone: p.phone ?? '',
            city: p.city ?? '',
            country: p.country ?? '',
            continent: p.continent || continentOf(p.country ?? ''),
            avatar_url: p.avatar_url,
            logo_dark_url: p.logo_dark_url,
            website: p.website ?? '',
            brand_primary_color: p.brand_primary_color ?? '',
            brand_secondary_color: p.brand_secondary_color ?? '',
            socials: { ...emptySocials(), ...parsed },
          });
        }
        setLoading(false);
      });
  }, [user]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setSocial = (id: keyof BrandSocials) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, socials: { ...f.socials, [id]: e.target.value } }));

  const uploadLogo = async (file: File, kind: 'logo' | 'dark') => {
    if (!user) return;
    setUploading(kind);
    try {
      const path = await uploadAsset(file, user.id, kind === 'dark' ? 'logo-dark' : 'logo');
      setForm((f) =>
        kind === 'dark' ? { ...f, logo_dark_url: path } : { ...f, avatar_url: path },
      );
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Could not upload logo',
        variant: 'destructive',
      });
    }
    setUploading(null);
  };

  const save = async () => {
    if (!user) return;

    const primary = form.brand_primary_color.trim()
      ? normalizeHex(form.brand_primary_color)
      : '';
    const secondary = form.brand_secondary_color.trim()
      ? normalizeHex(form.brand_secondary_color)
      : '';
    if (form.brand_primary_color.trim() && !primary) {
      toast({ title: 'Primary color must be a hex code like #112233', variant: 'destructive' });
      return;
    }
    if (form.brand_secondary_color.trim() && !secondary) {
      toast({ title: 'Secondary color must be a hex code like #112233', variant: 'destructive' });
      return;
    }

    const website = form.website.trim() ? normalizeWebsite(form.website) : '';
    if (form.website.trim() && !website) {
      toast({ title: 'Website must be a valid URL', variant: 'destructive' });
      return;
    }

    const socials = normalizeBrandSocials(form.socials);

    setSaving(true);
    const fullName = joinName(form.first_name, form.last_name);
    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: form.company_name.trim() || null,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        full_name: fullName,
        bio: form.bio.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim(),
        country: form.country.trim(),
        continent: form.continent,
        location: formatPlace(form.city, form.country),
        avatar_url: form.avatar_url,
        logo_dark_url: form.logo_dark_url,
        website,
        brand_primary_color: primary,
        brand_secondary_color: secondary,
        brand_socials: socials as Json,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast({ title: 'Profile saved' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const countryOptions = form.continent
    ? countriesIn(form.continent)
    : CONTINENTS.flatMap((c) => countriesIn(c.id));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground mb-2">
          This is how your brand appears on campaigns and messages.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          {brandIsPro ? (
            'You are on Twen Plus.'
          ) : (
            <>
              Free plan.{' '}
              <Link to="/pricing" className="font-semibold text-primary underline">
                See Twen Plus
              </Link>
            </>
          )}
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
                id={`brand-tab-${item.id}`}
                aria-controls={`brand-panel-${item.id}`}
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

        {tab === 'company' && (
          <div role="tabpanel" id="brand-panel-company" aria-labelledby="brand-tab-company">
            <div className={card}>
              <h2 className="font-display text-xl font-bold">Company</h2>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company_name">Company name</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={set('company_name')}
                  placeholder="Acme"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">About the brand</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={set('bio')}
                  placeholder="What you sell and who you want to reach."
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'branding' && (
          <div role="tabpanel" id="brand-panel-branding" aria-labelledby="brand-tab-branding">
            <div className={card}>
              <h2 className="font-display text-xl font-bold">Logos</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Primary logo is required. Reverse logo is used on dark campaign covers.
              </p>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0], 'logo')}
              />
              <input
                ref={logoDarkRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0], 'dark')}
              />
              <div className="flex flex-wrap gap-8">
                <LogoSlot
                  label="Primary"
                  hint="JPG, PNG, or SVG. Light background."
                  path={form.avatar_url}
                  uploading={uploading === 'logo'}
                  onPick={() => logoRef.current?.click()}
                />
                <LogoSlot
                  label="On dark"
                  hint="Optional reverse mark."
                  path={form.logo_dark_url}
                  dark
                  uploading={uploading === 'dark'}
                  onPick={() => logoDarkRef.current?.click()}
                />
              </div>
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">Colors</h2>
              <div className="grid md:grid-cols-2 gap-5">
                <ColorField
                  id="brand_primary_color"
                  label="Primary"
                  hint="Main brand color for creators to match."
                  value={form.brand_primary_color}
                  onChange={(hex) => setForm((f) => ({ ...f, brand_primary_color: hex }))}
                />
                <ColorField
                  id="brand_secondary_color"
                  label="Secondary"
                  hint="Optional accent."
                  value={form.brand_secondary_color}
                  onChange={(hex) => setForm((f) => ({ ...f, brand_secondary_color: hex }))}
                />
              </div>
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">Website</h2>
              <div className="flex flex-col gap-2">
                <Label htmlFor="website">Site URL</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://acme.com"
                />
              </div>
            </div>

            <div className={card}>
              <h2 className="font-display text-xl font-bold">Socials</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Add at least one. Handles or full URLs both work.
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                {BRAND_SOCIALS.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2">
                    <Label htmlFor={`social-${s.id}`}>{s.label}</Label>
                    <Input
                      id={`social-${s.id}`}
                      value={form.socials[s.id] ?? ''}
                      onChange={setSocial(s.id)}
                      placeholder={s.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'contact' && (
          <div role="tabpanel" id="brand-panel-contact" aria-labelledby="brand-tab-contact">
            <div className={card}>
              <h2 className="font-display text-xl font-bold">Contact person</h2>
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
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={set('phone')} placeholder="+256 77 000 0000" />
              </div>
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
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
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
                      <option key={name} value={name}>
                        {name}
                      </option>
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

export default BrandProfile;
