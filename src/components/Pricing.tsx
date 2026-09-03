import { cn } from '@/lib/utils';
import pricingBg from '@/assets/pricing-bg.jpg';
import PricingCards from '@/components/PricingCards';

interface PricingProps extends React.ComponentProps<'section'> {}

const Pricing = ({ className, ...props }: PricingProps) => {
  return (
    <section
      className={cn(
        'py-32 px-10 max-lg:py-24 max-md:py-24 max-md:px-6 max-xs:py-20 max-xs:px-5 bg-cover bg-center rounded-[64px] max-md:rounded-[48px]',
        className
      )}
      style={{ backgroundImage: `url(${pricingBg})` }}
      {...props}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-4 max-w-[48.75rem] mx-auto text-center mb-16 max-md:mb-12 max-md:max-w-full">
          <span className="text-xs tracking-[1px] uppercase font-semibold">
            The Numbers
          </span>
          <h2 className="text-[4.5rem] max-lg:text-[3rem] max-md:text-[2rem] leading-[1.2] font-bold font-display">
            How earnings actually work
          </h2>
          <div className="w-full">
            <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
A published rate per 1,000 verified views. Nothing else.
            </p>
          </div>
        </div>

        <PricingCards />
      </div>
    </section>
  );
};

export default Pricing;
