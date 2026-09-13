import { cn } from '@/lib/utils';
import type { Verdict } from '@/lib/metrics';

export const MetricTile = ({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'bg-[#fafafa] border border-[#f1f1f1]',
      compact ? 'rounded-[14px] p-3' : 'rounded-[20px] md:rounded-[24px] p-4 md:p-5',
    )}
  >
    <p className="text-[10px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">{label}</p>
    <p
      className={cn(
        'font-display font-bold leading-none break-words',
        compact ? 'text-lg' : 'text-xl md:text-2xl',
      )}
    >
      {value}
    </p>
  </div>
);

export const VerdictPill = ({ verdict }: { verdict: Verdict }) => (
  <span
    className={cn(
      'inline-flex flex-col rounded-2xl px-4 py-2 text-xs font-semibold',
      verdict.tone === 'good' && 'bg-emerald-50 text-emerald-700',
      verdict.tone === 'bad' && 'bg-rose-50 text-rose-700',
      verdict.tone === 'neutral' && 'bg-[#fafafa] text-muted-foreground'
    )}
  >
    {verdict.label}
    <span className="font-normal opacity-70">{verdict.detail}</span>
  </span>
);
