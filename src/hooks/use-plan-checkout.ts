import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStartAuth } from '@/hooks/use-start-auth';
import { isPro, paidPlanName, planAmountForRole } from '@/lib/plan';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { knownPlanCheckoutUrl, writePlanCheckoutCache } from '@/lib/nardopay-checkout';
import type { Audience } from '@/lib/audience';

type CheckoutResult = { url: string | null; error?: string };

let inflight: Promise<CheckoutResult> | null = null;
let inflightUserId: string | null = null;

const sessionStore = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage);

async function mintPlanCheckoutUrl(userId: string, role: string): Promise<CheckoutResult> {
  if (inflight && inflightUserId === userId) return inflight;

  inflightUserId = userId;
  inflight = (async () => {
    const { data, error } = await supabase.functions.invoke('create-plan-checkout', { body: {} });
    if (error || data?.error || !data?.url) {
      return {
        url: null,
        error: await edgeFunctionErrorMessage(error, data, 'Could not start NardoPay checkout'),
      };
    }
    const url = data.url as string;
    writePlanCheckoutCache(sessionStore(), userId, {
      url,
      amount: planAmountForRole(role),
      role,
    });
    return { url };
  })().finally(() => {
    inflight = null;
    inflightUserId = null;
  });

  return inflight;
}

/** Opens the stored NardoPay plan link immediately. Mints once if none exists yet. */
export function usePlanCheckout() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const startAuth = useStartAuth();
  const [busy, setBusy] = useState(false);

  const role = profile?.role === 'brand' ? 'brand' : profile?.role === 'creator' ? 'creator' : null;

  useEffect(() => {
    if (!user || !role || isPro(profile)) return;
    if (knownPlanCheckoutUrl(user.id, role, profile, sessionStore())) return;
    void mintPlanCheckoutUrl(user.id, role);
  }, [user, role, profile]);

  const startPlanCheckout = useCallback(
    (audience?: Audience | null) => {
      if (!user) {
        startAuth(audience ?? role ?? 'creator');
        return;
      }
      if (isPro(profile)) {
        toast({ title: `You are already on ${paidPlanName(role)}` });
        return;
      }
      const checkoutRole = role ?? (audience === 'brand' ? 'brand' : 'creator');
      const ready = knownPlanCheckoutUrl(user.id, checkoutRole, profile, sessionStore());
      if (ready) {
        window.location.href = ready;
        return;
      }

      setBusy(true);
      void mintPlanCheckoutUrl(user.id, checkoutRole).then((result) => {
        if (!result.url) {
          setBusy(false);
          toast({
            title: 'Checkout failed',
            description: result.error,
            variant: 'destructive',
          });
          return;
        }
        window.location.href = result.url;
      });
    },
    [user, profile, role, startAuth, toast],
  );

  return { startPlanCheckout, busy };
}
