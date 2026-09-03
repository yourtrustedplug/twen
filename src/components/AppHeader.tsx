import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LogOut, Menu, X } from 'lucide-react';

const navItemsFor = (role: 'creator' | 'brand' | undefined) => {
  if (role === 'brand') {
    return [
      { to: '/brand', label: 'Dashboard' },
      { to: '/brand/campaigns/new', label: 'New Campaign' },
    ];
  }
  return [
    { to: '/creator', label: 'Browse Campaigns' },
    { to: '/creator/submissions', label: 'My Submissions' },
    { to: '/creator/earnings', label: 'Earnings' },
  ];
};

const AppHeader = () => {
  const { user, profile, isAnonymous, switchDemoRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const items = navItemsFor(profile?.role as 'creator' | 'brand' | undefined);

  const handleSwitch = async (role: 'creator' | 'brand') => {
    setSwitching(true);
    const { error } = await switchDemoRole(role);
    setSwitching(false);
    if (!error) {
      setMenuOpen(false);
      navigate(role === 'brand' ? '/brand' : '/creator');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f1f1f1] bg-background/80 backdrop-blur-md">
      <div className="max-w-[100rem] mx-auto px-5 md:px-10">
        <div className="h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-10 min-w-0">
            <Link to="/" className="font-display font-bold text-xl tracking-tight shrink-0">
              Unignored
            </Link>
            {user && (
              <nav className="hidden md:flex items-center gap-6">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/brand' || item.to === '/creator'}
                    className={({ isActive }) =>
                      cn(
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAnonymous && (
              <div className="hidden sm:flex items-center gap-1 bg-[#fafafa] border border-[#f1f1f1] rounded-full p-1">
                <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground px-2">
                  Demo
                </span>
                <button
                  onClick={() => handleSwitch('creator')}
                  disabled={switching}
                  className={cn(
                    'text-xs font-semibold px-3 py-1 rounded-full transition-colors',
                    profile?.role === 'creator'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Creator
                </button>
                <button
                  onClick={() => handleSwitch('brand')}
                  disabled={switching}
                  className={cn(
                    'text-xs font-semibold px-3 py-1 rounded-full transition-colors',
                    profile?.role === 'brand'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Brand
                </button>
              </div>
            )}
            {!user && (
              <Button variant="invofy" size="sm" asChild>
                <Link to="/signin">Sign in</Link>
              </Button>
            )}
            {user && !isAnonymous && (
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
            {user && isAnonymous && (
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Exit demo
              </button>
            )}
            {user && (
              <button
                className="md:hidden p-2 -mr-2"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        {user && menuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-xl text-sm font-medium',
                    isActive ? 'bg-[#fafafa] text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAnonymous && (
              <div className="flex items-center gap-2 px-3 pt-2">
                <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  Demo
                </span>
                <button
                  onClick={() => handleSwitch('creator')}
                  className={cn(
                    'text-xs font-semibold px-3 py-1 rounded-full border',
                    profile?.role === 'creator' ? 'bg-primary text-primary-foreground border-transparent' : 'border-[#f1f1f1]'
                  )}
                >
                  Creator
                </button>
                <button
                  onClick={() => handleSwitch('brand')}
                  className={cn(
                    'text-xs font-semibold px-3 py-1 rounded-full border',
                    profile?.role === 'brand' ? 'bg-primary text-primary-foreground border-transparent' : 'border-[#f1f1f1]'
                  )}
                >
                  Brand
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
