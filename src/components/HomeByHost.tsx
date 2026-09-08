import { Navigate } from 'react-router-dom';
import AudienceGate from '@/pages/AudienceGate';
import { getAppTenant } from '@/lib/hosts';

/**
 * `/` by host:
 *   twen.app           → audience gate (landings are /creators, /brands on apex)
 *   creator.twen.app   → creator app
 *   brand.twen.app     → brand app
 *   admin.twen.app     → staff admin
 */
export function HomeByHost() {
  const tenant = getAppTenant();
  if (tenant === 'creator') return <Navigate to="/creator" replace />;
  if (tenant === 'brand') return <Navigate to="/brand" replace />;
  if (tenant === 'admin') return <Navigate to="/admin" replace />;
  return <AudienceGate />;
}
