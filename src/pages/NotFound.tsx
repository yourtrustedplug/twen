import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { audienceHref, roleAppHref } from '@/lib/hosts';
import { formatMissingPath, isAbsoluteHref, notFoundHome } from '@/lib/not-found';
import { httpErrorCopy } from '@/lib/http-errors';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { ErrorPoster } from '@/components/ErrorPoster';
import creatorImage from '@/assets/gate/gate-creator.jpg';
import brandImage from '@/assets/gate/gate-brand.jpg';

const destinations = [
  {
    href: () => audienceHref('creator'),
    label: 'Creators',
    sub: 'I make videos',
    image: creatorImage,
    alt: 'Creator filming a Twen campaign on a phone',
  },
  {
    href: () => audienceHref('brand'),
    label: 'Brands',
    sub: 'I want reach',
    image: brandImage,
    alt: 'Brand planning a Twen campaign',
  },
] as const;

const DestinationCard = ({
  href,
  label,
  sub,
  image,
  alt,
  index,
}: {
  href: string;
  label: string;
  sub: string;
  image: string;
  alt: string;
  index: number;
}) => {
  const className =
    'group relative isolate block h-[16rem] max-xs:h-[13rem] w-full overflow-hidden rounded-[32px] max-md:rounded-[24px] text-left';
  const body = (
    <>
      <img
        src={image}
        alt=""
        width={912}
        height={1200}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 max-xs:p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[1px] text-white/70">{sub}</p>
          <p className="font-display text-[clamp(1.35rem,4vw,2rem)] font-bold leading-[1.1] text-white">
            {label}
          </p>
        </div>
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1 max-xs:h-9 max-xs:w-9">
          <ArrowRight className="h-5 w-5 max-xs:h-4 max-xs:w-4" aria-hidden="true" />
        </span>
      </div>
    </>
  );

  const motionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.12 + index * 0.08, duration: 0.45 },
    className,
    'aria-label': `${label}. ${sub}. ${alt}`,
  };

  if (isAbsoluteHref(href)) {
    return (
      <motion.a href={href} {...motionProps}>
        {body}
      </motion.a>
    );
  }

  return (
    <motion.div initial={motionProps.initial} animate={motionProps.animate} transition={motionProps.transition}>
      <Link to={href} className={className} aria-label={motionProps['aria-label']}>
        {body}
      </Link>
    </motion.div>
  );
};

const NotFound = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const signedIn = Boolean(user);
  const home = notFoundHome(signedIn, profile?.role);
  const homeHref = signedIn ? roleAppHref(profile?.role, home.path) : home.path;
  const missingPath = formatMissingPath(location.pathname);
  const copy = httpErrorCopy(404);

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ErrorPoster
        overlayNav
        watermark="404"
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        chip={missingPath}
        lead={<PageBreadcrumbs align="start" className="mb-5 max-md:justify-center" />}
        actions={[
          { label: home.label, href: homeHref },
          { label: 'Contact', href: '/contact', variant: 'invofyOutline' },
        ]}
      >
        {!signedIn ? (
          <div className="grid w-full grid-cols-2 gap-3 max-xs:grid-cols-1 md:gap-5">
            {destinations.map((destination, index) => (
              <DestinationCard
                key={destination.label}
                href={destination.href()}
                label={destination.label}
                sub={destination.sub}
                image={destination.image}
                alt={destination.alt}
                index={index}
              />
            ))}
          </div>
        ) : null}
      </ErrorPoster>
    </div>
  );
};

export default NotFound;
