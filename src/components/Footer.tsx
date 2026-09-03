import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import footerBg from '@/assets/footer-bg.jpg';
import xIcon from '@/assets/icons/x-icon.png';
import instagramIcon from '@/assets/icons/instagram-icon.png';
import linkedinIcon from '@/assets/icons/linkedin-icon.png';
import facebookIcon from '@/assets/icons/facebook-icon.png';

const LogoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-6 h-6 max-xs:w-5 max-xs:h-5 text-foreground"
  >
    <path d="M18.5293 15.3193C18.7059 14.8935 19.2943 14.8935 19.4707 15.3193L19.7236 15.9307C20.1556 16.9735 20.9615 17.8062 21.9746 18.2568L22.6924 18.5762C23.1026 18.759 23.1026 19.3562 22.6924 19.5391L21.9326 19.877C20.9449 20.3162 20.1534 21.1194 19.7139 22.1279L19.4668 22.6934C19.2864 23.1075 18.7137 23.1075 18.5332 22.6934L18.2871 22.1279C17.8476 21.1193 17.0552 20.3163 16.0674 19.877L15.3076 19.5391C14.8974 19.3562 14.8974 18.759 15.3076 18.5762L16.0254 18.2568C17.0385 17.8062 17.8445 16.9735 18.2764 15.9307L18.5293 15.3193ZM20.002 2C20.5532 2.00012 21 2.45576 21 2.99219V13.3418C20.3744 13.1207 19.7013 13 19 13C15.6863 13 13 15.6863 13 19C13 20.0932 13.2939 21.1173 13.8047 22H3.99316C3.44463 21.9999 3 21.5507 3 20.9922V9H9C9.55228 9 10 8.55228 10 8V2H20.002ZM8 7H3L8 2.00293V7Z"></path>
  </svg>
);

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
  { label: 'Licenses', href: '/licenses' },
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
}: {
  label: string;
  href: string;
  alignEnd?: boolean;
  onMouseEnter?: () => void;
}) => (
  <a
    href={href}
    onMouseEnter={onMouseEnter}
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
                <a href="#" className="relative z-10 flex items-center gap-2 no-underline">
                  <LogoIcon />
                  <span className="text-foreground text-[1.675rem] max-xs:text-[1.5rem] font-bold font-display leading-[1.2]">
                    Invofy
                  </span>
                </a>

                <div className="w-full max-w-[25rem] mb-[10px]">
                  <p className="text-[1.125rem] max-xs:text-base leading-[1.5]">
                    A simple and modern invoicing platform designed to help freelancers and small
                    businesses work faster and smarter.
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

                {navLinks.map((link) => (
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

                <Button variant="invofy" size="invofy" asChild>
                  <Link to="/invoice">Get Started</Link>
                </Button>
              </div>
            </div>

            <div className="pt-16 max-md:pt-12"></div>

            <div className="relative z-[5] grid grid-cols-[1fr_auto] gap-8 w-full max-md:grid-cols-2 max-xs:grid-cols-1">
              <div className="flex gap-6 justify-self-start max-md:col-span-2 max-md:row-start-1 max-xs:col-span-1">
                <p className="leading-[1.5]">
                  Invofy® - Created by{' '}
                  <a
                    href="https://x.com/templout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline transition-opacity duration-[350ms] hover:opacity-50"
                  >
                    Templout
                  </a>{' '}
                  - Powered by{' '}
                  <a
                    href="https://lovable.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline transition-opacity duration-[350ms] hover:opacity-50"
                  >
                    Lovable
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="absolute z-[2] bottom-[-10vw] left-0 right-0 text-center text-[28vw] 3xl:text-[30rem] font-bold font-display leading-none m-0">
        Invofy®
      </h2>
    </footer>
  );
};

export default Footer;
