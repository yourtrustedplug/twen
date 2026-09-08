import { useId } from 'react';
import { cn } from '@/lib/utils';

export type LogoVariant = 'icon' | 'wordmark' | 'full';

export interface LogoProps {
  /** icon | wordmark | full (icon + wordmark) */
  variant?: LogoVariant;
  /**
   * Reverse = light plate + light wordmark for dark surfaces.
   * Default = dark plate + dark wordmark for light surfaces.
   */
  reverse?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  /** Duplicate wordmark for the navbar slide-up hover effect */
  animatedWordmark?: boolean;
  title?: string;
}

const INK = '#0A101D';
const PAPER = '#F5F5F5';

/**
 * Twen Orbit — planet, moon, orbital arc (content entering culture).
 * Multi-piece mark → rounded plate. Invofy peach→coral gradient.
 */
function Mark({
  className,
  reverse,
  title = 'Twen',
}: {
  className?: string;
  reverse?: boolean;
  title?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const plate = reverse ? PAPER : INK;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient
          id={gid}
          x1="8"
          y1="8"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFDFD2" />
          <stop offset="1" stopColor="#FFB0B6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={plate} />
      <circle cx="29.5" cy="18" r="9.25" fill={`url(#${gid})`} />
      <circle cx="14.5" cy="21.5" r="4.5" fill={`url(#${gid})`} />
      <path
        d="M11 31.5 C14 40.5 34 41.5 38 29.5"
        stroke={`url(#${gid})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function WordmarkText({
  className,
  reverse,
  animated,
}: {
  className?: string;
  reverse?: boolean;
  animated?: boolean;
}) {
  const textClass = cn(
    'font-bold font-display leading-none tracking-tight',
    reverse ? 'text-[#F5F5F5]' : 'text-foreground',
    className,
  );

  if (!animated) {
    return <span className={textClass}>Twen</span>;
  }

  return (
    <div className="relative h-8 overflow-hidden">
      <div className="flex flex-col">
        <span className={cn(textClass, 'leading-8')}>Twen</span>
        <span className={cn(textClass, 'leading-8')}>Twen</span>
      </div>
    </div>
  );
}

/**
 * Twen logo system — Orbit mark.
 *
 * Static SVG files:
 * icon.svg, icon-reverse.svg, wordmark.svg, wordmark-reverse.svg,
 * full.svg, full-reverse.svg
 */
export function Logo({
  variant = 'full',
  reverse = false,
  className,
  iconClassName,
  wordmarkClassName,
  animatedWordmark = false,
  title = 'Twen',
}: LogoProps) {
  const inkClass = reverse ? 'text-[#F5F5F5]' : 'text-foreground';

  if (variant === 'icon') {
    return (
      <Mark
        title={title}
        reverse={reverse}
        className={cn('shrink-0', iconClassName, className)}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <WordmarkText reverse={reverse} animated={animatedWordmark} className={wordmarkClassName} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', inkClass, className)}>
      <Mark title={title} reverse={reverse} className={cn('shrink-0', iconClassName)} />
      <WordmarkText reverse={reverse} animated={animatedWordmark} className={wordmarkClassName} />
    </span>
  );
}

export default Logo;
