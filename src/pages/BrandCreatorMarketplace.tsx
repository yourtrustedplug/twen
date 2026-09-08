import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import CreatorCard from '@/components/CreatorCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ProfileRow } from '@/types/unignored';
import { PLATFORMS, PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { isPro } from '@/lib/plan';
import { Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const BrandCreatorMarketplace = () => {
  const { profile } = useAuth();
  const pro = isPro(profile);

  const [creators, setCreators] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    if (!pro) {
      setLoading(false);
      return;
    }
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
  }, [pro]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return creators.filter((c) => {
      const platforms = parseStringArray(c.platforms);
      if (platform !== 'all' && !platforms.includes(platform)) return false;
      if (!q) return true;
      return (
        (c.full_name ?? '').toLowerCase().includes(q) ||
        (c.tiktok_handle ?? '').toLowerCase().includes(q) ||
        (c.instagram_handle ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.country ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q) ||
        (c.bio ?? '').toLowerCase().includes(q)
      );
    });
  }, [creators, query, platform]);

  if (!pro) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-5 md:px-10 py-20 text-center">
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12">
            <Lock className="h-8 w-8 mx-auto mb-5 text-muted-foreground" />
            <h1 className="font-display text-3xl font-bold mb-3">Browse creators is Twen Plus</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Free brands run open bounty campaigns. Twen Plus lets you search creators, filter by niche and platform, and hire directly.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="invofy" size="invofy" asChild>
                <Link to="/pricing">See Twen Plus</Link>
              </Button>
              <Button variant="invofyOutline" size="invofy" asChild>
                <Link to="/brand">Back to campaigns</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Find creators</h1>
        <p className="text-muted-foreground mb-8">
          Real people to distribute your content. Message or hire.
        </p>

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
            No creators match those filters.
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
