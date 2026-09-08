import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import checkIcon from '@/assets/icons/check-icon.png';
import { useStartAuth } from '@/hooks/use-start-auth';
import type { Audience } from '@/lib/audience';
import PricingAudienceSwitch from '@/components/PricingAudienceSwitch';

interface ComparisonRow {
  name: string;
  free: boolean | string;
  brandsPro: boolean | string;
  creatorPro: boolean | string;
}

type ColumnKey = 'free' | 'brandsPro' | 'creatorPro';

const allColumns: { name: string; price: string; period: string; featured: boolean; key: ColumnKey }[] = [
  { name: 'Free', price: '$0', period: 'forever', featured: false, key: 'free' },
  { name: 'Twen Plus', price: '$49', period: '/mo', featured: true, key: 'brandsPro' },
  { name: 'Creator Pro', price: '$49', period: '/mo', featured: true, key: 'creatorPro' },
];

const comparisonData: { category: string; features: ComparisonRow[] }[] = [
  {
    category: 'Campaigns and payouts',
    features: [
      { name: 'Pay for verified views', free: true, brandsPro: true, creatorPro: true },
      { name: 'Unused budget comes back / creators keep 100%', free: true, brandsPro: true, creatorPro: true },
      { name: 'Pay per click, per sale, or hire someone', free: false, brandsPro: true, creatorPro: 'You can be hired' },
      { name: 'Withdraw as soon as the campaign ends', free: false, brandsPro: '—', creatorPro: true },
    ],
  },
  {
    category: 'Finding people',
    features: [
      { name: 'Open campaigns anyone can join', free: true, brandsPro: true, creatorPro: true },
      { name: 'Search and invite specific creators', free: false, brandsPro: true, creatorPro: 'You show up in search' },
      { name: 'Public profile and rate card', free: false, brandsPro: 'Browse profiles', creatorPro: true },
      { name: 'More than one social account', free: false, brandsPro: '—', creatorPro: true },
      { name: 'Hide creators who worked with competitors', free: false, brandsPro: true, creatorPro: false },
    ],
  },
  {
    category: 'Messages and results',
    features: [
      { name: 'Direct messages', free: false, brandsPro: true, creatorPro: true },
      { name: 'Agree a rate before they post', free: false, brandsPro: true, creatorPro: true },
      { name: 'Click and sales reports', free: false, brandsPro: true, creatorPro: 'Your own results' },
      { name: 'Past campaign results', free: 'View counts', brandsPro: true, creatorPro: true },
    ],
  },
];

const isPresent = (value: boolean | string) =>
  value === true || (typeof value === 'string' && value !== '—');

const FeatureCell = ({ value }: { value: boolean | string }) => {
  if (typeof value === 'string' && value !== '—') {
    return <span className="text-base text-foreground">{value}</span>;
  }
  if (value === true) {
    return <img src={checkIcon} alt="Included" width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5 mx-auto" />;
  }
  return <span className="text-muted-foreground text-lg">—</span>;
};

const ctaForColumn = (key: ColumnKey) => {
  if (key === 'brandsPro') return 'Get Twen Plus';
  if (key === 'creatorPro') return 'Get Creator Pro';
  return 'Start free';
};

const MobileComparisonCard = ({
  column,
  columnKey,
  audience,
}: {
  column: (typeof allColumns)[0];
  columnKey: ColumnKey;
  audience: Audience;
}) => {
  const startAuth = useStartAuth();
  const paidKey: ColumnKey = audience === 'brand' ? 'brandsPro' : 'creatorPro';

  return (
    <div className={cn(
      'bg-white rounded-[30px] border border-[#f1f1f1] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden',
      column.featured && 'ring-2 ring-primary'
    )}>
      <div className={cn(
        'p-6 border-b border-[#f1f1f1]',
        column.featured && 'bg-primary/5'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold">{column.name}</span>
          {column.featured && (
            <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded-full">
              {audience === 'brand' ? 'Brands' : 'Creators'}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-primary">{column.price}</span>
          <span className="text-sm text-muted-foreground">{column.period}</span>
        </div>
      </div>

      <div className="p-6">
        {comparisonData.map((category, categoryIndex) => {
          const features = category.features.filter(
            (feature) => isPresent(feature.free) || isPresent(feature[paidKey]),
          );
          if (features.length === 0) return null;
          return (
            <div key={categoryIndex} className="mb-6 last:mb-0">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                {category.category}
              </h4>
              <ul className="space-y-2">
                {features.map((feature, featureIndex) => {
                  const value = feature[columnKey];
                  const included = isPresent(value);
                  return (
                    <li key={featureIndex} className="flex items-start gap-3">
                      {included ? (
                        <img src={checkIcon} alt="" width={16} height={16} loading="lazy" decoding="async" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground flex-shrink-0">—</span>
                      )}
                      <span className={cn(
                        'text-sm',
                        included ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {feature.name}
                        {typeof value === 'string' && value !== '—' && ` · ${value}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="px-6 pb-6">
        <Button variant="invofy" size="invofy" className="w-full" onClick={() => startAuth(audience)}>
          {ctaForColumn(columnKey)}
        </Button>
      </div>
    </div>
  );
};

interface PricingComparisonProps {
  className?: string;
  audience?: Audience;
  onAudienceChange?: (audience: Audience) => void;
}

const PricingComparison = ({ className, audience = 'creator', onAudienceChange }: PricingComparisonProps) => {
  const paidKey: ColumnKey = audience === 'brand' ? 'brandsPro' : 'creatorPro';
  const columns = allColumns.filter((column) => column.key === 'free' || column.key === paidKey);
  const startAuth = useStartAuth();

  return (
    <section className={cn('px-5 md:px-10 max-[479px]:px-5', className)}>
      <div className="max-w-[100rem] mx-auto">
        <div className="bg-[#fafafa] rounded-[4rem] max-[767px]:rounded-[3rem] overflow-hidden">
          <div className="py-24 max-[991px]:py-20 max-[767px]:py-16">
            <div className="px-12 max-[991px]:px-10 max-[767px]:px-8 max-[479px]:px-4">
              <div className="text-center mb-16 max-[767px]:mb-12">
                <span className="inline-block text-xs tracking-[1px] uppercase font-semibold text-muted-foreground mb-4">
                  Compare plans
                </span>
                <h2 className="text-[4.5rem] max-[991px]:text-[3rem] max-[767px]:text-[2rem] font-bold leading-[1.1] mb-6">
                  What's included
                </h2>
                <p className="text-lg text-muted-foreground max-w-[42rem] mx-auto mb-8">
                  {audience === 'brand'
                    ? 'Free vs Twen Plus for brands.'
                    : 'Free vs Creator Pro for creators.'}
                </p>
                {onAudienceChange ? (
                  <PricingAudienceSwitch audience={audience} onAudienceChange={onAudienceChange} />
                ) : null}
              </div>

              <div className="hidden max-[991px]:block">
                <div className="flex flex-col gap-6">
                  {columns.map((column) => (
                    <MobileComparisonCard
                      key={column.name}
                      column={column}
                      columnKey={column.key}
                      audience={audience}
                    />
                  ))}
                </div>
              </div>

              <div className="max-[991px]:hidden">
                <div className="bg-white rounded-[30px] border border-[#f1f1f1] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="border-b border-[#f1f1f1]">
                          <th className="text-left p-6 w-[50%]">
                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Feature
                            </span>
                          </th>
                          {columns.map((column) => (
                            <th
                              key={column.name}
                              className={cn(
                                'text-center p-6 w-[25%]',
                                column.featured && 'bg-primary/5'
                              )}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-lg font-bold">{column.name}</span>
                                <span className="text-base font-semibold text-primary">{column.price}</span>
                                <span className="text-sm text-muted-foreground">{column.period}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {comparisonData.map((category, categoryIndex) => {
                          const features = category.features.filter(
                            (feature) => isPresent(feature.free) || isPresent(feature[paidKey]),
                          );
                          if (features.length === 0) return null;
                          return (
                            <Fragment key={category.category}>
                              <tr className="bg-[#0a101d]">
                                <td
                                  colSpan={3}
                                  className="p-4 text-sm font-bold uppercase tracking-wide text-white"
                                >
                                  {category.category}
                                </td>
                              </tr>
                              {features.map((feature, featureIndex) => (
                                <tr
                                  key={`feature-${categoryIndex}-${featureIndex}`}
                                  className="border-b border-[#f1f1f1] last:border-b-0"
                                >
                                  <td className="p-4 text-base text-foreground">
                                    {feature.name}
                                  </td>
                                  {columns.map((column) => (
                                    <td
                                      key={column.key}
                                      className={cn('p-4 text-center', column.featured && 'bg-primary/5')}
                                    >
                                      <FeatureCell value={feature[column.key]} />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}

                        <tr className="border-t border-[#f1f1f1]">
                          <td className="p-6"></td>
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              className={cn('p-6 text-center', column.featured && 'bg-primary/5')}
                            >
                              <Button
                                variant={column.featured ? 'invofy' : 'invofyOutline'}
                                size="invofy"
                                className="w-full max-w-[160px]"
                                onClick={() => startAuth(audience)}
                              >
                                {ctaForColumn(column.key)}
                              </Button>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-16 max-[767px]:mt-12 max-w-[42rem] mx-auto text-center">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {audience === 'brand'
                    ? 'Open campaigns stay open to every creator. Plus lets you hire specific people and message them.'
                    : 'Paying does not jump the queue. Open campaigns stay open to every creator.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
