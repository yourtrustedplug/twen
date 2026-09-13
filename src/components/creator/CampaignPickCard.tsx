import { Link } from 'react-router-dom';
import CampaignCover from '@/components/CampaignCover';
import SignedImage from '@/components/SignedImage';
import { PlatformMark, type MarkPlatform } from '@/components/creator/PlatformMark';
import type { Campaign } from '@/types/unignored';
import { NICHE_LABELS, PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney, formatRate, formatDueBy } from '@/lib/format';
import { campaignLogoPath } from '@/lib/brand-kit';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const isMarkPlatform = (value: string): value is MarkPlatform =>
  value === 'tiktok' || value === 'instagram';

const CampaignPickCard = ({
  campaign,
  saved,
  onToggleSave,
}: {
  campaign: Campaign & { brand_logo?: string | null };
  saved: boolean;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
}) => {
  const remaining = Number(campaign.funded_amount) - Number(campaign.spent_amount);
  const platforms = parseStringArray(campaign.platforms).filter(isMarkPlatform);
  const logo = campaignLogoPath(campaign);

  return (
    <Link
      to={`/creator/campaigns/${campaign.id}`}
      className="group bg-white border border-[#f1f1f1] rounded-[30px] overflow-hidden flex flex-col hover:border-[#dcdcdc] transition-colors"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <CampaignCover
          id={campaign.id}
          coverImage={campaign.cover_image}
          alt={`${campaign.title} campaign`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <button
          type="button"
          onClick={(e) => onToggleSave(e, campaign.id)}
          className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
          aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
        >
          <Heart
            className={cn('h-4 w-4', saved ? 'fill-rose-500 text-rose-500' : 'text-foreground')}
          />
        </button>
        {logo ? (
          <div className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-[#f4f4f4] shadow-sm overflow-hidden flex items-center justify-center">
            <SignedImage
              path={logo}
              alt={`${campaign.brand_name || campaign.title} logo`}
              className="h-full w-full object-contain p-1.5"
            />
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
          {campaign.brand_name ? (
            <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80">
              {campaign.brand_name}
              {campaign.niche ? ` · ${NICHE_LABELS[campaign.niche] ?? campaign.niche}` : ''}
            </p>
          ) : campaign.niche ? (
            <p className="text-xs uppercase tracking-[1px] font-semibold text-white/80">
              {NICHE_LABELS[campaign.niche] ?? campaign.niche}
            </p>
          ) : null}
          <h3 className="font-display text-xl font-bold leading-snug text-white">{campaign.title}</h3>
        </div>
      </div>
      <div className="p-6 flex flex-col gap-3">
        {platforms.length > 0 ? (
          <div className="flex items-center gap-2">
            {platforms.map((platform) => (
              <span
                key={platform}
                title={PLATFORM_LABELS[platform] ?? platform}
                className="h-8 w-8 rounded-full bg-[#fafafa] border border-[#f1f1f1] inline-flex items-center justify-center"
              >
                <PlatformMark platform={platform} className="w-4 h-4" />
                <span className="sr-only">{PLATFORM_LABELS[platform] ?? platform}</span>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between text-sm gap-3">
          <span className="font-semibold">{formatRate(campaign.rate_per_1k)}</span>
          <span className="text-muted-foreground text-right">
            Due by {formatDueBy(campaign.deadline)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm border-t border-dashed border-[#e9e9e9] pt-3">
          <span className="text-muted-foreground">Left</span>
          <span className="font-semibold">{formatMoney(remaining)}</span>
        </div>
      </div>
    </Link>
  );
};

export default CampaignPickCard;
