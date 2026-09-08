import { Button } from '@/components/ui/button';
import { getRememberedAudience } from '@/lib/audience';
import { useStartAuth } from '@/hooks/use-start-auth';
import waveBg from '@/assets/about/wave-bg-values.png';
import valuesBg from '@/assets/about/values-bg.jpg';
import valuesImage from '@/assets/about/values-image.jpg';
import valueIcon01 from '@/assets/icons/value-icon-01.png';
import valueIcon02 from '@/assets/icons/value-icon-02.png';
import valueIcon03 from '@/assets/icons/value-icon-03.png';
import valueIcon04 from '@/assets/icons/value-icon-04.png';

const valuesData = [
  {
    icon: valueIcon01,
    number: 1,
    title: 'Honest Math',
    description: 'Most videos earn small amounts, some earn nothing, a few do well. We say that up front — and we never pay for followers, likes, or engagement, only views.',
  },
  {
    icon: valueIcon02,
    number: 2,
    title: 'Money Before Work',
    description: 'Campaigns are escrow-funded before creators see them. The budget exists before anyone commits time, and unspent money goes back to the brand.',
  },
  {
    icon: valueIcon03,
    number: 3,
    title: 'Same Terms for Everyone',
    description: 'No follower minimum, no negotiation, no agency in the middle. The rate is published per 1,000 views before anyone commits.',
  },
  {
    icon: valueIcon04,
    number: 4,
    title: 'Built for This Region',
    description: 'Payout lands on mobile money — MTN MoMo or Airtel Money. Local creators, local languages, local formats.',
  },
];

interface ValueCardProps {
  icon: string;
  number: number;
  title: string;
  description: string;
}

const ValueCard = ({ icon, number, title, description }: ValueCardProps) => (
  <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-6">
    <img src={icon} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10" />
    <div className="flex flex-col gap-3">
      <h3 className="text-2xl max-[991px]:text-xl leading-[1.4] font-bold">
        {number}. {title}
      </h3>
      <p className="text-base leading-[1.5] text-muted-foreground">
        {description}
      </p>
    </div>
  </div>
);

const AboutValues = () => {
  const startAuth = useStartAuth();
  return (
    <section className="px-10 max-[767px]:px-6 max-[479px]:px-5 pb-32 max-[991px]:pb-24 max-[479px]:pb-20">
      <div className="max-w-[100rem] mx-auto">
        {/* Values Container */}
        <div className="relative bg-[#fafafa] rounded-[4rem] max-[479px]:rounded-[3rem] overflow-hidden">
          {/* Wave Background */}
          <img
            src={waveBg}
            alt=""
            width={1920}
            height={800}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-20 z-[1] pointer-events-none"
          />

          {/* Content */}
          <div className="relative z-[2] py-24 max-[991px]:py-20 max-[479px]:py-16">
            <div className="flex flex-col gap-12 px-12 max-[991px]:px-10 max-[767px]:px-8 max-[479px]:px-4">
              {/* Header */}
              <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center">
                <span className="text-xs tracking-[1px] uppercase font-semibold">
                  Our Values
                </span>
                <h2 className="text-[4.5rem] max-[991px]:text-[3rem] max-[767px]:text-[2rem] leading-[1.2] font-bold font-display">
                  Principles Behind Everything We Build
                </h2>
                <div className="w-full">
                  <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
                    We believe that good tools should be invisible — so simple and intuitive that they help you work without getting in the way.
                  </p>
                </div>
              </div>

              {/* Values Grid - Desktop: 3 columns, Tablet/Mobile: stacked */}
              <div className="grid grid-cols-[1fr_1.3fr_1fr] max-[991px]:grid-cols-1 gap-6">
                {/* Left Column - Cards 1 & 3 */}
                <div className="flex flex-col justify-between gap-4 max-[991px]:hidden">
                  <ValueCard {...valuesData[0]} />
                  <ValueCard {...valuesData[2]} />
                </div>

                {/* Center Column - Image Block */}
                <div
                  className="rounded-[30px] overflow-hidden bg-cover bg-center px-6 pt-14 max-[991px]:pt-16 flex items-end justify-center min-h-[500px] max-[991px]:min-h-[400px] max-[479px]:min-h-[350px]"
                  style={{ backgroundImage: `url(${valuesBg})` }}
                >
                  <img
                    src={valuesImage}
                    alt="Team member"
                    width={400}
                    height={500}
                    loading="lazy"
                    decoding="async"
                    className="w-full max-w-[85%] rounded-t-[30px] object-cover object-top"
                  />
                </div>

                {/* Right Column - Cards 2 & 4 */}
                <div className="flex flex-col justify-between gap-4 max-[991px]:hidden">
                  <ValueCard {...valuesData[1]} />
                  <ValueCard {...valuesData[3]} />
                </div>

                {/* Tablet/Mobile: 2x2 Grid for cards */}
                <div className="hidden max-[991px]:grid grid-cols-2 max-[767px]:grid-cols-1 gap-4">
                  {valuesData.map((value, index) => (
                    <ValueCard key={index} {...value} />
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex justify-center">
                <Button variant="invofy" size="invofy" onClick={() => startAuth(getRememberedAudience())}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutValues;
