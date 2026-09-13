import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import type { Submission } from '@/types/unignored';
import { formatMoney, formatDate, formatViews } from '@/lib/format';
import CampaignCover from '@/components/CampaignCover';
import { Loader2 } from 'lucide-react';

interface SubmissionRow extends Submission {
  campaigns: { title: string; status: string; cover_image: string | null } | null;
}

const CreatorSubmissionsList = ({ onBrowse }: { onBrowse: () => void }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from('submissions')
      .select('*, campaigns(title, status, cover_image)')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as SubmissionRow[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const totalEarned = rows.reduce((sum, r) => sum + Number(r.earnings), 0);
  const totalViews = rows.reduce((sum, r) => sum + Number(r.verified_views), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-12 text-center">
        <h2 className="font-display text-2xl font-bold mb-3">Nothing submitted yet</h2>
        <p className="text-muted-foreground mb-8">Pick a campaign, make the video, and submit the link.</p>
        <button type="button" onClick={onBrowse} className="text-primary font-semibold underline">
          Browse campaigns
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-12">
        <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-7">
          <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">Earned so far</p>
          <p className="font-display text-3xl font-bold">{formatMoney(totalEarned)}</p>
        </div>
        <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-7">
          <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-3">Verified views</p>
          <p className="font-display text-3xl font-bold">{formatViews(totalViews)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/creator/campaigns/${r.campaign_id}`}
            className="bg-white border border-[#f1f1f1] rounded-[24px] md:rounded-[30px] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 hover:border-[#dcdcdc] transition-colors"
          >
            <CampaignCover
              id={r.campaign_id}
              coverImage={r.campaigns?.cover_image}
              alt={r.campaigns?.title ? `${r.campaigns.title} campaign` : 'Campaign'}
              className="w-full md:w-28 h-40 md:h-20 rounded-[20px] object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <p className="font-semibold truncate min-w-0">{r.campaigns?.title ?? 'Campaign'}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-muted-foreground break-all">{r.tiktok_url}</p>
              {r.status === 'rejected' && r.rejection_reason && (
                <p className="text-sm text-rose-600 mt-2">Rejected: {r.rejection_reason}</p>
              )}
              {r.status === 'submitted' && (
                <p className="text-sm text-muted-foreground mt-2">Waiting for moderator review.</p>
              )}
            </div>
            <div className="flex items-center gap-8 shrink-0">
              <div>
                <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">Views</p>
                <p className="font-semibold">{formatViews(r.verified_views)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">Earned</p>
                <p className="font-semibold">{formatMoney(r.earnings)}</p>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs uppercase tracking-[1px] font-semibold text-muted-foreground mb-1">Last check</p>
                <p className="font-semibold">{formatDate(r.last_verified_at)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};

export default CreatorSubmissionsList;
