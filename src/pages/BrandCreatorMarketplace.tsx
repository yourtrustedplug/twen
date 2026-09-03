import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import CreatorCard from '@/components/CreatorCard';
import { Input } from '@/components/ui/input';
import type { ProfileRow } from '@/types/unignored';
import { PLATFORMS, PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const BrandCreatorMarketplace = () => {
  const [creators, setCreators] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string>('all');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'creator')
      .eq('marketplace_visible', true)
      .order('avg_views', { ascending: false })
      .then(({ data }) => {
        setCreators((data as ProfileRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return creators.filter((c) => {
      const platforms = parseStringArray(c.platforms);
      const matchesPlatform = platform === 'all' || platforms.includes(platform);
      const matchesQuery =
        !q ||
        (c.full_name ?? '').toLowerCase().includes(q) ||
        (c.tiktok_handle ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q);
      return matchesPlatform && matchesQuery;
    });
  }, [creators, query, platform]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">Creators</h1>
        <p className="text-muted-foreground mb-8">Rate cards, reach, engagement. Message or hire directly.</p>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, handle or city"
            className="md:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {['all', ...PLATFORMS].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  'text-xs font-semibold rounded-full px-4 py-2 border transition-colors',
                  platform === p
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'border-[#f1f1f1] text-muted-foreground hover:text-foreground'
                )}
              >
                {p === 'all' ? 'All platforms' : PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center text-muted-foreground">
            No creators match that yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BrandCreatorMarketplace;
