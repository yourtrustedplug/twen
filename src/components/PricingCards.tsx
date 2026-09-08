import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPro } from '@/lib/plan';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { useStartAuth } from '@/hooks/use-start-auth';
import pricingCardBg from '@/assets/pricing-card-bg.webp';
import checkIcon from '@/assets/icons/check-icon.png';
import cardIcon from '@/assets/icons/card-icon.png';
import { Loader2 } from 'lucide-react';
import type { Audience } from '@/lib/audience';

export const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Join campaigns and get paid.',
    brandDescription: 'Run campaigns and pay for views.',
    price: '$0',
    period: 'forever',
    features: [
      'Join open campaigns and post',
      'Keep every dollar you earn',
      'Withdraw to EcoCash, MoMo, Airtel Money, or M-Pesa',
      'Withdraw after a 7-day check',
      'No commission',
    ],
    brandFeatures: [
      'Fund a campaign and pay per 1,000 views',
      'Any creator can join',
      'Unused budget comes back',
      'No commission. No per-campaign fee.',
    ],
    buttonText: 'Start free',
    buttonVariant: 'invofy' as const,
    featured: true,
    footer: 'You can stay on Free forever',
    action: 'signup' as const,
  },
  {
    id: 'plus',
    name: 'Twen Plus',
    description: 'For brands who want to pick who posts.',
    price: '$49',
    period: '/mo',
    features: [
      'Everything in Free',
      'Search creators and hire specific people',
      'Message them and agree a rate',
      'Pay per click or per sale, not only views',
      'See which posts brought customers',
      'Hide creators who already worked with competitors',
    ],
    buttonText: 'Get Twen Plus',
    buttonVariant: 'invofyOutline' as const,
    featured: false,
    footer: 'Billed monthly',
    action: 'pro' as const,
    checkoutRole: 'brand' as const,
  },
  {
    id: 'creatorPro',
    name: 'Creator Pro',
    description: 'For creators who want brands to find them.',
    price: '$49',
    period: '/mo',
    features: [
      'Everything in Free',
      'Show up when brands search',
      'Get booking requests and a public rate card',
      'Connect more than one account',
      'Withdraw as soon as a campaign ends — no 7-day wait',
      'Message brands about your rate',
    ],
    buttonText: 'Get Creator Pro',
    buttonVariant: 'invofyOutline' as const,
    featured: false,
    footer: 'Billed monthly',
    action: 'pro' as const,
    checkoutRole: 'creator' as const,
  },
];

interface PricingCardsProps {
  className?: string;
  showStagger?: boolean;
  audience?: Audience;
}

const PricingCards = ({ className, showStagger = false, audience = 'creator' }: PricingCardsProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const startAuth = useStartAuth();

  const visiblePlans = pricingPlans
    .filter((plan) => plan.id === 'free' || plan.checkoutRole === audience)
    .map((plan) => {
      if (plan.id !== 'free') return plan;
      return {
        ...plan,
        description: audience === 'brand' ? plan.brandDescription : plan.description,
        features: audience === 'brand' ? plan.brandFeatures : plan.features,
      };
    });

  const startProCheckout = async (plan: (typeof pricingPlans)[number]) => {
    if (!user) {
      startAuth(plan.checkoutRole ?? null);
      return;
    }
    if (isPro(profile)) {
      toast({ title: 'You are already on Pro' });
      return;
    }
    setBusy(plan.name);
    const { data, error } = await supabase.functions.invoke('create-plan-checkout', { body: {} });
    setBusy(null);
    if (error || data?.error || !data?.url) {
      toast({
        title: 'Checkout failed',
        description: edgeFunctionErrorMessage(error, data, 'Could not start Pro checkout'),
        variant: 'destructive',
      });
      return;
    }
    window.location.href = data.url as string;
  };

  return (
    <div className={cn('grid grid-cols-2 max-[991px]:grid-cols-1 gap-6 lg:items-start max-w-[60rem] mx-auto', className)}>
      {visiblePlans.map((plan, index) => (
        <div
          key={index}
          className={cn(
            'bg-white border border-[#f1f1f1] rounded-[30px] flex flex-col p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]',
            showStagger && !plan.featured ? 'lg:mt-4' : '',
          )}
        >
          <div
            className="p-6 max-[479px]:p-5 text-left bg-cover bg-center rounded-[24px]"
            style={{ backgroundImage: `url(${pricingCardBg})` }}
          >
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <p className="text-base text-muted-foreground mb-4 font-normal">{plan.description}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[2.5rem] max-[479px]:text-[2rem] font-bold font-display leading-none">
                {plan.price}
              </span>
              <span className="text-base text-muted-foreground">{plan.period}</span>
            </div>
          </div>

          <div className="p-6 max-[479px]:p-5 flex-1 flex flex-col">
            {plan.action === 'signup' ? (
              <Button variant={plan.buttonVariant} size="invofy" className="w-full mb-6" onClick={() => startAuth(audience)}>
                {plan.buttonText}
              </Button>
            ) : (
              <Button
                variant={plan.buttonVariant}
                size="invofy"
                className="w-full mb-6"
                disabled={busy === plan.name}
                onClick={() => startProCheckout(plan)}
              >
                {busy === plan.name ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {plan.buttonText}
              </Button>
            )}

            <h4 className="text-sm font-semibold mb-4">What you get</h4>

            <ul className="flex flex-col gap-3">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start gap-3">
                  <img
                    src={checkIcon}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                  />
                  <span className="text-base text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 pb-6 max-[479px]:px-5 max-[479px]:pb-5">
            <div className="flex items-center gap-2">
              <img
                src={cardIcon}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                decoding="async"
                className="w-5 h-5"
              />
              <span className="text-base text-[#91959e]">{plan.footer}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PricingCards;
