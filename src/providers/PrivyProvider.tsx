import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';
import { localHttpTenantRewrite } from '@/lib/hosts';

const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;
const googleEnabled = import.meta.env.VITE_PRIVY_GOOGLE_ENABLED === 'true';

/**
 * Privy accepts string URLs or a React img/svg element.
 * Relative SVG strings often fail; pass an <img> to a public PNG instead.
 */
const privyLogo = (
  <img src="/twen-logo.png" alt="Twen" width={72} height={72} />
);

export function AppPrivyProvider({ children }: { children: ReactNode }) {
  if (typeof window !== 'undefined') {
    const next = localHttpTenantRewrite(window.location);
    if (next) {
      window.location.replace(next);
      return null;
    }
  }

  if (!appId) {
    console.error('Missing VITE_PRIVY_APP_ID');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: googleEnabled ? ['email', 'google'] : ['email'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'off' },
        },
        appearance: {
          theme: 'light',
          accentColor: '#111111',
          logo: privyLogo,
          landingHeader: 'Welcome to Twen',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
