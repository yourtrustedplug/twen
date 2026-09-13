import { Link } from 'react-router-dom';
import type { ProfileRow } from '@/types/unignored';
import { PLATFORM_LABELS, parseStringArray } from '@/types/unignored';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPlace } from '@/lib/geo';
import { formatPercent } from '@/lib/metrics';
import { cartoonAvatar } from '@/lib/cartoon-avatar';
import SignedImage from '@/components/SignedImage';
import { cn } from '@/lib/utils';

export type CreatorCardModel = Pick<
  ProfileRow,
  | 'id'
  | 'avatar_url'
  | 'full_name'
  | 'tiktok_handle'
  | 'instagram_handle'
  | 'city'
  | 'country'
  | 'location'
  | 'rate_per_video'
  | 'avg_views'
  | 'engagement_rate'
  | 'platforms'
>;

/** Same photo brands see: uploaded avatar, else a cartoon assigned from the account id. */
export const CreatorPhoto = ({
  id,
  avatarUrl,
  alt,
  className,
}: {
  id: string;
  avatarUrl: string | null | undefined;
  alt: string;
  className?: string;
}) => {
  if (avatarUrl) {
    return <SignedImage path={avatarUrl} alt={alt} className={className} />;
  }
  return (
    <img
      src={cartoonAvatar(id)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn('block', className)}
    />
  );
};

const cardClass =
  'group bg-white border border-[#f1f1f1] rounded-[30px] overflow-hidden flex flex-col hover:border-[#dcdcdc] transition-colors';

/** Image-led creator tile for the brand-side marketplace. */
const CreatorCard = ({
  creator,
  preview = false,
}: {
  creator: CreatorCardModel;
  preview?: boolean;
}) => {
  const platforms = parseStringArray(creator.platforms);
  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden">
        <CreatorPhoto
          id={creator.id}
          avatarUrl={creator.avatar_url}
          alt={creator.full_name ?? 'Creator'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/75 to-transparent">
          <h3 className="font-display text-xl font-bold text-white leading-snug">
            {creator.full_name ?? 'Creator'}
          </h3>
          <p className="text-sm text-white/80">
            {[creator.tiktok_handle, creator.instagram_handle].filter(Boolean).join(' · ')}
            {formatPlace(creator.city, creator.country, creator.location)
              ? ` · ${formatPlace(creator.city, creator.country, creator.location)}`
              : ''}
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
    </>
  );

  if (preview) {
    return <div className={cn(cardClass, 'pointer-events-none hover:border-[#f1f1f1]')}>{body}</div>;
  }

  return (
    <Link to={`/brand/creators/${creator.id}`} className={cardClass}>
      {body}
    </Link>
  );
};

export default CreatorCard;
