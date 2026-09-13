import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import footerBg from '@/assets/footer-bg.jpg';
import { Logo } from '@/logos';
import { getRememberedAudience } from '@/lib/audience';
import { audienceHref } from '@/lib/hosts';
import { useStartAuth } from '@/hooks/use-start-auth';
import { SupportMailButton } from '@/components/SupportMailButton';

const footerNavLinks = () => [
  { label: 'Home', href: '/' },
  { label: 'Creators', href: audienceHref('creator') },
  { label: 'Brands', href: audienceHref('brand') },
  { label: 'About', href: '/about' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
];

const prefetchAbout = () => {
  import('@/pages/About');
};
const prefetchPricing = () => {
  import('@/pages/Pricing');
};
const prefetchContact = () => {
  import('@/pages/Contact');
};
const prefetchLicenses = () => {
  import('@/pages/Licenses');
};

const SlideUpLink = ({
  label,
  href,
  alignEnd = false,
  onMouseEnter,
}: {
  label: string;
  href: string;
  alignEnd?: boolean;
  onMouseEnter?: () => void;
}) => {
  const className = `no-underline group flex flex-col gap-[0.375rem] text-base max-xs:text-[0.925rem] ${
    alignEnd ? 'items-end' : 'items-start'
  }`;
  const body = (
    <div className="relative h-[1.5em] overflow-hidden">
      <div className="flex flex-col transition-transform duration-300 will-change-transform group-hover:-translate-y-[1.5em]">
        <span className="block text-foreground font-medium whitespace-nowrap leading-[1.5]">
          {label}
        </span>
        <span className="block text-foreground font-medium whitespace-nowrap leading-[1.5]">
          {label}
        </span>
      </div>
    </div>
  );
  const external = href.startsWith('http');
  if (external) {
    return (
      <a href={href} onMouseEnter={onMouseEnter} className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link to={href} onMouseEnter={onMouseEnter} className={className}>
      {body}
    </Link>
  );
};

const Footer = () => {
  const startAuth = useStartAuth();

  return (
    <footer className="relative flex justify-center items-center overflow-hidden rounded-t-[4rem] max-xs:rounded-t-[3rem]">
      <img
        src={footerBg}
        alt=""
        width={1920}
        height={800}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full h-full px-5 md:px-6 lg:px-10">
        <div className="w-full max-w-[100rem] h-full mx-auto">
          <div className="pt-16 pb-40 md:pt-24 md:pb-56 lg:pt-32 lg:pb-80">
            <div className="relative z-[5] grid grid-cols-1 sm:grid-cols-2 gap-10 w-full">
              <div className="flex flex-col gap-5 items-start justify-start">
                <Link to="/" className="relative z-10 flex items-center gap-2 no-underline">
                  <Logo
                    variant="full"
                    iconClassName="w-6 h-6 max-xs:w-5 max-xs:h-5"
                    wordmarkClassName="text-[1.675rem] max-xs:text-[1.5rem] leading-[1.2]"
                  />
                </Link>

                <div className="w-full max-w-[25rem] mb-[10px]">
                  <p className="text-[1.125rem] max-xs:text-base leading-[1.5]">
                    The largest content distribution network in Africa. Let's go.
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <SupportMailButton />
                </div>
              </div>

              <div className="flex flex-col gap-5 items-start sm:items-end justify-start">
                <span className="text-[#3f3f3f] text-[1.125rem]">Pages</span>

                {footerNavLinks().map((link) => (
                  <SlideUpLink
                    key={link.label}
                    label={link.label}
                    href={link.href}
                    alignEnd={false}
                    onMouseEnter={
                      link.href === '/about'
                        ? prefetchAbout
                        : link.href === '/pricing'
                        ? prefetchPricing
                        : link.href === '/contact'
                        ? prefetchContact
                        : link.href === '/licenses'
                        ? prefetchLicenses
                        : undefined
                    }
                  />
                ))}

                <Button variant="invofy" size="invofy" className="max-sm:w-full" onClick={() => startAuth(getRememberedAudience())}>
                  Sign Up
                </Button>
              </div>
            </div>

            <div className="pt-16 max-md:pt-12"></div>

            <div className="relative z-[5] grid grid-cols-[1fr_auto] gap-8 w-full max-md:grid-cols-2 max-xs:grid-cols-1">
              <div className="flex gap-6 justify-self-start max-md:col-span-2 max-md:row-start-1 max-xs:col-span-1">
                <p className="leading-[1.5] text-muted-foreground">
                  © {new Date().getFullYear()} Twen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="absolute z-[2] bottom-[-6vw] left-0 right-0 text-center text-[22vw] sm:text-[28vw] 3xl:text-[30rem] font-bold font-display leading-none m-0 pointer-events-none">
        Twen
      </h2>
    </footer>
  );
};

export default Footer;
