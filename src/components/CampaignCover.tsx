import { useCampaignCover } from '@/lib/campaign-image';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  coverImage?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

/** Campaign cover that waits for the signed URL instead of flashing a stock photo. */
const CampaignCover = ({
  id,
  coverImage,
  alt,
  className,
  width = 768,
  height = 576,
}: Props) => {
  const src = useCampaignCover(id, coverImage);
  if (!src) {
    return <div className={cn('bg-[#f1f1f1] animate-pulse', className)} aria-hidden />;
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
};

export default CampaignCover;
