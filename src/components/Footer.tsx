import { Button } from '@/components/ui/button';
import footerBg from '@/assets/footer-bg.jpg';
import xIcon from '@/assets/icons/x-icon.png';
import instagramIcon from '@/assets/icons/instagram-icon.png';
import linkedinIcon from '@/assets/icons/linkedin-icon.png';
import facebookIcon from '@/assets/icons/facebook-icon.png';
import { Logo } from '@/logos';
import { getRememberedAudience } from '@/lib/audience';
import { audienceHref } from '@/lib/hosts';
import { useStartAuth } from '@/hooks/use-start-auth';

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

const socialLinks = [
  { icon: xIcon, href: 'https://www.x.com/', alt: 'X' },
  { icon: instagramIcon, href: 'https://www.instagram.com/', alt: 'Instagram' },
  { icon: linkedinIcon, href: 'https://www.linkedin.com/', alt: 'LinkedIn' },
  { icon: facebookIcon, href: 'https://www.facebook.com/', alt: 'Facebook' },
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
  onClick,
}: {
  label: string;
  href: string;
  alignEnd?: boolean;
  onMouseEnter?: () => void;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) => (
  <a
    href={href}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    className={`no-underline group flex flex-col gap-[0.375rem] text-base max-xs:text-[0.925rem] ${
      alignEnd ? 'items-end' : 'items-start'
    }`}
  >
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
  </a>
);

const SocialIcon = ({ icon, href, alt }: { icon: string; href: string; alt: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center justify-center w-11 h-11 bg-foreground rounded-full transition-transform duration-300 hover:scale-110"
  >
    <div className="relative w-5 h-5 overflow-hidden">
      <div className="flex flex-col items-center w-full transition-transform duration-300 group-hover:-translate-y-5">
        <img src={icon} alt={alt} width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5" />
        <img src={icon} alt={alt} width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5" />
      </div>
    </div>
  </a>
);

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
      />

      <div className="relative z-10 w-full h-full px-10 max-md:px-6 max-xs:px-5">
        <div className="w-full max-w-[100rem] h-full mx-auto">
          <div className="pt-32 pb-80 max-lg:pb-64 max-md:pt-24 max-md:pb-56 max-xs:pt-20 max-xs:pb-32 2xl:pb-[22rem] 3xl:pb-[25rem]">
            <div className="relative z-[5] grid grid-cols-2 gap-8 w-full max-xs:grid-cols-1">
              <div className="flex flex-col gap-5 items-start justify-start max-xs:col-span-1">
                <a href="/" className="relative z-10 flex items-center gap-2 no-underline">
                  <Logo
                    variant="full"
                    iconClassName="w-6 h-6 max-xs:w-5 max-xs:h-5"
                    wordmarkClassName="text-[1.675rem] max-xs:text-[1.5rem] leading-[1.2]"
                  />
                </a>

                <div className="w-full max-w-[25rem] mb-[10px]">
                  <p className="text-[1.125rem] max-xs:text-base leading-[1.5]">
                    The largest content distribution network in Africa. Let's go.
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  {socialLinks.map((social) => (
                    <SocialIcon key={social.alt} {...social} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6 items-end justify-start max-xs:items-start max-xs:row-start-2">
                <span className="text-[#3f3f3f] text-[1.125rem]">Pages</span>

                {footerNavLinks().map((link) => (
                  <SlideUpLink
                    key={link.label}
                    label={link.label}
                    href={link.href}
                    alignEnd
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

                <Button variant="invofy" size="invofy" onClick={() => startAuth(getRememberedAudience())}>
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

      <h2 className="absolute z-[2] bottom-[-10vw] left-0 right-0 text-center text-[28vw] 3xl:text-[30rem] font-bold font-display leading-none m-0">
        Twen
      </h2>
    </footer>
  );
};

export default Footer;
