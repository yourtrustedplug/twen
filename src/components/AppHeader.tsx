import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  Search,
  LogOut,
  MessageSquare,
  FolderKanban,
  Heart,
  Wallet,
  UserRound,
  BarChart3,
  Plus,
  Users,
  Shield,
} from 'lucide-react';
import { CAMPAIGN_PLATFORMS, NICHES, NICHE_LABELS, PLATFORM_LABELS } from '@/types/unignored';
import { isStaff } from '@/lib/staff';
import { Logo } from '@/logos';

type Role = 'creator' | 'brand' | 'moderator' | 'admin';

const menuFor = (role: Role, brandIsPro: boolean) => {
  if (isStaff(role)) {
    return [{ to: '/admin', label: 'Admin panel', icon: Shield }];
  }
  if (role === 'brand') {
    const items = [
      { to: '/brand', label: 'My campaigns', icon: FolderKanban },
      { to: '/brand/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/brand/campaigns/new', label: 'New campaign', icon: Plus },
      {
        to: '/brand/creators',
        label: brandIsPro ? 'Browse creators' : 'Browse creators · Pro',
        icon: Users,
      },
    ];
    if (brandIsPro) {
      items.push({ to: '/messages', label: 'Messages', icon: MessageSquare });
    }
    items.push({ to: '/brand/profile', label: 'My profile', icon: UserRound });
    return items;
  }
  return [
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/creator/submissions', label: 'My campaigns', icon: FolderKanban },
    { to: '/creator/watchlist', label: 'Watchlist', icon: Heart },
    { to: '/creator/earnings', label: 'Earnings', icon: Wallet },
    { to: '/creator/profile', label: 'My profile', icon: UserRound },
  ];
};

const homeFor = (role: Role | undefined) => {
  if (role === 'brand') return '/brand';
  if (isStaff(role)) return '/admin';
  return '/creator';
};

const AppHeader = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = profile?.role as Role | undefined;
  const isCreator = role === 'creator';
  const brandIsPro = profile?.plan === 'pro';
  const menuItems = role ? menuFor(role, brandIsPro) : [];

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [niche, setNiche] = useState(searchParams.get('niche') ?? 'all');
  const [platform, setPlatform] = useState(searchParams.get('platform') ?? 'all');

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
    setNiche(searchParams.get('niche') ?? 'all');
    setPlatform(searchParams.get('platform') ?? 'all');
  }, [searchParams]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const applyFilters = (e?: FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (niche && niche !== 'all') params.set('niche', niche);
    if (platform && platform !== 'all') params.set('platform', platform);

    if (location.pathname !== '/creator') {
      navigate({ pathname: '/creator', search: params.toString() ? `?${params}` : '' });
      return;
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#ebebeb] bg-background">
      <div className="max-w-[100rem] mx-auto px-5 md:px-10">
        <div className="h-[80px] md:h-[88px] flex items-center justify-between gap-4 md:gap-6">
          <Link
            to={user ? homeFor(role) : '/'}
            className="shrink-0 no-underline"
          >
            <Logo
              variant="full"
              iconClassName="w-6 h-6 md:w-7 md:h-7"
              wordmarkClassName="text-xl md:text-2xl"
            />
          </Link>

          {/* Filters — creators only */}
          {user && isCreator && (
            <form
              onSubmit={applyFilters}
              className="hidden md:flex flex-1 max-w-[720px] mx-auto items-center rounded-full border border-[#dddddd] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_6px_16px_rgba(0,0,0,0.08)] transition-shadow divide-x divide-[#ebebeb]"
            >
              <label className="flex-1 min-w-0 px-5 py-2.5 cursor-text">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground mb-0.5">
                  Search
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Brand, campaign, keyword"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>

              <label className="w-[160px] shrink-0 px-4 py-2.5 cursor-pointer">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground mb-0.5">
                  Niche
                </span>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none text-foreground appearance-none cursor-pointer"
                >
                  <option value="all">Any niche</option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>
                      {NICHE_LABELS[n]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="w-[150px] shrink-0 px-4 py-2.5 cursor-pointer">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground mb-0.5">
                  Platform
                </span>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none text-foreground appearance-none cursor-pointer"
                >
                  <option value="all">Any</option>
                  {CAMPAIGN_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pr-2 pl-1">
                <button
                  type="submit"
                  aria-label="Search"
                  className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="flex items-center gap-3 rounded-full border border-[#dddddd] pl-3 pr-1.5 py-1.5 bg-white hover:shadow-md transition-shadow"
                  >
                    <Menu className="h-4 w-4 text-foreground" />
                    <span className="h-8 w-8 rounded-full bg-[#222222] text-white text-sm font-semibold flex items-center justify-center">
                      {(profile?.full_name || profile?.company_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-lg">
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="font-semibold text-foreground truncate">
                      {profile?.full_name || profile?.company_name || 'Account'}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal capitalize">
                      {isStaff(role) ? 'Admin' : role}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {menuItems.map((item) => (
                    <DropdownMenuItem
                      key={item.to}
                      className="rounded-xl px-3 py-2.5 cursor-pointer gap-3"
                      onSelect={() => navigate(item.to)}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-xl px-3 py-2.5 cursor-pointer gap-3 text-muted-foreground"
                    onSelect={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/signin"
                className="text-sm font-semibold px-4 py-2 rounded-full border border-[#dddddd] hover:shadow-md transition-shadow"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {user && isCreator && (
          <form onSubmit={applyFilters} className="md:hidden pb-4 space-y-2">
            <div className="flex items-center gap-2 rounded-full border border-[#dddddd] bg-white shadow-sm px-4 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search campaigns"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="text-xs font-semibold text-primary shrink-0">
                Go
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="flex-1 rounded-full border border-[#dddddd] bg-white px-4 py-2 text-sm"
              >
                <option value="all">Any niche</option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {NICHE_LABELS[n]}
                  </option>
                ))}
              </select>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="flex-1 rounded-full border border-[#dddddd] bg-white px-4 py-2 text-sm"
              >
                <option value="all">Any platform</option>
                {CAMPAIGN_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </form>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
