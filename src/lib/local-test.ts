import { supabase } from '@/integrations/supabase/client';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';

/**
 * Local-only test mode.
 *
 * Requires all of:
 *   - VITE_LOCAL_TEST_MODE=true
 *   - a development build
 *   - the page served from localhost / 127.0.0.1
 *   - VITE_SUPABASE_URL pointing at localhost / 127.0.0.1
 *
 * Production builds and production hosts always return false, even if the flag
 * is accidentally set in a deployed environment.
 */
export function isLocalTestMode(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.VITE_LOCAL_TEST_MODE !== 'true') return false;
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.toLowerCase();
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) return false;

  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(url);
}

export type SimulatedFunding = {
  simulated: true;
  payment_ref: string;
  campaign: {
    id: string;
    status: string;
    funded_amount: number;
    budget: number;
    nardopay_payment_ref: string | null;
  };
};

export async function simulateCampaignFunding(campaignId: string): Promise<SimulatedFunding> {
  if (!isLocalTestMode()) {
    throw new Error('Simulated payments are only available in the local test harness');
  }

  const { data, error } = await supabase.functions.invoke('local-test-fund-campaign', {
    body: { campaignId },
  });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage(error, data, 'Could not simulate payment'));
  }
  if (data?.error) throw new Error(String(data.error));
  if (!data?.simulated) throw new Error('The local funding endpoint returned an unexpected response');

  return data as SimulatedFunding;
}

export type SimulatedSubmission = {
  simulated: true;
  submission: {
    id: string;
    campaign_id: string;
    creator_id: string;
    status: string;
    platform: string;
    tiktok_url: string;
  };
  message: string;
};

export async function simulateCreatorSubmission(
  campaignId: string,
  platform: string,
  checklistResults: unknown,
): Promise<SimulatedSubmission> {
  if (!isLocalTestMode()) {
    throw new Error('Simulated submissions are only available in the local test harness');
  }

  const { data, error } = await supabase.functions.invoke('local-test-submit', {
    body: { campaignId, platform, checklistResults },
  });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage(error, data, 'Could not simulate submission'));
  }
  if (data?.error) throw new Error(String(data.error));
  if (!data?.simulated) throw new Error('The local submission endpoint returned an unexpected response');

  return data as SimulatedSubmission;
}
