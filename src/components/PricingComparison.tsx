import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import checkIcon from '@/assets/icons/check-icon.png';

interface ComparisonRow {
  name: string;
  unignored: boolean | string;
  ads: boolean | string;
  deals: boolean | string;
}

const columns = [
  { name: 'Unignored', price: 'Per verified view', period: 'escrow-funded', featured: true },
  { name: 'Ad platforms', price: 'Cheaper CPM', period: 'paid placements', featured: false },
  { name: 'Traditional influencer deals', price: 'Per post', period: 'negotiated', featured: false },
];

const comparisonData: { category: string; features: ComparisonRow[] }[] = [
  {
    category: 'What you pay for',
    features: [
      { name: 'Verified views only', unignored: true, ads: false, deals: false },
      { name: 'Inauthentic views screened out', unignored: true, ads: '—', deals: false },
      { name: 'Unspent budget refunded', unignored: true, ads: '—', deals: false },
    ],
  },
  {
    category: 'What the money buys',
    features: [
      { name: 'Real people your customers recognise', unignored: true, ads: false, deals: true },
      { name: 'Local creators, languages, formats', unignored: true, ads: false, deals: 'Some' },
      { name: 'Dozens of videos from one brief', unignored: true, ads: false, deals: false },
    ],
  },
  {
    category: 'Creator terms',
    features: [
      { name: 'No follower minimum', unignored: true, ads: '—', deals: false },
      { name: 'Budget visible before you commit', unignored: true, ads: '—', deals: false },
      { name: 'Mobile money payouts', unignored: true, ads: '—', deals: false },
    ],
  },
];

const FeatureCell = ({ value }: { value: boolean | string }) => {
  if (typeof value === 'string') {
    return <span className="text-base text-foreground">{value}</span>;
  }
  if (value) {
    return <img src={checkIcon} alt="Included" width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5 mx-auto" />;
  }
  return <span className="text-muted-foreground text-lg">—</span>;
};

// Mobile/Tablet Card Component
const MobileComparisonCard = ({
  column,
  columnKey,
}: {
  column: (typeof columns)[0];
  columnKey: 'unignored' | 'ads' | 'deals';
}) => {
  return (
    <div className={cn(
      'bg-white rounded-[30px] border border-[#f1f1f1] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden',
      columnKey === 'unignored' && 'ring-2 ring-primary'
    )}>
      {/* Card Header */}
      <div className={cn(
        'p-6 border-b border-[#f1f1f1]',
        columnKey === 'unignored' && 'bg-primary/5'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold">{column.name}</span>
          {columnKey === 'unignored' && (
            <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded-full">
              This is us
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-primary">{column.price}</span>
          <span className="text-sm text-muted-foreground">{column.period}</span>
        </div>
      </div>

      {/* Features List */}
      <div className="p-6">
        {comparisonData.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-6 last:mb-0">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              {category.category}
            </h4>
            <ul className="space-y-2">
              {category.features.map((feature, featureIndex) => {
                const value = feature[columnKey];
                const isIncluded = value === true || typeof value === 'string';
                return (
                  <li key={featureIndex} className="flex items-center gap-3">
                    {isIncluded ? (
                      <img src={checkIcon} alt="" width={16} height={16} loading="lazy" decoding="async" className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center text-muted-foreground flex-shrink-0">—</span>
                    )}
                    <span className={cn(
                      'text-sm',
                      isIncluded ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {feature.name}
                      {typeof value === 'string' && ` (${value})`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="px-6 pb-6">
        <Button variant="invofy" size="invofy" className="w-full" asChild>
          <a href="/signup">{columnKey === 'unignored' ? 'Get Started' : ''}</a>
        </Button>
      </div>
    </div>
  );
};

interface PricingComparisonProps {
  className?: string;
}

const PricingComparison = ({ className }: PricingComparisonProps) => {
  const columnKeys: ('unignored' | 'ads' | 'deals')[] = ['unignored', 'ads', 'deals'];

  return (
    <section className={cn('px-5 md:px-10 max-[479px]:px-5', className)}>
      <div className="max-w-[100rem] mx-auto">
        {/* Gray Background Container */}
        <div className="bg-[#fafafa] rounded-[4rem] max-[767px]:rounded-[3rem] overflow-hidden">
          {/* Inner Content with Padding */}
          <div className="py-24 max-[991px]:py-20 max-[767px]:py-16">
            <div className="px-12 max-[991px]:px-10 max-[767px]:px-8 max-[479px]:px-4">
              {/* Header */}
              <div className="text-center mb-16 max-[767px]:mb-12">
                <span className="inline-block text-xs tracking-[1px] uppercase font-semibold text-muted-foreground mb-4">
                  THE HONEST COMPARISON
                </span>
                <h2 className="text-[4.5rem] max-[991px]:text-[3rem] max-[767px]:text-[2rem] font-bold leading-[1.1] mb-6">
                  How Unignored Compares
                </h2>
                <p className="text-lg text-muted-foreground max-w-[40rem] mx-auto">
                  Ad platforms are cheaper per thousand. What the difference in price buys is a real person your customers recognise, speaking in their own words.
                </p>
              </div>

              {/* Mobile/Tablet Card Layout - hidden on desktop */}
              <div className="hidden max-[991px]:block">
                <div className="flex flex-col gap-6">
                  {columns.map((column, index) => (
                    <MobileComparisonCard
                      key={column.name}
                      column={column}
                      columnKey={columnKeys[index]}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop Table - hidden on mobile/tablet */}
              <div className="max-[991px]:hidden">
                <div className="bg-white rounded-[30px] border border-[#f1f1f1] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      {/* Table Header */}
                      <thead>
                        <tr className="border-b border-[#f1f1f1]">
                          <th className="text-left p-6 w-[40%]">
                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              Comparison
                            </span>
                          </th>
                          {columns.map((column, index) => (
                            <th
                              key={column.name}
                              className={cn(
                                'text-center p-6 w-[20%]',
                                index === 0 && 'bg-primary/5'
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
                        {comparisonData.map((category, categoryIndex) => (
                          <>
                            {/* Category Header */}
                            <tr key={`category-${categoryIndex}`} className="bg-[#0a101d]">
                              <td
                                colSpan={4}
                                className="p-4 text-sm font-bold uppercase tracking-wide text-white"
                              >
                                {category.category}
                              </td>
                            </tr>
                            {/* Feature Rows */}
                            {category.features.map((feature, featureIndex) => (
                              <tr
                                key={`feature-${categoryIndex}-${featureIndex}`}
                                className="border-b border-[#f1f1f1] last:border-b-0"
                              >
                                <td className="p-4 text-base text-foreground">
                                  {feature.name}
                                </td>
                                <td className="p-4 text-center bg-primary/5">
                                  <FeatureCell value={feature.unignored} />
                                </td>
                                <td className="p-4 text-center">
                                  <FeatureCell value={feature.ads} />
                                </td>
                                <td className="p-4 text-center">
                                  <FeatureCell value={feature.deals} />
                                </td>
                              </tr>
                            ))}
                          </>
                        ))}

                        {/* CTA Row */}
                        <tr className="border-t border-[#f1f1f1]">
                          <td className="p-6"></td>
                          <td className="p-6 text-center bg-primary/5">
                            <Button variant="invofy" size="invofy" className="w-full max-w-[160px]" asChild>
                              <a href="/signup">Get Started</a>
                            </Button>
                          </td>
                          <td className="p-6"></td>
                          <td className="p-6"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
