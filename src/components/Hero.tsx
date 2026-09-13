import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import heroBackground from '@/assets/hero-background.jpg';
import heroImage01 from '@/assets/hero-image-01.jpg';
import heroImage02 from '@/assets/hero-image-02.jpg';
import heroImage03 from '@/assets/hero-image-03.jpg';
import heroImage04 from '@/assets/hero-image-04.jpg';
import campaign01 from '@/assets/campaigns/campaign-01.jpg';
import campaign02 from '@/assets/campaigns/campaign-02.jpg';
import campaign03 from '@/assets/campaigns/campaign-03.jpg';
import campaign04 from '@/assets/campaigns/campaign-04.jpg';
import { Audience, audienceCopy, rememberAudience } from '@/lib/audience';
import { useStartAuth } from '@/hooks/use-start-auth';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';

const heroImages = [
  { src: heroImage01, alt: 'Creator browsing funded Twen campaigns on a tablet', bgColor: '#d4d0e8' },
  { src: heroImage02, alt: 'Creator smiling after earning on Twen', bgColor: '#f5e9c5' },
  { src: heroImage03, alt: 'Creator planning a brand video brief on Twen', bgColor: '#f5c5c5' },
  { src: heroImage04, alt: 'Creator withdrawing Twen earnings to mobile money', bgColor: '#c5ddf5' },
];

const brandImages = [
  { src: campaign01, alt: 'Creator video posted for a funded Twen brand campaign', bgColor: '#d4d0e8' },
  { src: campaign02, alt: 'Short-form brand content distributed through Twen', bgColor: '#f5e9c5' },
  { src: campaign03, alt: 'Verified Instagram and TikTok views from a Twen campaign', bgColor: '#f5c5c5' },
  { src: campaign04, alt: 'Brand reach across African creators on Twen', bgColor: '#c5ddf5' },
];

interface HeroProps {
  audience?: Audience;
}

const Hero = ({ audience = 'creator' }: HeroProps) => {
  const copy = audienceCopy[audience];
  const images = audience === 'brand' ? brandImages : heroImages;
  const containerRef = useRef<HTMLDivElement>(null);
  const startAuth = useStartAuth();

  useEffect(() => {
    rememberAudience(audience);
  }, [audience]);

  return (
    <section ref={containerRef} className="relative z-0 w-full">
      <div
        className="relative flex min-h-[100svh] max-md:min-h-0 flex-col bg-cover bg-center bg-no-repeat rounded-b-[4rem] max-xs:rounded-b-[2.5rem]"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="flex min-h-0 flex-1 flex-col px-5 md:px-10 pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.25rem))] pb-6 md:pb-8">
          <div className="flex min-h-0 flex-1 flex-col w-full max-w-[100rem] mx-auto">
            <div className="shrink-0 flex flex-col items-center w-full max-w-[60rem] mx-auto gap-3 md:gap-4 py-3 md:py-10">
              <PageBreadcrumbs className="mb-1" />
              {copy.eyebrow && (
                <span className="text-center text-[11px] md:text-xs tracking-[1px] uppercase font-semibold px-2">
                  {copy.eyebrow}
                </span>
              )}

              <h1 className="text-center text-[clamp(2.35rem,8vw,5.25rem)] leading-[1.08] font-bold font-display whitespace-pre-line">
                {copy.headline}
              </h1>

              <div className="w-full max-w-[30rem] mx-auto">
                <p className="text-muted-foreground text-center text-base md:text-lg leading-[1.4] font-normal">
                  {copy.sub}
                </p>
              </div>

              <div className="flex flex-row flex-wrap justify-center items-center gap-4 mt-1 md:mt-2">
                <Button variant="invofy" size="invofy" onClick={() => startAuth(audience)}>
                  {copy.primaryCta}
                </Button>
              </div>
            </div>

            <div className="min-h-0 md:flex-1 flex items-end pt-4 md:pt-2 -mx-5 px-5 md:mx-0 md:px-0">
              <div className="w-full h-[18rem] sm:h-[20rem] md:h-[22rem] lg:h-[20rem] xl:h-[22rem] 2xl:h-[26rem] overflow-x-auto scrollbar-none snap-x snap-mandatory flex gap-3 sm:gap-4 xl:gap-6 sm:justify-center 2xl:overflow-visible">
                {images.map((image, index) => (
                  <div
                    key={index}
                    style={{ backgroundColor: image.bgColor }}
                    className={cn(
                      'relative h-full aspect-[3/4] shrink-0 snap-center overflow-hidden rounded-[22px] sm:rounded-[24px] lg:rounded-[30px]',
                      index >= 2 && 'sm:max-lg:hidden',
                      index >= 3 && 'lg:max-xl:hidden',
                    )}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      width={256}
                      height={341}
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding={index < 2 ? 'sync' : 'async'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
