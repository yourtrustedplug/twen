import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import PayoutMethodLogo from '@/components/creator/PayoutMethodLogo';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Payout, Submission, WalletTransaction, WithdrawalAccount } from '@/types/unignored';
import { formatMoney, formatDate } from '@/lib/format';
import { methodLabel, redactAccountNumber } from '@/lib/payout-methods';
import { isPro } from '@/lib/plan';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';
import { Loader2, Pencil } from 'lucide-react';

const HOLD_DAYS = 7;

interface SubmissionRow extends Submission {
  campaigns: { title: string; closed_at: string | null; status: string } | null;
}

const CreatorEarnings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [account, setAccount] = useState<WithdrawalAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const autoPaid = useRef(false);
  const creatorIsPro = isPro(profile);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('submissions')
        .select('*, campaigns(title, status, closed_at)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('payouts').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('withdrawal_accounts').select('*').eq('creator_id', user.id).maybeSingle(),
    ]).then(([s, p, w, a]) => {
      setRows((s.data as unknown as SubmissionRow[]) ?? []);
      setPayouts((p.data as Payout[]) ?? []);
      setTransactions((w.data as WalletTransaction[]) ?? []);
      setAccount((a.data as WithdrawalAccount | null) ?? null);
      setLoading(false);
    });
  }, [user]);

  const { available, held, accruing, withdrawn } = useMemo(() => {
    let available = 0;
    let held = 0;
    let accruing = 0;
    for (const r of rows) {
      const amt = Number(r.earnings);
      const closedAt = r.campaigns?.closed_at ? new Date(r.campaigns.closed_at) : null;
      if (!closedAt) {
        accruing += amt;
      } else if (creatorIsPro) {
        available += amt;
      } else {
        const releaseAt = new Date(closedAt.getTime() + HOLD_DAYS * 24 * 60 * 60 * 1000);
        if (releaseAt.getTime() <= Date.now()) available += amt;
        else held += amt;
      }
    }
    const withdrawn = payouts
      .filter((p) => p.status !== 'failed')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { available: Math.max(available - withdrawn, 0), held, accruing, withdrawn };
  }, [rows, payouts, creatorIsPro]);

  useEffect(() => {
    if (loading || !account || available <= 0 || autoPaid.current) return;
    autoPaid.current = true;
    void supabase.functions
      .invoke('request-creator-payout', { body: { amount: available } })
      .then(async ({ data, error }) => {
        if (error || data?.error) {
          toast({
            title: 'Automatic payout failed',
            description: edgeFunctionErrorMessage(error, data, 'Could not queue payout'),
            variant: 'destructive',
          });
          return;
        }
        if (!user) return;
        const { data: p } = await supabase
          .from('payouts')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });
        setPayouts((p as Payout[]) ?? []);
      });
  }, [loading, account, available, toast, user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-8 md:py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Earnings & payouts</h1>
        <p className="text-muted-foreground mb-10">
          {account
            ? creatorIsPro
              ? 'Creator Pro: released earnings are paid out automatically.'
              : `Earnings are held for ${HOLD_DAYS} days after a campaign closes, then paid out automatically.`
            : 'Set up a payout account once. After that, released earnings are paid out automatically.'}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Available', value: formatMoney(available) },
            { label: 'In verification window', value: formatMoney(held) },
            { label: 'Accruing on open campaigns', value: formatMoney(accruing) },
            { label: 'Paid out', value: formatMoney(withdrawn) },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#fafafa] border border-[#f1f1f1] rounded-[22px] md:rounded-[30px] p-4 md:p-7">
              <p className="text-[11px] md:text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-2 md:mb-3">{stat.label}</p>
              <p className="font-display text-xl md:text-3xl font-bold break-words">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-12">
          {account ? (
            <>
              <div className="inline-flex h-11 items-center gap-2.5 rounded-full border border-[#dddddd] bg-white pl-2 pr-4 text-sm">
                <PayoutMethodLogo method={account.method} />
                <span className="font-semibold tracking-wide">
                  {redactAccountNumber(account.account_number)}
                </span>
              </div>
              <Button variant="invofyOutline" size="invofy" onClick={() => navigate('/creator/earnings/account')}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </>
          ) : (
            <Button variant="invofy" size="invofy" onClick={() => navigate('/creator/earnings/account')}>
              Set up payouts
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-2xl font-bold mb-4">Payouts</h2>
            {payouts.length === 0 ? (
              <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 text-muted-foreground text-sm">
                {account ? 'Payouts will show here when earnings are released.' : 'Set up a payout account to get paid automatically.'}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {payouts.map((p) => (
                  <div key={p.id} className="bg-white border border-[#f1f1f1] rounded-[24px] md:rounded-[30px] p-4 md:p-5 flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <PayoutMethodLogo method={p.provider} />
                      <div>
                        <p className="font-semibold">{formatMoney(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {methodLabel(p.provider)} · {redactAccountNumber(p.phone)} · {formatDate(p.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={p.status} />
                      <p className="text-xs text-muted-foreground mt-1">Releases {formatDate(p.release_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold mb-4">Wallet activity</h2>
            {transactions.length === 0 ? (
              <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 text-muted-foreground text-sm">
                <Link to="/creator" className="text-primary font-semibold underline">
                  Browse campaigns
                </Link>{' '}
                to start earning.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {transactions.map((t) => (
                  <div key={t.id} className="bg-white border border-[#f1f1f1] rounded-[30px] px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                    </div>
                    <p className={`font-semibold shrink-0 ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}
                      {formatMoney(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorEarnings;
