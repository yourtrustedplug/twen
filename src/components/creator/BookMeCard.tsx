import { CreatorPhoto } from '@/components/CreatorCard';
import { MetricTile } from '@/components/MetricTile';
import { PlatformMark, type MarkPlatform } from '@/components/creator/PlatformMark';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPlace } from '@/lib/geo';
import { engagement, formatPercent } from '@/lib/metrics';
import { campaignImage } from '@/lib/campaign-image';
import type { BookMeProfile, BookMeWork } from '@/lib/book-me';
import { socialProfileHref } from '@/lib/book-me';
import { cn } from '@/lib/utils';

const workPlatform = (value: string): MarkPlatform =>
  value === 'instagram' ? 'instagram' : 'tiktok';

const BookMeWorkGrid = ({
  work,
  name,
  compact = false,
}: {
  work: BookMeWork[];
  name: string;
  compact?: boolean;
}) => {
  if (work.length === 0) {
    if (!compact) return null;
    return <p className="text-xs text-muted-foreground">Approved campaign posts show here.</p>;
  }
  const items = compact ? work.slice(0, 3) : work;
  return (
    <div className="w-full text-left">
      <h2 className={cn('font-display font-bold mb-3', compact ? 'text-sm' : 'text-lg')}>Previous work</h2>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {items.map((post) => {
          const rate = Number(post.engagement_rate) || engagement(post);
          return (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-[14px] overflow-hidden aspect-[9/12] bg-[#efefef]"
            >
              <img
                src={campaignImage(post.id)}
                alt={`${name} video — ${formatViews(post.verified_views)} views`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
                <p className="font-semibold text-[11px] leading-tight">{formatViews(post.verified_views)} views</p>
                {rate > 0 ? <p className="text-[10px] text-white/80">{formatPercent(rate)}</p> : null}
              </div>
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                <PlatformMark platform={workPlatform(post.platform)} className="w-3 h-3" />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const SocialChip = ({ href, platform, label }: { href: string; platform: MarkPlatform; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 text-xs font-semibold bg-white border border-[#f1f1f1] rounded-full pl-2.5 pr-3.5 py-1.5 hover:border-[#dcdcdc] transition-colors"
    aria-label={label}
  >
    <span className="w-6 h-6 rounded-full bg-[#f6f6f6] flex items-center justify-center">
      <PlatformMark platform={platform} className="w-3.5 h-3.5" />
    </span>
    {label}
  </a>
);

const BookMeCard = ({
  profile,
  compact = false,
}: {
  profile: BookMeProfile;
  compact?: boolean;
}) => {
  const name = profile.full_name?.trim() || 'Creator';
  const place = formatPlace(profile.city, profile.country, profile.location);
  const tiktok = socialProfileHref('tiktok', profile.tiktok_handle);
  const instagram = socialProfileHref('instagram', profile.instagram_handle);

  if (compact) {
    return (
      <div className="flex flex-col items-center text-center gap-3">
        <div className="overflow-hidden bg-[#efefef] w-28 h-28 rounded-[22px]">
          <CreatorPhoto id={profile.id} avatarUrl={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">{name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            @{profile.book_slug}
            {place ? ` · ${place}` : ''}
          </p>
        </div>
        {profile.bio ? <p className="text-sm leading-relaxed max-w-sm line-clamp-4">{profile.bio}</p> : null}
        <div className="grid grid-cols-3 w-full gap-2">
          <MetricTile compact label="Per video" value={formatMoney(profile.rate_per_video)} />
          <MetricTile compact label="Avg views" value={profile.avg_views ? formatViews(profile.avg_views) : '—'} />
          <MetricTile
            compact
            label="Engagement"
            value={profile.engagement_rate ? formatPercent(Number(profile.engagement_rate)) : '—'}
          />
        </div>
        <BookMeWorkGrid work={profile.work} name={name} compact />
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-[32px] border border-[#f1f1f1] bg-white shadow-[0_1px_2px_rgba(10,16,29,0.04)]">
      <div className="relative aspect-[4/5] bg-[#efefef]">
        <CreatorPhoto
          id={profile.id}
          avatarUrl={profile.avatar_url}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/35 to-transparent text-white">
          <p className="text-[11px] uppercase tracking-[1.4px] font-semibold text-white/70 mb-1.5">Book me</p>
          <h1 className="font-display font-bold text-[2rem] leading-[1.05]">{name}</h1>
          <p className="text-sm text-white/80 mt-1.5">
            @{profile.book_slug}
            {place ? ` · ${place}` : ''}
          </p>
        </div>
      </div>
      <div className="p-5 sm:p-6 flex flex-col gap-5">
        {profile.bio ? <p className="text-[15px] leading-relaxed text-[#3d3d3d]">{profile.bio}</p> : null}
        <div className="grid grid-cols-3 gap-2">
          <MetricTile compact label="Per video" value={formatMoney(profile.rate_per_video)} />
          <MetricTile compact label="Avg views" value={profile.avg_views ? formatViews(profile.avg_views) : '—'} />
          <MetricTile
            compact
            label="Engagement"
            value={profile.engagement_rate ? formatPercent(Number(profile.engagement_rate)) : '—'}
          />
        </div>
        {(tiktok || instagram) && (
          <div className="flex flex-wrap gap-2">
            {tiktok ? <SocialChip href={tiktok} platform="tiktok" label="TikTok" /> : null}
            {instagram ? <SocialChip href={instagram} platform="instagram" label="Instagram" /> : null}
          </div>
        )}
        <BookMeWorkGrid work={profile.work} name={name} />
      </div>
    </article>
  );
};

export default BookMeCard;
