import { Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/http-errors';
import { cn } from '@/lib/utils';

type SupportMailButtonProps = {
  className?: string;
  size?: 'sm' | 'md';
};

/** Honest contact control — Twen has no public social profiles yet. */
export function SupportMailButton({ className, size = 'md' }: SupportMailButtonProps) {
  const box = size === 'sm' ? 'w-10 h-10' : 'w-11 h-11';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      aria-label={`Email ${SUPPORT_EMAIL}`}
      className={cn(
        'group flex items-center justify-center bg-foreground rounded-full transition-transform duration-300 hover:scale-110',
        box,
        className,
      )}
    >
      <Mail className={cn(icon, 'text-background')} />
    </a>
  );
}
