import { cn } from '@/lib/utils';
import type { Verdict } from '@/lib/metrics';

export const MetricTile = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] p-5">
    <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground mb-2">{label}</p>
    <p className="font-display text-2xl font-bold leading-none">{value}</p>
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
