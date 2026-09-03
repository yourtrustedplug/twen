import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Payout, Submission, WalletTransaction } from '@/types/unignored';
import { formatMoney, formatDate } from '@/lib/format';
import { Loader2, Wallet } from 'lucide-react';

const HOLD_DAYS = 7;

interface SubmissionRow extends Submission {
  campaigns: { title: string; closed_at: string | null; status: string } | null;
}

const CreatorEarnings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [phone, setPhone] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

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
    ]).then(([s, p, w]) => {
      setRows((s.data as unknown as SubmissionRow[]) ?? []);
      setPayouts((p.data as Payout[]) ?? []);
      setTransactions((w.data as WalletTransaction[]) ?? []);
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
  }, [rows, payouts]);

  const withdraw = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast({ title: 'Enter an amount above zero.', variant: 'destructive' });
      return;
    }
    if (!phone.trim()) {
      toast({ title: 'Enter the mobile money number to pay out to.', variant: 'destructive' });
      return;
    }
    setWithdrawing(true);
    const { error } = await supabase.rpc('request_payout', {
      p_amount: value,
      p_provider: provider,
      p_phone: phone.trim(),
    });
    setWithdrawing(false);
    if (error) {
      toast({ title: 'Withdrawal failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (profile && (profile.payout_provider !== provider || profile.payout_number !== phone.trim())) {
      await supabase
        .from('profiles')
        .update({ payout_provider: provider, payout_number: phone.trim() })
        .eq('id', profile.id);
      refreshProfile();
    }
    toast({
      title: 'Withdrawal requested',
      description: `Funds release to ${provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'} after the ${HOLD_DAYS}-day verification window.`,
    });
    setAmount('');
    const { data: p } = await supabase
      .from('payouts')
      .select('*')
      .eq('creator_id', user!.id)
      .order('created_at', { ascending: false });
    setPayouts((p as Payout[]) ?? []);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-[100rem] mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">Earnings & payouts</h1>
        <p className="text-muted-foreground mb-10">
          Earnings are held for a {HOLD_DAYS}-day verification window after a campaign closes, then released to mobile money.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Available to withdraw', value: formatMoney(available) },
            { label: 'In verification window', value: formatMoney(held) },
            { label: 'Accruing on open campaigns', value: formatMoney(accruing) },
            { label: 'Withdrawn', value: formatMoney(withdrawn) },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-7">
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">{stat.label}</p>
              <p className="font-display text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Withdraw card */}
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5 self-start">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Withdraw</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Paid straight to mobile money — not a bank transfer, not crypto, not PayPal. Same-day once released.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['mtn_momo', 'airtel_money'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`border rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                    provider === p
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-white border-[#f1f1f1] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Mobile money number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256 77 000 0000" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" type="number" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={available.toFixed(2)} />
              <p className="text-xs text-muted-foreground">{formatMoney(available)} available now.</p>
            </div>
            <div>
              <Button variant="invofy" size="invofy" onClick={withdraw} disabled={withdrawing}>
                {withdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Request withdrawal
              </Button>
            </div>
          </div>

          {/* History */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="font-display text-2xl font-bold mb-4">Payouts</h2>
              {payouts.length === 0 ? (
                <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 text-muted-foreground text-sm">
                  No withdrawals yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {payouts.map((p) => (
                    <div key={p.id} className="bg-white border border-[#f1f1f1] rounded-[30px] p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{formatMoney(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'} · {p.phone} · Requested {formatDate(p.created_at)}
                        </p>
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
