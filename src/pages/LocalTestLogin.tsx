import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, roleHome, type UserRole } from '@/contexts/AuthContext';
import { isLocalTestMode } from '@/lib/local-test';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

const PASSWORD = 'TwenLocalTest!2026';

const accounts: Array<{
  role: UserRole;
  label: string;
  email: string;
  detail: string;
}> = [
  {
    role: 'brand',
    label: 'Test brand',
    email: 'brand@twen.test',
    detail: 'Create a campaign, then simulate the NardoPay payment.',
  },
  {
    role: 'creator',
    label: 'Test creator',
    email: 'creator@twen.test',
    detail: 'Browse, submit a video, and request a payout.',
  },
  {
    role: 'admin',
    label: 'Test admin',
    email: 'admin@twen.test',
    detail: 'Review submissions, IDs, payouts, and refunds.',
  },
];

export default function LocalTestLogin() {
  const { user, profile, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isLocalTestMode()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-5">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Local test mode is off</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start the local harness with <code>npm run local:start</code> and open this page on
            localhost.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/">Back to Twen</Link>
          </Button>
        </div>
      </div>
    );
  }

  const login = async (account: (typeof accounts)[number]) => {
    setBusy(account.role);
    setError(null);
    const result = await signIn(account.email, PASSWORD);
    setBusy(null);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigate(roleHome(account.role), { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A101D] px-5 py-12 text-[#F5F5F5]">
      <main className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-[#FFB0B6] no-underline">
          ← Back to Twen
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <span className="rounded-full bg-[#FFB0B6] p-2 text-[#0A101D]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold">Local test harness</h1>
            <p className="text-sm text-[#A7ADB8]">
              These accounts live only in your local Supabase database. Nothing here touches
              production.
            </p>
          </div>
        </div>

        {user ? (
          <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-6">
            <p className="text-sm text-[#A7ADB8]">Signed in as</p>
            <p className="mt-1 text-lg font-semibold">{profile?.full_name ?? user.email}</p>
            <p className="text-sm text-[#A7ADB8]">
              {profile?.role ?? 'loading profile…'} · {user.email}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to={roleHome(profile?.role ?? 'creator')}>Open my dashboard</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void signOut();
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {accounts.map((account) => (
            <div
              key={account.role}
              className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="font-semibold">{account.label}</h2>
                <p className="text-sm text-[#A7ADB8]">{account.detail}</p>
                <p className="mt-1 font-mono text-xs text-[#FFB0B6]">{account.email}</p>
              </div>
              <Button
                variant="invofy"
                className="bg-[#F5F5F5] text-[#0A101D] hover:bg-[#FFDFD2]"
                disabled={Boolean(busy)}
                onClick={() => void login(account)}
              >
                {busy === account.role ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in as {account.role}
              </Button>
            </div>
          ))}
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-xs text-[#7F8794]">
          Password for manual use: <span className="font-mono">{PASSWORD}</span>. Payments are
          simulated by a local-only edge function; no NardoPay request is made.
        </p>
      </main>
    </div>
  );
}
