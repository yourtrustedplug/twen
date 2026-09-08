import { useState } from 'react';
import { useLogin } from '@privy-io/react-auth';
import { cn } from '@/lib/utils';

/**
 * SocialAuthButtons — Privy email (+ optional Google).
 * Google only shows when VITE_PRIVY_GOOGLE_ENABLED=true (Privy Dashboard must
 * have Google OAuth enabled + domains allowlisted).
 */

export type SocialProvider = 'google' | 'email';

export interface SocialAuthButtonsProps {
  mode?: 'signin' | 'signup';
  providers?: SocialProvider[];
  className?: string;
}

export function defaultAuthProviders(): SocialProvider[] {
  const googleOn = import.meta.env.VITE_PRIVY_GOOGLE_ENABLED === 'true';
  return googleOn ? ['google', 'email'] : ['email'];
}

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const SSOButton = ({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex h-11 w-full items-center justify-center gap-3 rounded-lg border px-4 text-[15px] font-medium',
      'transition-colors disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
  >
    {children}
  </button>
);

export function SocialAuthButtons({
  providers = defaultAuthProviders(),
  className,
}: SocialAuthButtonsProps) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { login } = useLogin({
    onComplete: () => {
      setPending(null);
    },
    onError: () => {
      setError('Something went wrong. Please try again.');
      setPending(null);
    },
  });

  const handle = (provider: SocialProvider) => {
    setError(null);
    setPending(provider);
    try {
      if (provider === 'google') {
        login({ loginMethods: ['google'] });
      } else {
        login({ loginMethods: ['email'] });
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setPending(null);
    }
  };

  if (providers.length === 0) return null;

  const verb = 'Continue with';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {providers.includes('google') && (
        <SSOButton
          onClick={() => handle('google')}
          disabled={pending !== null}
          className="border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f7f8f8] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1e1f20]"
        >
          <GoogleMark />
          <span>{verb} Google</span>
        </SSOButton>
      )}
      {providers.includes('email') && (
        <SSOButton
          onClick={() => handle('email')}
          disabled={pending !== null}
          className="border-border bg-background text-foreground hover:bg-muted"
        >
          <span>{verb} email</span>
        </SSOButton>
      )}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
