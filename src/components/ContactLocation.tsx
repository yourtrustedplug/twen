import { Mail, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import officeImage from '@/assets/about/about-image-01.jpg';

interface ContactLocationProps extends React.ComponentProps<'section'> {}

// Slide-up double text link component (matches footer animation)
const SlideUpLink = ({ 
  label, 
  href, 
  external = false,
  className = "text-base font-semibold"
}: { 
  label: string; 
  href: string; 
  external?: boolean;
  className?: string;
}) => (
<a 
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className={`no-underline group flex flex-col ${className}`}
  >
    <div className="relative h-[1.5em] overflow-hidden">
      <div className="flex flex-col transition-transform duration-300 will-change-transform group-hover:-translate-y-[1.5em]">
        <span className="block text-foreground font-semibold whitespace-nowrap leading-[1.5]">
          {label}
        </span>
        <span className="block text-foreground font-semibold whitespace-nowrap leading-[1.5]">
          {label}
        </span>
      </div>
    </div>
  </a>
);

const ContactLocation = ({ className, ...props }: ContactLocationProps) => {
  return (
    <section
      className={cn(
        'py-32 px-10 max-[991px]:py-24 max-[767px]:py-24 max-[767px]:px-6 max-[479px]:py-20 max-[479px]:px-5',
        className
      )}
      {...props}
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 max-w-[50rem] mx-auto text-center mb-16 max-[767px]:mb-12">
          <span className="text-xs tracking-[1px] uppercase font-semibold">
            Where We Are
          </span>
          <h2 className="text-[4.5rem] max-[991px]:text-[3rem] max-[767px]:text-[2rem] leading-[1.2] font-bold font-display">
            Find Us on the Ground
          </h2>
          <div className="w-full">
            <p className="text-muted-foreground text-lg leading-[1.4] font-normal">
              Creators and brands can always reach us online — or come find the team where the campaigns are made.
            </p>
          </div>
        </div>

        {/* Location Block */}
        <div className="bg-[#fafafa] rounded-[40px] max-[767px]:rounded-[30px] p-8 max-[767px]:p-6 max-[479px]:p-5">
          <div className="bg-white border border-[#f1f1f1] rounded-[30px] p-12 max-[991px]:p-10 max-[767px]:p-8 max-[479px]:p-6">
            <div className="flex gap-10 max-[991px]:flex-col max-[991px]:gap-8">
              {/* Left Column - Info */}
              <div className="w-1/2 max-[991px]:w-full flex flex-col justify-between">
                <div>
                  <h3 className="text-4xl max-[991px]:text-3xl max-[767px]:text-2xl font-bold mb-4">
                    Kampala, Uganda
                  </h3>
                  <p className="text-muted-foreground text-base leading-[1.6] mb-8 max-[767px]:mb-6 w-[80%] max-[991px]:w-full">
                    Our team on the ground works directly with creators, brands, and the mobile money rails that power payouts.
                  </p>
                </div>

                {/* Contact Items */}
                <div className="flex flex-col gap-5">
                  {/* Email */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0a101d] rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <SlideUpLink label="hello@unignored.app" href="mailto:hello@unignored.app" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0a101d] rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <SlideUpLink label="(415) 555-0123" href="tel:+14155550123" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Image */}
              <div className="w-1/2 max-[991px]:w-full relative">
                <img
                  src={officeImage}
                  alt="Our office"
                  width={600}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full min-h-[300px] max-[991px]:min-h-[280px] object-cover rounded-[20px]"
                />
                
                {/* Location Overlay Card */}
                <div className="absolute bottom-4 right-4 max-[479px]:bottom-3 max-[479px]:right-3 bg-white border border-[#f1f1f1] rounded-[20px] p-4 max-[479px]:p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0a101d] rounded-[10px] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Location</span>
                  <SlideUpLink
                      label="Plot 14, Kampala Road"
                      href="https://www.google.com/maps"
                      external
                      className="text-sm font-semibold max-[479px]:text-xs"
                    />
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

export default ContactLocation;
