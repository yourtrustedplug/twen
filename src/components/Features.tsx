import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import waveBg from '@/assets/wave-bg.png';
import ctaBackground from '@/assets/background-image-02.webp';
import featureIcon01 from '@/assets/icons/feature-icon-01.png';
import featureIcon02 from '@/assets/icons/feature-icon-02.png';
import featureIcon03 from '@/assets/icons/feature-icon-03.png';
import featureIcon04 from '@/assets/icons/feature-icon-04.png';
import featureIcon05 from '@/assets/icons/feature-icon-05.png';
import { Audience, audienceCopy } from '@/lib/audience';
import { useStartAuth } from '@/hooks/use-start-auth';

const featureIcons = [featureIcon01, featureIcon02, featureIcon03, featureIcon04, featureIcon05];


interface FeaturesProps extends React.ComponentProps<'section'> {
  audience?: Audience;
}

const Features = ({ className, audience = 'creator', ...props }: FeaturesProps) => {
  const copy = audienceCopy[audience];
  const startAuth = useStartAuth();
  return (
    <section className={cn('relative z-10 bg-background px-5 md:px-10 max-xs:px-5', className)} {...props}>
      <div className="max-w-[100rem] mx-auto">
        <div className="relative bg-[#fafafa] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden">
          <img
            src={waveBg}
            alt=""
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-20 z-[1] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-[2] py-20 md:py-24 lg:py-32">
            <div className="flex flex-col gap-8 px-5 sm:px-8 md:px-10 lg:px-12">
              <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center">
                <span className="text-xs tracking-[1px] uppercase font-semibold">
                  {copy.featuresEyebrow}
                </span>
                <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-[1.15] font-bold font-display">
                  {copy.featuresHeadline}
                </h2>
                <div className="w-full">
                  <p className="text-muted-foreground text-base md:text-lg leading-[1.4] font-normal">
                    {copy.featuresSub}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {copy.features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white border border-[#f1f1f1] rounded-[24px] md:rounded-[30px] p-6 md:p-8 flex flex-col gap-5 md:gap-6"
                  >
                    <img
                      src={featureIcons[index % featureIcons.length]}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xl md:text-2xl leading-[1.3] font-bold">{feature.title}</h3>
                      <p className="text-base md:text-lg leading-[1.4] text-muted-foreground font-normal">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}

                <div
                  className="rounded-[24px] md:rounded-[30px] p-6 md:p-8 flex flex-col justify-between gap-6 bg-cover bg-center min-h-[16rem]"
                  style={{ backgroundImage: `url(${ctaBackground})` }}
                >
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl md:text-2xl leading-[1.3] font-bold">{copy.featureCard.title}</h3>
                    <p className="text-base md:text-lg leading-[1.4] font-normal">
                      {copy.featureCard.description}
                    </p>
                  </div>
                  <div>
                    <Button variant="invofy" size="invofy" onClick={() => startAuth(audience)}>
                      {copy.primaryCta}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
