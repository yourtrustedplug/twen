import { cn } from '@/lib/utils';
import type { Audience } from '@/lib/audience';

interface PricingAudienceSwitchProps {
  audience: Audience;
  onAudienceChange: (audience: Audience) => void;
  className?: string;
}

const options: { id: Audience; label: string }[] = [
  { id: 'creator', label: 'Creators' },
  { id: 'brand', label: 'Brands' },
];

const PricingAudienceSwitch = ({ audience, onAudienceChange, className }: PricingAudienceSwitchProps) => {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <p className="text-xs tracking-[1px] uppercase font-semibold text-muted-foreground">
        Show plans for
      </p>
      <div
        role="tablist"
        aria-label="Show plans for"
        className="inline-flex p-1 rounded-full border border-[#e9e9e9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      >
        {options.map((option) => {
          const selected = audience === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onAudienceChange(option.id)}
              className={cn(
                'min-w-[9.5rem] max-[479px]:min-w-[7.5rem] px-6 py-2.5 rounded-full text-base font-semibold transition-colors duration-200',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PricingAudienceSwitch;
