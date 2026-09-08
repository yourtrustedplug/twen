import { Navigate } from 'react-router-dom';
import AudienceGate from '@/pages/AudienceGate';
import CreatorLanding from '@/pages/CreatorLanding';
import BrandLanding from '@/pages/BrandLanding';
import { getAppTenant } from '@/lib/hosts';

/** Home route: subdomain picks the surface; apex stays the creator/brand gate. */
export function HomeByHost() {
  const tenant = getAppTenant();
  if (tenant === 'creators') return <CreatorLanding />;
  if (tenant === 'brands') return <BrandLanding />;
  if (tenant === 'admin') return <Navigate to="/admin" replace />;
  return <AudienceGate />;
}
