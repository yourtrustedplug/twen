import { brandInitials, brandMarkTone } from '@/lib/brand-mark';
import { cn } from '@/lib/utils';

const BrandMark = ({
  name,
  color,
  seed,
  className,
}: {
  name: string;
  color?: string | null;
  seed?: string;
  className?: string;
}) => {
  const { bg, fg } = brandMarkTone(seed || name, color);
  return (
    <div
      className={cn(
        'rounded-full shrink-0 flex items-center justify-center font-semibold select-none leading-none',
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {brandInitials(name)}
    </div>
  );
};

export default BrandMark;
