import type { ReactNode } from 'react';
import { CreatorPhoto } from '@/components/CreatorCard';
import { PlatformMark, type MarkPlatform } from '@/components/creator/PlatformMark';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPlace } from '@/lib/geo';
import { engagement, formatPercent } from '@/lib/metrics';
import { campaignImage } from '@/lib/campaign-image';
import { combineAccountStats, connectedAccountRows } from '@/lib/account-stats';
import type { BookMeProfile, BookMeWork } from '@/lib/book-me';
import { socialProfileHref } from '@/lib/book-me';
import { cn } from '@/lib/utils';

const workPlatform = (value: string): MarkPlatform =>
  value === 'instagram' ? 'instagram' : 'tiktok';

const BookMeWorkStrip = ({
  work,
  name,
  compact = false,
}: {
  work: BookMeWork[];
  name: string;
  compact?: boolean;
}) => {
  const slots = [0, 1, 2].map((index) => work[index] ?? null);
  return (
    <div className={cn('min-h-0 flex flex-col', compact ? 'gap-1.5' : 'gap-3')}>
      <p className={cn('uppercase tracking-[0.16em] font-semibold text-[#8a8a8e]', compact ? 'text-[8px]' : 'text-[10px]')}>
        Previous work
      </p>
      <div className={cn('grid grid-cols-3 flex-1 min-h-0', compact ? 'gap-1.5' : 'gap-2.5')}>
        {slots.map((post, index) => {
          if (!post) {
            return (
              <div
                key={`empty-${index}`}
                className="bg-[#f4f4f5] aspect-[3/4] min-h-0"
                aria-hidden
              />
            );
          }
          const rate = Number(post.engagement_rate) || engagement(post);
          return (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-[#efefef] aspect-[3/4] min-h-0"
            >
              <img
                src={campaignImage(post.id)}
                alt={`${name} video — ${formatViews(post.verified_views)} views`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 px-2 py-2 bg-gradient-to-t from-black/75 to-transparent text-white">
                <p className={cn('font-semibold leading-none', compact ? 'text-[9px]' : 'text-[11px]')}>
                  {formatViews(post.verified_views)}
                </p>
                {rate > 0 ? (
                  <p className={cn('text-white/75 mt-0.5', compact ? 'text-[8px]' : 'text-[10px]')}>{formatPercent(rate)}</p>
                ) : null}
              </div>
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                <PlatformMark platform={workPlatform(post.platform)} className="w-2.5 h-2.5" />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const SocialTextLink = ({
  href,
  platform,
  handle,
  followers,
}: {
  href: string;
  platform: MarkPlatform;
  handle: string;
  followers?: number;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 text-[13px] font-medium text-[#0A101D]/70 hover:text-[#0A101D] transition-colors"
  >
    <PlatformMark platform={platform} className="w-3.5 h-3.5" />
    <span>{handle.replace(/^@/, '')}</span>
    {followers ? (
      <span className="text-[#8a8a8e] font-normal tabular-nums">{formatViews(followers)}</span>
    ) : null}
  </a>
);

const Stat = ({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) => (
  <div className="min-w-0">
    <p className={cn('font-display font-bold tracking-tight leading-none tabular-nums whitespace-nowrap', compact ? 'text-base' : 'text-[1.5rem] md:text-[1.75rem]')}>
      {value}
    </p>
    <p className={cn('uppercase tracking-[0.14em] text-[#8a8a8e] mt-2', compact ? 'text-[8px]' : 'text-[10px]')}>
      {label}
    </p>
  </div>
);

const BookMeCard = ({
  profile,
  compact = false,
  action,
}: {
  profile: BookMeProfile;
  compact?: boolean;
  action?: ReactNode;
}) => {
  const name = profile.full_name?.trim() || 'Creator';
  const place = formatPlace(profile.city, profile.country, profile.location);
  const tiktok = socialProfileHref('tiktok', profile.tiktok_handle);
  const instagram = socialProfileHref('instagram', profile.instagram_handle);
  const combined = combineAccountStats(profile.account_stats ?? {});
  const followers = combined.followerCount || profile.follower_count;
  const avgViews = combined.avgViews || profile.avg_views;
  const engagementRate = combined.engagementRate || Number(profile.engagement_rate) || 0;
  const rows = connectedAccountRows({
    stats: profile.account_stats ?? {},
    tiktok: Boolean(profile.tiktok_handle),
    instagram: Boolean(profile.instagram_handle),
  });
  const tiktokFollowers = profile.account_stats?.tiktok?.followerCount;
  const instagramFollowers = profile.account_stats?.instagram?.followerCount;
  const followerLabel = rows.length > 1 ? 'All followers' : 'Followers';

  const identity = (
    <div className={cn('min-w-0 shrink-0', compact ? 'space-y-1.5' : 'space-y-3')}>
      <p className={cn('uppercase tracking-[0.22em] text-[#8a8a8e] font-semibold', compact ? 'text-[8px]' : 'text-[10px]')}>
        Book me
      </p>
      <h1 className={cn('font-display font-bold tracking-tight leading-[0.95]', compact ? 'text-xl' : 'text-[2.5rem] md:text-[3.25rem]')}>
        {name}
      </h1>
      <p className={cn('text-[#5c5c61]', compact ? 'text-xs' : 'text-sm')}>
        @{profile.book_slug}
        {place ? ` · ${place}` : ''}
      </p>
      {profile.bio ? (
        <p className={cn('text-[#3d3d3d] leading-relaxed', compact ? 'text-xs line-clamp-2' : 'text-[15px] line-clamp-2 max-w-[34rem]')}>
          {profile.bio}
        </p>
      ) : null}
      {(tiktok || instagram) && (
        <div className={cn('flex flex-wrap', compact ? 'gap-x-3 gap-y-1' : 'gap-x-5 gap-y-2 pt-1')}>
          {tiktok && profile.tiktok_handle ? (
            <SocialTextLink href={tiktok} platform="tiktok" handle={profile.tiktok_handle} followers={tiktokFollowers} />
          ) : null}
          {instagram && profile.instagram_handle ? (
            <SocialTextLink href={instagram} platform="instagram" handle={profile.instagram_handle} followers={instagramFollowers} />
          ) : null}
        </div>
      )}
    </div>
  );

  const stats = (
    <div className="shrink-0 space-y-3">
      <div className={cn('grid grid-cols-4', compact ? 'gap-2' : 'gap-5 md:gap-8')}>
        <Stat compact={compact} label="Per video" value={formatMoney(profile.rate_per_video)} />
        <Stat compact={compact} label={followerLabel} value={followers ? formatViews(followers) : '—'} />
        <Stat compact={compact} label="Avg views" value={avgViews ? formatViews(avgViews) : '—'} />
        <Stat compact={compact} label="Engagement" value={engagementRate ? formatPercent(engagementRate) : '—'} />
      </div>
      {rows.filter((row) => row.reach?.followerCount).length > 0 && rows.length > 1 && (
        <p className={cn('text-[#8a8a8e]', compact ? 'text-[10px]' : 'text-sm')}>
          {rows
            .map(({ platform, reach }) => {
              const label = platform === 'tiktok' ? 'TikTok' : 'Instagram';
              return `${label} ${reach?.followerCount ? formatViews(reach.followerCount) : '—'}`;
            })
            .join('   ·   ')}
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="flex gap-4 text-left">
        <div className="overflow-hidden bg-[#efefef] w-[5.75rem] h-[7.5rem] shrink-0">
          <CreatorPhoto id={profile.id} avatarUrl={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-3">
          {identity}
          {stats}
          <BookMeWorkStrip work={profile.work} name={name} compact />
        </div>
      </div>
    );
  }

  return (
    <article className="h-dvh overflow-hidden bg-white text-[#0A101D] grid grid-rows-[minmax(0,30vh)_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[minmax(300px,40vw)_minmax(0,1fr)]">
      <div className="relative min-h-0 bg-[#efefef]">
        <CreatorPhoto
          id={profile.id}
          avatarUrl={profile.avatar_url}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-h-0 flex flex-col px-6 py-6 sm:px-10 lg:px-14 lg:py-10">
        <div className="flex flex-col flex-1 min-h-0 gap-8 lg:gap-10">
          {identity}
          {stats}
          <div className="flex-1 min-h-[7.5rem]">
            <BookMeWorkStrip work={profile.work} name={name} />
          </div>
        </div>
        {action ? <div className="shrink-0 pt-6">{action}</div> : null}
      </div>
    </article>
  );
};

export default BookMeCard;
