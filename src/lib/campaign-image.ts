import { useEffect, useState } from 'react';
import campaign01 from '@/assets/campaigns/campaign-01.jpg';
import campaign02 from '@/assets/campaigns/campaign-02.jpg';
import campaign03 from '@/assets/campaigns/campaign-03.jpg';
import campaign04 from '@/assets/campaigns/campaign-04.jpg';
import campaign05 from '@/assets/campaigns/campaign-05.jpg';
import campaign06 from '@/assets/campaigns/campaign-06.jpg';
import { signedUrl } from '@/lib/storage';

const covers = [campaign01, campaign02, campaign03, campaign04, campaign05, campaign06];

const signedCoverCache = new Map<string, string>();

const isAbsoluteUrl = (path: string) => /^https?:\/\//.test(path);

/** Stable fallback visual for a campaign, derived from its id. */
export const campaignImage = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  return covers[hash % covers.length];
};

/** Sync src for this render: real cover if already known, else stock only when there is no cover. */
export const immediateCampaignCover = (id: string, coverImage?: string | null) => {
  if (!coverImage) return campaignImage(id);
  if (isAbsoluteUrl(coverImage)) return coverImage;
  return signedCoverCache.get(coverImage) ?? '';
};

/** Resolves cover_image storage path, else falls back to a stock cover. */
export const useCampaignCover = (id: string, coverImage?: string | null) => {
  const key = `${id}:${coverImage ?? ''}`;
  const next = immediateCampaignCover(id, coverImage);
  const [src, setSrc] = useState(next);
  const [seen, setSeen] = useState(key);
  if (key !== seen) {
    setSeen(key);
    setSrc(next);
  }

  useEffect(() => {
    let active = true;
    if (!coverImage || isAbsoluteUrl(coverImage)) return;
    const cached = signedCoverCache.get(coverImage);
    if (cached) {
      setSrc(cached);
      return;
    }
    signedUrl(coverImage).then((url) => {
      if (url) signedCoverCache.set(coverImage, url);
      if (active) setSrc(url || campaignImage(id));
    });
    return () => {
      active = false;
    };
  }, [id, coverImage]);

  return src;
};
