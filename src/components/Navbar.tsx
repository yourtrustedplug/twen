import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/logos';
import { audienceHref } from '@/lib/hosts';

const staticNavLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

const marketingNavLinks = () => [
  { label: 'Why Creators', href: audienceHref('creator') },
  { label: 'Why Brands', href: audienceHref('brand') },
  ...staticNavLinks,
];

const NavItem = ({
  href,
  onMouseEnter,
  onClick,
  className,
  children,
  label,
}: {
  href: string;
  onMouseEnter?: () => void;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  label?: string;
}) => {
  const external = href.startsWith('http');
  if (external) {
    return (
      <a href={href} onMouseEnter={onMouseEnter} onClick={onClick} className={className} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} onMouseEnter={onMouseEnter} onClick={onClick} className={className} aria-label={label}>
      {children}
    </Link>
  );
};

const prefetchAbout = () => {
  import('@/pages/About');
};
const prefetchPricing = () => {
  import('@/pages/Pricing');
};
const prefetchContact = () => {
  import('@/pages/Contact');
};

interface NavbarProps {
  /** Icon + wordmark + hamburger only — used on the home gate. */
  compact?: boolean;
}

const Navbar = ({ compact = false }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinks = marketingNavLinks();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-transparent pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="w-full h-full px-5 md:px-10">
        <div
          className={
            compact
              ? 'w-full max-w-[90rem] h-full mx-auto px-0'
              : 'w-full max-w-[90rem] h-full mx-auto rounded-full border border-border/60 bg-background/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 md:px-6 max-lg:bg-transparent max-lg:border-none max-lg:shadow-none max-lg:px-0'
          }
        >
          <div
            className={`flex flex-row justify-between items-center py-2 ${compact ? '' : 'max-lg:py-4'}`}
          >
            {/* Logo */}
            <Link to="/" aria-label="Twen home" className="relative z-10 flex items-center gap-2 no-underline group">
              <Logo
                variant="full"
                animatedWordmark
                iconClassName="w-[26px] h-[26px] md:w-[22px] md:h-[22px]"
                wordmarkClassName="text-[1.675rem] max-xs:text-[1.5rem] transition-transform duration-300 group-hover:-translate-y-8"
              />
            </Link>

            {/* Desktop Navigation */}
            {!compact && (
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <NavItem
                    key={link.label}
                    href={link.href}
                    label={link.label}
                    onMouseEnter={
                      link.href === '/about'
                        ? prefetchAbout
                        : link.href === '/pricing'
                        ? prefetchPricing
                        : undefined
                    }
                    className="no-underline group"
                  >
                    <div className="relative h-5 overflow-hidden">
                      <div className="flex flex-col">
                        <span
                          className="text-foreground text-base font-semibold leading-5 transition-transform duration-300 group-hover:-translate-y-5"
                          aria-hidden="true"
                        >
                          {link.label}
                        </span>
                        <span
                          className="text-foreground text-base leading-5 transition-transform duration-300 group-hover:-translate-y-5 font-semibold"
                          aria-hidden="true"
                        >
                          {link.label}
                        </span>
                      </div>
                    </div>
                  </NavItem>
                ))}
              </div>

              <Button variant="invofy" size="invofy" asChild>
                <Link to="/contact" onMouseEnter={prefetchContact}>
                  Contact
                </Link>
              </Button>
            </div>
            )}

            {/* Menu Button — always shown in compact (home) mode */}
            <button
              onClick={toggleMenu}
              className={`${compact ? '' : 'lg:hidden'} relative z-20 flex justify-center items-center h-11 w-11 md:h-14 md:w-14 lg:h-16 lg:w-16 bg-primary rounded-full transition-colors`}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              <div className="relative flex justify-center items-center w-6 h-full">
                <div className="flex flex-col justify-center items-center gap-[6px] w-6 h-4 overflow-hidden">
                  <motion.div
                    className="w-full h-[2px] bg-primary-foreground"
                    animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 4 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="w-full h-[2px] bg-primary-foreground"
                    animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -4 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`${compact ? '' : 'lg:hidden'} fixed inset-0 z-10 bg-background pointer-events-none flex flex-col`}
          >
            <div
              className="h-[calc(5.25rem+env(safe-area-inset-top))] shrink-0"
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="pointer-events-auto flex flex-col items-center justify-start gap-8 w-full flex-1 overflow-y-auto px-5 pb-10"
            >
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                >
                  <NavItem
                    href={link.href}
                    onMouseEnter={
                      link.href === '/about'
                        ? prefetchAbout
                        : link.href === '/pricing'
                        ? prefetchPricing
                        : undefined
                    }
                    onClick={() => setIsMenuOpen(false)}
                    className="no-underline group"
                  >
                    <span className="text-foreground text-5xl max-md:text-[2.5rem] max-xs:text-[2.25rem] font-semibold font-display leading-tight">
                      {link.label}
                    </span>
                  </NavItem>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 + 0.05 }}
              >
                <Button variant="invofy" size="invofy" asChild>
                  <Link
                    to="/contact"
                    onMouseEnter={prefetchContact}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
