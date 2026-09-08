import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";
import springfieldLogo from "@/assets/logos/springfield.png";
import wavelessLogo from "@/assets/logos/waveless.png";
import umbrellaLogo from "@/assets/logos/umbrella.png";
import pronatureLogo from "@/assets/logos/pronature.png";
import sitemarkLogo from "@/assets/logos/sitemark.png";

const logos = [
  { src: springfieldLogo, alt: "Springfield" },
  { src: wavelessLogo, alt: "Waveless" },
  { src: umbrellaLogo, alt: "Umbrella" },
  { src: pronatureLogo, alt: "ProNature" },
  { src: sitemarkLogo, alt: "Sitemark" },
];

interface LogoCloudProps extends React.ComponentProps<"section"> {}

export function LogoCloud({ className, ...props }: LogoCloudProps) {
  return (
    <section
      className={cn(
        'relative z-10 bg-background pt-16 pb-32 max-lg:pt-16 max-lg:pb-20 max-md:pt-16 max-md:pb-16',
        className
      )}
      {...props}
    >
      <div className="max-w-[1040px] mx-auto px-4 max-lg:max-w-full">
        <p className="text-center text-muted-foreground font-medium mb-12 max-md:mb-8 text-base font-sans">
          Campaigns funded by brands like
        </p>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 max-md:w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 max-md:w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <InfiniteSlider gap={48} speed={25}>
            {logos.map((logo) => (
              <img
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={170}
                height={45}
                loading="lazy"
                decoding="async"
                className="w-[170px] max-lg:w-[142px] max-md:w-[122px] h-auto object-contain shrink-0"
              />
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
}

export default LogoCloud;
