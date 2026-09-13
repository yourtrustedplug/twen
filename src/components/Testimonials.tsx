import { cn } from '@/lib/utils';
import waveBg from '@/assets/testimonials/wave-bg-03.png';
import quoteIcon from '@/assets/testimonials/quote-icon.png';
import client01 from '@/assets/testimonials/client-01.jpg';
import client02 from '@/assets/testimonials/client-02.jpg';
import client03 from '@/assets/testimonials/client-03.jpg';
import client04 from '@/assets/testimonials/client-04.jpg';
import client05 from '@/assets/testimonials/client-05.jpg';
import client06 from '@/assets/testimonials/client-06.jpg';

const testimonialsData = [
  {
    avatar: client01,
    name: 'Amina K.',
    role: 'Creator · Nairobi',
    quote: 'I post like always. Now the views pay. Three MoMo withdrawals already.',
  },
  {
    avatar: client02,
    name: 'Brian O.',
    role: 'Creator · Kampala',
    quote: "I see the budget before I film. The money is already there.",
  },
  {
    avatar: client03,
    name: 'Grace M.',
    role: 'Creator · Dar es Salaam',
    quote: "My account is three months old. Same rate as everyone.",
  },
  {
    avatar: client04,
    name: 'Joseph T.',
    role: 'Brand · Beverages',
    quote: 'One brief. Creators posted on their own accounts. We paid for verified views.',
  },
  {
    avatar: client05,
    name: 'Naomi A.',
    role: 'Brand · E-commerce',
    quote: 'Reach that actually felt local.',
  },
  {
    avatar: client06,
    name: 'Samuel W.',
    role: 'Creator · Mombasa',
    quote: 'Most videos earn small. Consistency is what pays.',
  },
];

interface TestimonialCardProps {
  avatar: string;
  name: string;
  role: string;
  quote: string;
  isStaggered?: boolean;
}

const TestimonialCard = ({ avatar, name, role, quote, isStaggered }: TestimonialCardProps) => (
  <div
    className={cn(
      'bg-white border border-[#f1f1f1] rounded-[24px] md:rounded-[30px] p-6 md:p-8 flex flex-col gap-5 md:gap-6 w-[min(20rem,calc(100vw-2.5rem))] md:w-[340px] lg:w-[380px] shrink-0',
      isStaggered && 'md:mt-16'
    )}
  >
    <img src={quoteIcon} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10" aria-hidden="true" />
    <p className="text-lg leading-[1.5] text-muted-foreground font-sans font-normal">{quote}</p>
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full border border-[#f1f1f1] p-[3px]">
        <img
          src={avatar}
          alt={`${name}, ${role}`}
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="w-full h-full rounded-full object-cover"
        />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-base">{name}</span>
        <span className="text-muted-foreground text-sm font-normal">{role}</span>
      </div>
    </div>
  </div>
);

interface TestimonialSliderProps {
  testimonials: typeof testimonialsData;
  direction?: 'left' | 'right';
}

const TestimonialSlider = ({ testimonials, direction = 'left' }: TestimonialSliderProps) => {
  const gap = 24;
  const speed = 80;

  return (
    <div
      className="flex overflow-hidden"
      style={
        {
          '--gap': `${gap}px`,
          '--speed': `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          'flex shrink-0 items-start',
          direction === 'left' ? 'animate-testimonial-scroll' : 'animate-testimonial-scroll-reverse'
        )}
        style={{ gap: `${gap}px` }}
      >
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={`original-${index}`} {...testimonial} isStaggered={index % 2 === 1} />
        ))}
      </div>
      <div
        className={cn(
          'flex shrink-0 items-start',
          direction === 'left' ? 'animate-testimonial-scroll' : 'animate-testimonial-scroll-reverse'
        )}
        style={{ gap: `${gap}px`, marginLeft: `${gap}px` }}
        aria-hidden
      >
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={`duplicate-${index}`} {...testimonial} isStaggered={index % 2 === 1} />
        ))}
      </div>
    </div>
  );
};

interface TestimonialsProps extends React.ComponentProps<'section'> {}

const Testimonials = ({ className, ...props }: TestimonialsProps) => {
  return (
    <section
      className={cn(
        'px-5 md:px-10 max-xs:px-5 pt-24 pb-16 max-lg:pt-20 max-lg:pb-12 max-md:pt-16 max-md:pb-10',
        className
      )}
      {...props}
    >
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

          <div className="relative z-[2] py-16 md:py-24 lg:py-32">
            <div className="flex flex-col gap-8 md:gap-12">
              <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center px-5 sm:px-8 lg:px-12">
                <span className="text-xs tracking-[1px] uppercase font-semibold">
                  Creators & Brands
                </span>
                <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-[1.15] font-bold font-display">
                  What Both Sides Say
                </h2>
                <div className="w-full">
                  <p className="text-muted-foreground text-lg leading-[1.4] font-sans font-normal">
Creators and brands across East Africa.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-24 max-md:w-12 bg-gradient-to-r from-[#fafafa] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 max-md:w-12 bg-gradient-to-l from-[#fafafa] to-transparent z-10 pointer-events-none" />

                <div className="pb-6">
                  <TestimonialSlider testimonials={testimonialsData} direction="left" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
