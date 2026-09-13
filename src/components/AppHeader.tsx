import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  LogOut,
  MessageSquare,
  Heart,
  X,
  Wallet,
  UserRound,
  BarChart3,
  Plus,
  Users,
  Shield,
} from 'lucide-react';
import { isStaff } from '@/lib/staff';
import { signedOutPath } from '@/lib/auth-routes';
import { creatorHomePath, isCreatorHomeTab } from '@/lib/creator-home';
import { Logo } from '@/logos';
import CreatorHomeTabs from '@/components/creator/CreatorHomeTabs';
import { CreatorPhoto } from '@/components/CreatorCard';
import BrandMark from '@/components/BrandMark';

type Role = 'creator' | 'brand' | 'moderator' | 'admin';

const menuFor = (role: Role, brandIsPro: boolean) => {
  if (isStaff(role)) {
    return [{ to: '/admin', label: 'Admin panel', icon: Shield }];
  }
  if (role === 'brand') {
    const items = [
      { to: '/brand/profile', label: 'My profile', icon: UserRound },
      { to: '/brand/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/brand/campaigns/new', label: 'New campaign', icon: Plus },
      { to: '/brand/creators', label: brandIsPro ? 'Browse creators' : 'Browse creators · Pro', icon: Users },
      { to: '/messages', label: 'Messages', icon: MessageSquare },
    ];
    return items;
  }
  return [
    { to: '/creator/profile', label: 'My profile', icon: UserRound },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/creator/watchlist', label: 'Watchlist', icon: Heart },
    { to: '/creator/earnings', label: 'Earnings', icon: Wallet },
  ];
};

const homeFor = (role: Role | undefined) => {
  if (role === 'brand') return '/brand';
  if (isStaff(role)) return '/admin';
  return '/creator';
};

/** Hamburger destinations get a focused header (no home tabs, Cancel back to home). */
const MENU_PATHS = [
  '/creator/profile',
  '/creator/watchlist',
  '/creator/earnings',
  '/creator/campaigns',
  '/messages',
  '/brand/profile',
  '/brand/analytics',
  '/brand/campaigns/new',
  '/brand/creators',
];

const isMenuExperience = (pathname: string) =>
  MENU_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const AppHeader = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const role = profile?.role as Role | undefined;
  const isCreator = role === 'creator';
  const brandIsPro = profile?.plan === 'pro';
  const menuItems = role ? menuFor(role, brandIsPro) : [];
  const focused = isMenuExperience(location.pathname);
  const showHomeTabs = Boolean(user && isCreator && !focused);
  const requestedTab = searchParams.get('tab');
  const homeTab =
    location.pathname === '/creator' && isCreatorHomeTab(requestedTab) ? requestedTab : 'pick';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const goHomeTab = (tab: typeof homeTab) => {
    if (location.pathname !== '/creator') {
      navigate(creatorHomePath(tab));
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (tab === 'pick') params.delete('tab');
    else params.set('tab', tab);
    navigate({
      pathname: '/creator',
      search: params.toString() ? `?${params}` : '',
    });
  };

  if (focused) {
    const onPayoutAccount = location.pathname.startsWith('/creator/earnings/account');
    const title = location.pathname.startsWith('/creator/campaigns/')
      ? 'Submit campaign'
      : onPayoutAccount
        ? 'Payout account'
        : menuItems
            .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
            ?.label.replace(/ · Pro$/, '') ?? 'Account';

    return (
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#FFDFD2] to-[#FFB0B6] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="h-14 md:h-[4.5rem] bg-background rounded-t-[1.25rem] md:rounded-t-[1.5rem] border-b border-[#ebebeb] flex items-center gap-3 md:gap-4 px-4 md:px-8">
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => navigate(onPayoutAccount ? '/creator/earnings' : homeFor(role))}
            className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-[#0A101D] hover:bg-[#f4f4f4] transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="font-semibold text-base md:text-lg text-[#0A101D] truncate">
            {title}
          </h1>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#ebebeb] bg-background pt-[env(safe-area-inset-top)]">
      <div className="max-w-[100rem] mx-auto px-5 md:px-10">
        <div className="h-16 md:h-[88px] flex items-center justify-between gap-3 md:gap-6">
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

          {showHomeTabs ? (
            <div className="hidden md:flex flex-1 justify-center min-w-0">
              <CreatorHomeTabs value={homeTab} onChange={goHomeTab} />
            </div>
          ) : null}

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="flex items-center gap-2.5 md:gap-3 rounded-full border border-[#dddddd] pl-2.5 pr-1 py-1 md:pl-3 md:pr-1.5 md:py-1.5 bg-white hover:shadow-md transition-shadow min-h-11 overflow-hidden"
                  >
                    <Menu className="h-4 w-4 text-foreground shrink-0" />
                    {role === 'brand' ? (
                      <BrandMark
                        name={profile?.company_name || profile?.full_name || 'Brand'}
                        color={profile?.brand_primary_color}
                        seed={user.id}
                        className="h-8 w-8 text-[11px]"
                      />
                    ) : (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-[#f4f4f4] shrink-0">
                        <CreatorPhoto
                          id={user.id}
                          avatarUrl={profile?.avatar_url}
                          alt={profile?.full_name || 'Account'}
                          className="block h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(16rem,calc(100vw-2rem))] rounded-2xl p-2 shadow-lg">
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
                to={signedOutPath()}
                className="text-sm font-semibold px-4 py-2.5 rounded-full border border-[#dddddd] hover:shadow-md transition-shadow"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        {showHomeTabs ? (
          <div className="md:hidden flex justify-center pb-3">
            <CreatorHomeTabs value={homeTab} onChange={goHomeTab} />
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default AppHeader;
