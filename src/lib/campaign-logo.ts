import { supabase } from '@/integrations/supabase/client';
import { campaignLogoPath } from '@/lib/brand-kit';

/** Fills logos from the campaign kit, then a definer RPC for live profile logos. */
export async function attachBrandLogos<T extends { id: string; brand_kit?: unknown }>(
  rows: T[],
): Promise<(T & { brand_logo: string | null })[]> {
  const missing = rows.filter((row) => !campaignLogoPath(row)).map((row) => row.id);
  const fromRpc = new Map<string, string>();

  if (missing.length) {
    const { data, error } = await supabase.rpc('campaign_brand_logos', { p_ids: missing });
    if (!error) {
      for (const row of data ?? []) {
        if (row.logo_path) fromRpc.set(row.campaign_id, row.logo_path);
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    brand_logo: campaignLogoPath(row) ?? fromRpc.get(row.id) ?? null,
  }));
}
