import { useEffect } from 'react';
import { rememberAudience } from '@/lib/audience';
import { getAppTenant } from '@/lib/hosts';

/** Sync remembered marketing audience from the current subdomain. */
export function HostAudienceSync() {
  useEffect(() => {
    const tenant = getAppTenant();
    if (tenant === 'creators') rememberAudience('creator');
    if (tenant === 'brands') rememberAudience('brand');
  }, []);

  return null;
}
