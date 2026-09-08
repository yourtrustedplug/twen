import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { goToAppPath, roleAppHref } from '@/lib/hosts';
import { Loader2 } from 'lucide-react';

/** Same-origin Navigate, or hard redirect to the role subdomain (with session handoff). */
export function AppNavigate({
  role,
  path,
  replace = true,
}: {
  role: string | null | undefined;
  path: string;
  replace?: boolean;
}) {
  const href = roleAppHref(role, path);
  const started = useRef(false);

  useEffect(() => {
    if (!href.startsWith('http') || started.current) return;
    started.current = true;
    void goToAppPath(role, path, undefined, replace);
  }, [href, role, path, replace]);

  if (href.startsWith('http')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Navigate to={path} replace={replace} />;
}
