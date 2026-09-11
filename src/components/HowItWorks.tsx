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
        'py-32 px-10 max-lg:py-24 max-md:py-24 max-md:px-6 max-xs:py-20 max-xs:px-5',
        className
      )}
      {...props}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center mb-16 max-md:mb-12">
          <span className="text-xs tracking-[1px] uppercase font-semibold">
            How It Works
          </span>
          <h2 className="text-[4.5rem] max-lg:text-[3rem] max-md:text-[2rem] leading-[1.2] font-bold font-display">
            {copy.stepsHeadline}
          </h2>
          <div className="w-full">
            <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
              {copy.stepsSub}
            </p>
          </div>
        </div>

        <div className="flex justify-start items-center w-full max-lg:flex-col max-lg:gap-8">
          <div className="w-full h-full">
            <div className="relative w-full h-full min-h-[600px] xl:min-h-[680px] 2xl:min-h-[750px] 3xl:min-h-[850px] max-lg:min-h-[500px] md:max-lg:min-h-[580px] max-md:min-h-[400px] overflow-hidden">
              <img
                src={backgroundImage}
                alt=""
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover rounded-[40px]"
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
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[25rem] xl:w-[28rem] 2xl:w-[32rem] 3xl:w-[38rem] max-lg:w-[55vw] max-md:w-[60vw] rounded-t-[34px] shadow-[0_16px_16px_rgba(10,16,29,0.1)] object-cover"
              />
            </div>
          </div>

          <div className="w-full h-full relative lg:pl-6">
            <div className="flex flex-col justify-between items-end w-full h-full gap-6 2xl:gap-8">
              <div className="flex flex-col justify-center w-full h-full gap-5 2xl:gap-8 max-md:gap-3">
                {copy.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex flex-col justify-start items-start bg-[#fafafa] border border-[#f1f1f1] rounded-[34px] p-7 xl:p-8 2xl:p-12 max-lg:p-8 max-xs:rounded-[30px] gap-4"
                  >
                    <div className="flex justify-start items-center gap-4 max-xs:flex-col max-xs:items-start max-xs:gap-3">
                      <div className="flex items-center justify-center w-10 h-10 xl:w-11 xl:h-11 max-md:w-10 max-md:h-10 max-xs:w-9 max-xs:h-9 bg-primary text-primary-foreground rounded-full text-lg xl:text-xl max-md:text-base max-xs:text-sm font-semibold leading-none flex-shrink-0">
                        {step.number}
                      </div>
                      <h3 className="text-2xl xl:text-[1.625rem] max-xs:text-xl font-bold leading-none m-0">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-lg max-xs:text-base leading-[1.4] text-muted-foreground m-0 font-normal">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              <Button variant="invofy" size="invofy" onClick={() => startAuth(audience)}>
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
