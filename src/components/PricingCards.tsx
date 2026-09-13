import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND_PLUS_MONTHLY_USD, CREATOR_PRO_MONTHLY_USD, formatUsd } from '@/lib/plan';
import { useStartAuth } from '@/hooks/use-start-auth';
import { usePlanCheckout } from '@/hooks/use-plan-checkout';
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
    price: formatUsd(BRAND_PLUS_MONTHLY_USD),
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
    price: formatUsd(CREATOR_PRO_MONTHLY_USD),
    period: '/mo',
    features: [
      'Everything in Free',
      'Connect more than one account',
      'Set your price per video',
      'Get paid as soon as a campaign ends',
      'Appear when brands search',
      'Get booking requests from brands',
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
  const startAuth = useStartAuth();
  const { startPlanCheckout, busy } = usePlanCheckout();

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
                disabled={busy}
                onClick={() => startPlanCheckout(plan.checkoutRole ?? audience)}
              >
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
                    aria-hidden="true"
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
                aria-hidden="true"
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
