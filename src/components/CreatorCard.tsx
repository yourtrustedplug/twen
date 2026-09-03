import { Link } from 'react-router-dom';
import type { ProfileRow } from '@/types/unignored';
import { PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPercent } from '@/lib/metrics';
import { campaignImage } from '@/lib/campaign-image';
import SignedImage from '@/components/SignedImage';

/** Image-led creator tile for the brand-side marketplace. */
const CreatorCard = ({ creator }: { creator: ProfileRow }) => {
  const platforms = parseStringArray(creator.platforms);
  return (
    <Link
      to={`/brand/creators/${creator.id}`}
      className="group bg-white border border-[#f1f1f1] rounded-[30px] overflow-hidden flex flex-col hover:border-[#dcdcdc] transition-colors"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {creator.avatar_url ? (
          <SignedImage
            path={creator.avatar_url}
            alt={creator.full_name ?? 'Creator'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <img
            src={campaignImage(creator.id)}
            alt={creator.full_name ?? 'Creator'}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/75 to-transparent">
          <h3 className="font-display text-xl font-bold text-white leading-snug">
            {creator.full_name ?? 'Creator'}
          </h3>
          <p className="text-sm text-white/80">
            {creator.tiktok_handle ?? ''} {creator.location ? `· ${creator.location}` : ''}
          </p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="font-display text-lg font-bold">{formatMoney(creator.rate_per_video)}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">per video</p>
        </div>
        <div>
          <p className="font-display text-lg font-bold">{formatViews(creator.avg_views)}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">avg views</p>
        </div>
        <div>
          <p className="font-display text-lg font-bold">{formatPercent(Number(creator.engagement_rate))}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">engagement</p>
        </div>
      </div>
      {platforms.length > 0 && (
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          {platforms.map((p) => (
            <span key={p} className="text-[11px] font-semibold bg-[#fafafa] border border-[#f1f1f1] rounded-full px-3 py-1">
              {PLATFORM_LABELS[p] ?? p}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
};

export default CreatorCard;
