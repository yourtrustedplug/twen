import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import SignedImage from '@/components/SignedImage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Payout, ProfileRow, Submission } from '@/types/unignored';
import { PLATFORM_LABELS, parseChecklistResults } from '@/types/unignored';
import { formatDate, formatMoney } from '@/lib/format';
import { ID_BUCKET } from '@/lib/storage';
import { Loader2, Check, X, ExternalLink } from 'lucide-react';

interface QueueRow extends Submission {
  campaigns: { title: string; brand_name: string } | null;
}

interface Stats {
  pending: number;
  pendingPayouts: number;
  pendingIds: number;
  openCampaigns: number;
  creators: number;
  brands: number;
}

const AdminPanel = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [idQueue, setIdQueue] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    pendingPayouts: 0,
    pendingIds: 0,
    openCampaigns: 0,
    creators: 0,
    brands: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const [queueRes, payoutRes, idRes, openRes, creatorsRes, brandsRes] = await Promise.all([
      supabase
        .from('submissions')
        .select('*, campaigns(title, brand_name)')
        .eq('status', 'submitted')
        .order('created_at', { ascending: true }),
      supabase
        .from('payouts')
        .select('*')
        .in('status', ['pending', 'processing', 'queued'])
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('*')
        .eq('id_verification_status', 'pending')
        .order('updated_at', { ascending: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'creator'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'brand'),
    ]);

    if (queueRes.error) {
      toast({ title: 'Could not load queue', description: queueRes.error.message, variant: 'destructive' });
    }
    if (payoutRes.error) {
      toast({ title: 'Could not load payouts', description: payoutRes.error.message, variant: 'destructive' });
    }

    const queue = (queueRes.data as unknown as QueueRow[]) ?? [];
    const pendingPayouts = (payoutRes.data as Payout[]) ?? [];
    const pendingIds = (idRes.data as ProfileRow[]) ?? [];
    setRows(queue);
    setPayouts(pendingPayouts);
    setIdQueue(pendingIds);
    setStats({
      pending: queue.length,
      pendingPayouts: pendingPayouts.length,
      pendingIds: pendingIds.length,
      openCampaigns: openRes.count ?? 0,
      creators: creatorsRes.count ?? 0,
      brands: brandsRes.count ?? 0,
    });
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row: QueueRow, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !reason.trim()) {
      toast({ title: 'Add a rejection reason', variant: 'destructive' });
      return;
    }
    setBusyId(row.id);
    const { error } = await supabase
      .from('submissions')
      .update({
        status,
        rejection_reason: status === 'rejected' ? reason.trim() : null,
      })
      .eq('id', row.id);
    setBusyId(null);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRejectingId(null);
    setReason('');
    toast({
      title: status === 'approved' ? 'Approved' : 'Rejected',
      description: status === 'approved' ? 'Submission can earn on verified views.' : 'Creator will see the reason.',
    });
    load();
  };

  const resolvePayout = async (payout: Payout, status: 'completed' | 'failed') => {
    setBusyId(payout.id);
    const { error } = await supabase.rpc('resolve_payout', {
      p_payout_id: payout.id,
      p_status: status,
      p_note: status === 'completed' ? 'MoMo sent' : 'Payout failed',
    });
    setBusyId(null);
    if (error) {
      toast({ title: 'Could not update payout', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: status === 'completed' ? 'Marked paid' : 'Marked failed',
      description:
        status === 'completed'
          ? 'Creator withdrawal marked complete.'
          : 'Failed payouts stop counting against available balance.',
    });
    load();
  };

  const resolveId = async (row: ProfileRow, status: 'verified' | 'rejected') => {
    setBusyId(row.id);
    const { error } = await supabase
      .from('profiles')
      .update({ id_verification_status: status })
      .eq('id', row.id);
    setBusyId(null);
    if (error) {
      toast({ title: 'Could not update ID', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: status === 'verified' ? 'ID verified' : 'ID rejected' });
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-5 md:px-10 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">Admin panel</h1>
        <p className="text-muted-foreground mb-8">
          Moderators and admins share this panel. Review submissions and process MoMo payouts.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-10">
          {[
            { label: 'Pending review', value: stats.pending },
            { label: 'Pending payouts', value: stats.pendingPayouts },
            { label: 'Pending IDs', value: stats.pendingIds },
            { label: 'Open campaigns', value: stats.openCampaigns },
            { label: 'Creators', value: stats.creators },
            { label: 'Brands', value: stats.brands },
          ].map((s) => (
            <div key={s.label} className="rounded-[20px] border border-[#f1f1f1] bg-[#fafafa] px-4 py-4">
              <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground">{s.label}</p>
              <p className="font-display text-2xl font-bold mt-1">{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="font-display text-2xl font-bold mb-4">Payout queue</h2>
        {loading ? null : payouts.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 text-center text-muted-foreground mb-10">
            No payouts waiting. After you send MoMo, mark requests completed here.
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-10">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-[#f1f1f1] rounded-[30px] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="font-display text-lg font-bold">{formatMoney(p.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'} · {p.phone} ·{' '}
                    {formatDate(p.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{p.creator_id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="invofy"
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() => resolvePayout(p, 'completed')}
                  >
                    {busyId === p.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1.5" />
                    )}
                    Mark paid
                  </Button>
                  <Button
                    variant="invofyOutline"
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() => resolvePayout(p, 'failed')}
                  >
                    <X className="h-4 w-4 mr-1.5" /> Failed
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display text-2xl font-bold mb-4">ID verification</h2>
        {loading ? null : idQueue.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 text-center text-muted-foreground mb-10">
            No identity documents waiting.
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-10">
            {idQueue.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-[#f1f1f1] rounded-[30px] p-5 flex flex-col gap-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-bold">{p.full_name || 'Creator'}</p>
                    <p className="text-sm text-muted-foreground">
                      {(p.id_document_type === 'national_id' ? 'National ID' : 'Passport')}
                      {p.country ? ` · ${p.country}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="invofy"
                      size="sm"
                      disabled={busyId === p.id}
                      onClick={() => resolveId(p, 'verified')}
                    >
                      {busyId === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                      Verify
                    </Button>
                    <Button
                      variant="invofyOutline"
                      size="sm"
                      disabled={busyId === p.id}
                      onClick={() => resolveId(p, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-1.5" /> Reject
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-lg">
                  {p.id_document_path && (
                    <SignedImage
                      path={p.id_document_path}
                      alt="ID front"
                      bucket={ID_BUCKET}
                      className="w-full h-40 object-cover rounded-[16px]"
                    />
                  )}
                  {p.id_document_back_path && (
                    <SignedImage
                      path={p.id_document_back_path}
                      alt="ID back"
                      bucket={ID_BUCKET}
                      className="w-full h-40 object-cover rounded-[16px]"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display text-2xl font-bold mb-4">Review queue</h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center text-muted-foreground">
            Queue is clear. Nothing waiting for review.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {rows.map((s) => {
              const results = parseChecklistResults(s.checklist_results);
              return (
                <div key={s.id} className="bg-white border border-[#f1f1f1] rounded-[30px] p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">
                        {s.campaigns?.brand_name ?? 'Brand'} · {formatDate(s.created_at)}
                      </p>
                      <h3 className="font-display text-xl font-bold">
                        {s.campaigns?.title ?? 'Campaign'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {s.creator_name} · {s.tiktok_handle} · {PLATFORM_LABELS[s.platform] ?? s.platform}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <a
                    href={s.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                  >
                    Open video <ExternalLink className="h-4 w-4" />
                  </a>

                  {results.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {results.map((r) => (
                        <li
                          key={r.id}
                          className={`text-xs font-semibold rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 ${
                            r.met ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {r.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {r.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  {rejectingId === s.id ? (
                    <div className="flex flex-col gap-3">
                      <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is this rejected? Shown to the creator."
                        rows={3}
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="invofy"
                          size="sm"
                          onClick={() => decide(s, 'rejected')}
                          disabled={busyId === s.id}
                        >
                          {busyId === s.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Confirm reject
                        </Button>
                        <Button
                          variant="invofyOutline"
                          size="sm"
                          onClick={() => {
                            setRejectingId(null);
                            setReason('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="invofy"
                        size="sm"
                        onClick={() => decide(s, 'approved')}
                        disabled={busyId === s.id}
                      >
                        {busyId === s.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="invofyOutline"
                        size="sm"
                        onClick={() => setRejectingId(s.id)}
                        disabled={busyId === s.id}
                      >
                        <X className="h-4 w-4 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
