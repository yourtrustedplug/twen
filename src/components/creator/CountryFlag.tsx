import { cn } from '@/lib/utils';
import { flagUrl } from '@/lib/payout-methods';

const CountryFlag = ({ iso, className }: { iso: string; className?: string }) => {
  if (!iso) return null;
  return (
    <img
      src={flagUrl(iso)}
      alt=""
      width={24}
      height={16}
      className={cn('h-4 w-6 shrink-0 rounded-[3px] object-cover', className)}
    />
  );
};

export default CountryFlag;
