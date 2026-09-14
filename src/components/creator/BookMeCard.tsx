import type { ReactNode } from 'react';
import { CreatorPhoto } from '@/components/CreatorCard';
import { PlatformMark, type MarkPlatform } from '@/components/creator/PlatformMark';
import { formatMoney, formatViews } from '@/lib/format';
import { formatPlace } from '@/lib/geo';
import { engagement, formatPercent } from '@/lib/metrics';
import { campaignImage } from '@/lib/campaign-image';
import { accountStatList, combineAccountStats } from '@/lib/account-stats';
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
  if (work.length === 0) return null;
  const items = work.slice(0, 3);
  return (
    <div className={cn(
      'grid-cols-3 min-h-0',
      compact ? 'grid gap-1' : 'hidden gap-1.5 [@media(min-height:740px)]:grid lg:grid',
    )}>
      {items.map((post) => {
        const rate = Number(post.engagement_rate) || engagement(post);
        return (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden bg-[#efefef] aspect-[3/4]"
          >
            <img
              src={campaignImage(post.id)}
              alt={`${name} video — ${formatViews(post.verified_views)} views`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 px-1.5 py-1.5 bg-gradient-to-t from-black/75 to-transparent text-white">
              <p className={cn('font-semibold leading-none', compact ? 'text-[9px]' : 'text-[11px]')}>
                {formatViews(post.verified_views)}
              </p>
              {rate > 0 ? (
                <p className={cn('text-white/75', compact ? 'text-[8px]' : 'text-[10px]')}>{formatPercent(rate)}</p>
              ) : null}
            </div>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
              <PlatformMark platform={workPlatform(post.platform)} className="w-2.5 h-2.5" />
            </span>
          </a>
        );
      })}
    </div>
  );
};

const SocialTextLink = ({
  href,
  platform,
  handle,
}: {
  href: string;
  platform: MarkPlatform;
  handle: string;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A101D]/70 hover:text-[#0A101D] transition-colors"
  >
    <PlatformMark platform={platform} className="w-3.5 h-3.5" />
    {handle.replace(/^@/, '')}
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
    <p className={cn('font-display font-bold tracking-tight leading-none tabular-nums whitespace-nowrap', compact ? 'text-base' : 'text-[1.35rem] md:text-[1.6rem]')}>
      {value}
    </p>
    <p className={cn('uppercase tracking-[0.14em] text-[#8a8a8e] mt-1.5', compact ? 'text-[8px]' : 'text-[10px]')}>
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
  const breakdown = accountStatList(profile.account_stats ?? {});
  const accounts = [tiktok && 'TikTok', instagram && 'Instagram'].filter(Boolean).join(' + ');

  const identity = (
    <div className={cn('min-w-0', compact ? 'space-y-1' : 'space-y-2')}>
      <p className={cn('uppercase tracking-[0.22em] text-[#8a8a8e] font-semibold', compact ? 'text-[8px]' : 'text-[10px]')}>
        Book me
      </p>
      <h1 className={cn('font-display font-bold tracking-tight leading-[0.95]', compact ? 'text-xl' : 'text-[2.35rem] md:text-[3.1rem]')}>
        {name}
      </h1>
      <p className={cn('text-[#5c5c61]', compact ? 'text-xs' : 'text-sm')}>
        @{profile.book_slug}
        {place ? ` · ${place}` : ''}
        {accounts ? ` · ${accounts}` : ''}
      </p>
      {profile.bio ? (
        <p className={cn('text-[#3d3d3d] leading-snug', compact ? 'text-xs line-clamp-2' : 'text-[15px] line-clamp-2 max-w-[36rem]')}>
          {profile.bio}
        </p>
      ) : null}
      {(tiktok || instagram) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
          {tiktok && profile.tiktok_handle ? (
            <SocialTextLink href={tiktok} platform="tiktok" handle={profile.tiktok_handle} />
          ) : null}
          {instagram && profile.instagram_handle ? (
            <SocialTextLink href={instagram} platform="instagram" handle={profile.instagram_handle} />
          ) : null}
        </div>
      )}
    </div>
  );

  const stats = (
    <div className="space-y-2">
      <div className={cn('grid grid-cols-4', compact ? 'gap-2' : 'gap-4 md:gap-6')}>
        <Stat compact={compact} label="Per video" value={formatMoney(profile.rate_per_video)} />
        <Stat compact={compact} label="Followers" value={followers ? formatViews(followers) : '—'} />
        <Stat compact={compact} label="Avg views" value={avgViews ? formatViews(avgViews) : '—'} />
        <Stat compact={compact} label="Engagement" value={engagementRate ? formatPercent(engagementRate) : '—'} />
      </div>
      {breakdown.length > 1 && (
        <p className={cn('text-[#8a8a8e]', compact ? 'text-[10px]' : 'text-xs')}>
          {breakdown
            .map(({ platform, reach }) => {
              const handle = platform === 'tiktok' ? profile.tiktok_handle : profile.instagram_handle;
              const label = platform === 'tiktok' ? 'TikTok' : 'Instagram';
              const who = handle?.replace(/^@/, '') || label;
              return `${who} ${formatViews(reach.followerCount)}`;
            })
            .join('  ·  ')}
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="flex gap-3 text-left">
        <div className="overflow-hidden bg-[#efefef] w-[5.5rem] h-[7.2rem] shrink-0">
          <CreatorPhoto id={profile.id} avatarUrl={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-2.5">
          {identity}
          {stats}
          <BookMeWorkStrip work={profile.work} name={name} compact />
        </div>
      </div>
    );
  }

  return (
    <article className="h-dvh overflow-hidden bg-white text-[#0A101D] grid grid-rows-[minmax(0,34vh)_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[minmax(280px,42vw)_minmax(0,1fr)]">
      <div className="relative min-h-0 bg-[#efefef]">
        <CreatorPhoto
          id={profile.id}
          avatarUrl={profile.avatar_url}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-h-0 flex flex-col px-5 py-4 sm:px-8 lg:px-12 lg:py-8">
        <div className="flex flex-col justify-center gap-5 lg:gap-7 flex-1 min-h-0">
          {identity}
          {stats}
          <BookMeWorkStrip work={profile.work} name={name} />
        </div>
        {action ? <div className="shrink-0 pt-4">{action}</div> : null}
      </div>
    </article>
  );
};

export default BookMeCard;
