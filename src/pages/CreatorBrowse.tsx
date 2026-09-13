import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import CreatorSubmissionsList from '@/components/creator/CreatorSubmissionsList';
import CampaignPickCard from '@/components/creator/CampaignPickCard';
import type { Campaign } from '@/types/unignored';
import { NICHE_LABELS, NICHES, PLATFORM_LABELS, CAMPAIGN_PLATFORMS, parseStringArray } from '@/types/unignored';
import FilterSelect from '@/components/creator/FilterSelect';
import { persistWatchlistToggle, loadWatchlist } from '@/lib/watchlist';
import { canApplyToCampaign } from '@/lib/metrics';
import { CAMPAIGN_SORTS, isCampaignSort, isCreatorHomeTab, sortCampaigns, type CreatorHomeTab } from '@/lib/creator-home';
import { attachBrandLogos } from '@/lib/campaign-logo';
import { OnboardingBanner } from '@/components/OnboardingRequired';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Search } from 'lucide-react';

const COPY: Record<CreatorHomeTab, { title: string; subtitle: string }> = {
  pick: {
    title: 'Pick a campaign',
    subtitle: 'Pick. Post. Get paid.',
  },
  mine: {
    title: 'My campaigns',
    subtitle: 'Posted. Verified. Paid.',
  },
};

const CreatorBrowse = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const requestedTab = searchParams.get('tab');
  const tab: CreatorHomeTab = isCreatorHomeTab(requestedTab) ? requestedTab : 'pick';
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const niche = searchParams.get('niche') ?? 'all';
  const platform = searchParams.get('platform') ?? 'all';
  const requestedSort = searchParams.get('sort');
  const sort = isCampaignSort(requestedSort) ? requestedSort : 'newest';

  const setTab = (next: CreatorHomeTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'pick') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const setFilter = (key: 'q' | 'niche' | 'platform' | 'sort', value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value.trim() || value === 'all' || (key === 'sort' && value === 'newest')) params.delete(key);
    else params.set(key, value);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'open')
      .gt('deadline', new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const rows = await attachBrandLogos((data as Campaign[]) ?? []);
        const watched = await loadWatchlist('creator', user?.id);
        if (cancelled) return;
        setCampaigns(rows);
        setSaved(Object.fromEntries(rows.map((c) => [c.id, watched.includes(c.id)])));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const rows = campaigns.filter((c) => {
      if (!canApplyToCampaign(c.deadline)) return false;
      if (niche !== 'all' && c.niche !== niche) return false;
      if (platform !== 'all') {
        const plats = parseStringArray(c.platforms);
        if (plats.length > 0 && !plats.includes(platform)) return false;
      }
      if (!q) return true;
      const hay = `${c.title} ${c.brand_name} ${c.topic} ${c.angle} ${c.niche}`.toLowerCase();
      return hay.includes(q);
    });
    return sortCampaigns(rows, sort);
  }, [campaigns, q, niche, platform, sort]);

  const onToggleSave = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    void persistWatchlistToggle('creator', id, user?.id).then((next) => {
      setSaved((s) => ({ ...s, [id]: next }));
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-5 mb-6 md:mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{COPY[tab].title}</h1>
            <p className="text-muted-foreground">{COPY[tab].subtitle}</p>
          </div>
          {tab === 'pick' ? (
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
              <label className="flex items-center gap-2 h-11 rounded-full border border-[#dddddd] bg-white px-4 min-w-0 flex-1 sm:flex-none">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={searchParams.get('q') ?? ''}
                  onChange={(e) => setFilter('q', e.target.value)}
                  placeholder="Brand or keyword"
                  className="w-full sm:w-44 bg-transparent text-base md:text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
              <FilterSelect
                value={niche}
                onChange={(value) => setFilter('niche', value)}
                ariaLabel="Niche"
                options={[
                  { value: 'all', label: 'Any niche' },
                  ...NICHES.map((n) => ({ value: n, label: NICHE_LABELS[n] })),
                ]}
              />
              <FilterSelect
                value={platform}
                onChange={(value) => setFilter('platform', value)}
                ariaLabel="Platform"
                options={[
                  { value: 'all', label: 'Any platform' },
                  ...CAMPAIGN_PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] })),
                ]}
              />
              <FilterSelect
                value={sort}
                onChange={(value) => setFilter('sort', value)}
                ariaLabel="Sort"
                inactiveValue="newest"
                options={CAMPAIGN_SORTS.map((item) => ({ value: item.id, label: item.label }))}
              />
              </div>
            </div>
          ) : null}
        </div>

        <OnboardingBanner />

        {tab === 'mine' ? (
          <div role="tabpanel" id="creator-home-panel-mine" aria-labelledby="creator-home-tab-mine">
            <CreatorSubmissionsList onBrowse={() => setTab('pick')} />
          </div>
        ) : (
          <div role="tabpanel" id="creator-home-panel-pick" aria-labelledby="creator-home-tab-pick">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] md:rounded-[30px] p-8 md:p-12 text-center">
                <h2 className="font-display text-2xl font-bold mb-3">
                  {campaigns.length === 0 ? 'No open campaigns right now' : 'No campaigns match those filters'}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {campaigns.length === 0
                    ? 'Check back soon — brands fund new campaigns regularly.'
                    : 'Try another niche or platform, or clear the search.'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((c) => (
                  <CampaignPickCard
                    key={c.id}
                    campaign={c}
                    saved={Boolean(saved[c.id])}
                    onToggleSave={onToggleSave}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorBrowse;
