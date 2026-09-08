import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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

const heroImages = [
  { src: heroImage01, alt: 'Professional with tablet', bgColor: '#d4d0e8' },
  { src: heroImage02, alt: 'Smiling professional', bgColor: '#f5e9c5' },
  { src: heroImage03, alt: 'Business woman with coffee', bgColor: '#f5c5c5' },
  { src: heroImage04, alt: 'Professional with phone', bgColor: '#c5ddf5' },
];

const brandImages = [
  { src: campaign01, alt: 'Creator video for a funded campaign', bgColor: '#d4d0e8' },
  { src: campaign02, alt: 'Creator video for a funded campaign', bgColor: '#f5e9c5' },
  { src: campaign03, alt: 'Creator video for a funded campaign', bgColor: '#f5c5c5' },
  { src: campaign04, alt: 'Creator video for a funded campaign', bgColor: '#c5ddf5' },
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
    <section
      ref={containerRef}
      className="relative z-0 w-full h-screen max-md:h-[50rem] max-xs:h-[45rem]"
    >
      <div
        className="relative flex h-full flex-col bg-cover bg-center bg-no-repeat rounded-b-[4rem] max-xs:rounded-b-[3rem]"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col px-5 md:px-10 max-md:px-6 max-xs:px-5 pt-[80px] pb-8">
          <div className="flex h-full min-h-0 flex-1 flex-col w-full max-w-[100rem] mx-auto">
            <div className="shrink-0 flex flex-col items-center w-full max-w-[60rem] mx-auto gap-4 py-6 md:py-10">
              {copy.eyebrow && (
                <span className="text-center text-xs tracking-[1px] uppercase font-semibold">
                  {copy.eyebrow}
                </span>
              )}

              <h1 className="text-center text-[5rem] 2xl:text-[5.25rem] max-lg:text-[8vw] max-xs:text-[9vw] leading-[1.1] font-bold font-display whitespace-pre-line">
                {copy.headline}
              </h1>

              <div className="w-full max-w-[30rem] mx-auto">
                <p className="text-muted-foreground text-center text-lg leading-[1.4] font-normal">
                  {copy.sub}
                </p>
              </div>

              <div className="flex flex-row flex-wrap justify-center items-center gap-6 max-xs:gap-5 mt-2">
                <Button variant="invofy" size="invofy" onClick={() => startAuth(audience)}>
                  {copy.primaryCta}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 flex items-end justify-center gap-3 sm:gap-4 xl:gap-6 2xl:gap-8 pt-2">
              {images.map((image, index) => (
                <div
                  key={index}
                  style={{ backgroundColor: image.bgColor }}
                  className="relative h-full max-h-full w-auto aspect-[3/4] rounded-[30px] max-lg:rounded-[24px] max-md:rounded-[20px] max-xs:rounded-[14px] overflow-hidden"
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
    </section>
  );
};

export default Hero;
