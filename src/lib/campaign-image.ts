import { useEffect, useState } from 'react';
import campaign01 from '@/assets/campaigns/campaign-01.jpg';
import campaign02 from '@/assets/campaigns/campaign-02.jpg';
import campaign03 from '@/assets/campaigns/campaign-03.jpg';
import campaign04 from '@/assets/campaigns/campaign-04.jpg';
import campaign05 from '@/assets/campaigns/campaign-05.jpg';
import campaign06 from '@/assets/campaigns/campaign-06.jpg';
import { signedUrl } from '@/lib/storage';

const covers = [campaign01, campaign02, campaign03, campaign04, campaign05, campaign06];

/** Stable fallback visual for a campaign, derived from its id. */
export const campaignImage = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  return covers[hash % covers.length];
};

/** Resolves cover_image storage path, else falls back to a stock cover. */
export const useCampaignCover = (id: string, coverImage?: string | null) => {
  const [src, setSrc] = useState(() => campaignImage(id));

  useEffect(() => {
    let active = true;
    if (!coverImage) {
      setSrc(campaignImage(id));
      return;
    }
    signedUrl(coverImage).then((url) => {
      if (active) setSrc(url || campaignImage(id));
    });
    return () => {
      active = false;
    };
  }, [id, coverImage]);

  return src;
};
