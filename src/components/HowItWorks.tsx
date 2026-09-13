import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import backgroundImage from '@/assets/background-image-01.webp';
import foregroundImage from '@/assets/image-05.jpg';
import brandForegroundImage from '@/assets/image-06.jpg';
import { Audience, audienceCopy } from '@/lib/audience';
import { useStartAuth } from '@/hooks/use-start-auth';


interface HowItWorksProps extends React.ComponentProps<'section'> {
  audience?: Audience;
}

const HowItWorks = ({ className, audience = 'creator', ...props }: HowItWorksProps) => {
  const copy = audienceCopy[audience];
  const startAuth = useStartAuth();
  return (
    <section
      className={cn(
        'py-20 px-5 md:py-24 md:px-6 lg:py-32 lg:px-10',
        className
      )}
      {...props}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center mb-10 md:mb-16">
          <span className="text-xs tracking-[1px] uppercase font-semibold">
            How It Works
          </span>
          <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-[1.15] font-bold font-display">
            {copy.stepsHeadline}
          </h2>
          <div className="w-full">
            <p className="text-muted-foreground text-base md:text-lg leading-[1.4] font-normal">
              {copy.stepsSub}
            </p>
          </div>
        </div>

        <div className="flex justify-start items-center w-full max-lg:flex-col max-lg:gap-8">
          <div className="w-full h-full">
            <div className="relative w-full h-full min-h-[16rem] md:min-h-[400px] lg:min-h-[500px] xl:min-h-[680px] overflow-hidden">
              <img
                src={backgroundImage}
                alt=""
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover rounded-[28px] md:rounded-[40px]"
                aria-hidden="true"
              />
              <img
                src={audience === 'brand' ? brandForegroundImage : foregroundImage}
                alt={
                  audience === 'brand'
                    ? 'Brand campaign content being filmed for Twen distribution'
                    : 'Creator filming a short video on a phone for Twen'
                }
                width={512}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(16rem,70vw)] md:w-[60vw] lg:w-[25rem] xl:w-[28rem] 2xl:w-[32rem] rounded-t-[28px] md:rounded-t-[34px] shadow-[0_16px_16px_rgba(10,16,29,0.1)] object-cover"
              />
            </div>
          </div>

          <div className="w-full h-full relative lg:pl-6">
            <div className="flex flex-col justify-between items-stretch lg:items-end w-full h-full gap-6">
              <div className="flex flex-col justify-center w-full h-full gap-3 md:gap-5">
                {copy.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex flex-col justify-start items-start bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] md:rounded-[34px] p-5 md:p-7 xl:p-8 gap-3 md:gap-4"
                  >
                    <div className="flex justify-start items-center gap-3 md:gap-4">
                      <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-primary text-primary-foreground rounded-full text-sm md:text-lg font-semibold leading-none flex-shrink-0">
                        {step.number}
                      </div>
                      <h3 className="text-lg md:text-2xl font-bold leading-snug m-0">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-base md:text-lg leading-[1.4] text-muted-foreground m-0 font-normal">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              <Button variant="invofy" size="invofy" className="max-md:w-full" onClick={() => startAuth(audience)}>
                {copy.primaryCta}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
