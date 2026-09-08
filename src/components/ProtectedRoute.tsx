import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleHome, UserRole } from '@/contexts/AuthContext';
import { isStaff } from '@/lib/staff';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Exact role required (e.g. brand / creator). */
  role?: UserRole;
  /** Admin panel: moderator and admin are the same. */
  staff?: boolean;
}

export function ProtectedRoute({ children, role, staff }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || (user && (role || staff) && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (staff && profile && !isStaff(profile.role)) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  if (role && profile && profile.role !== role) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return <>{children}</>;
}
