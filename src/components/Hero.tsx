import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import heroBackground from '@/assets/hero-background.jpg';
import heroImage01 from '@/assets/hero-image-01.jpg';
import heroImage02 from '@/assets/hero-image-02.jpg';
import heroImage03 from '@/assets/hero-image-03.jpg';
import heroImage04 from '@/assets/hero-image-04.jpg';
import campaign01 from '@/assets/campaigns/campaign-01.jpg';
import campaign02 from '@/assets/campaigns/campaign-02.jpg';
import campaign03 from '@/assets/campaigns/campaign-03.jpg';
import campaign04 from '@/assets/campaigns/campaign-04.jpg';
import { Audience, audienceCopy, audiencePath } from '@/lib/audience';

const heroImages = [
  { src: heroImage01, alt: 'Professional with tablet', bgColor: '#d4d0e8' },
  { src: heroImage02, alt: 'Smiling professional', bgColor: '#f5e9c5' },
  { src: heroImage03, alt: 'Business woman with coffee', bgColor: '#f5c5c5' },
  { src: heroImage04, alt: 'Professional with phone', bgColor: '#c5ddf5' },
];

const brandImages = [
  { src: campaign01, alt: 'Creator video for a funded campaign', bgColor: '#d4d0e8' },
  { src: campaign02, alt: 'Creator video for a funded campaign', bgColor: '#f5e9c5' },
  { src: campaign03, alt: 'Creator video for a funded campaign', bgColor: '#f5c5c5' },
  { src: campaign04, alt: 'Creator video for a funded campaign', bgColor: '#c5ddf5' },
];

interface HeroProps {
  audience?: Audience;
}

const Hero = ({ audience = 'creator' }: HeroProps) => {
  const copy = audienceCopy[audience];
  const images = audience === 'brand' ? brandImages : heroImages;
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signInAnonymously } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const y1 = useTransform(smoothProgress, [0, 1], ['0%', '15%']);
  const y2 = useTransform(smoothProgress, [0, 1], ['15%', '-15%']);
  const y3 = useTransform(smoothProgress, [0, 1], ['0%', '15%']);
  const y4 = useTransform(smoothProgress, [0, 1], ['15%', '-15%']);
  const parallaxValues = [y1, y2, y3, y4];

  const handleDemoMode = async () => {
    setIsDemoLoading(true);
    const { error } = await signInAnonymously();
    if (!error) {
      navigate('/dashboard');
    }
    setIsDemoLoading(false);
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen max-md:h-[50rem] max-xs:h-[45rem] overflow-visible"
    >
      <div
        className="relative w-full h-full bg-cover bg-center bg-no-repeat rounded-b-[4rem] max-xs:rounded-b-[3rem] overflow-visible"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="w-full h-full px-5 md:px-10 max-md:px-6 max-xs:px-5">
          <div className="w-full max-w-[100rem] h-full mx-auto">
            {/* Hero Grid */}
            <div className="grid grid-cols-3 grid-rows-[1fr_auto_auto] w-full h-full py-[76px] pb-0 pt-[80px]">
              {/* Hero Content */}
              <div className="col-span-3 row-start-2 self-center flex flex-col items-center w-full max-w-[60rem] mx-auto max-lg:relative max-lg:-mt-16 max-md:-mt-10 my-[80px] gap-4 pb-10">
                <span className="text-center text-xs tracking-[1px] uppercase font-semibold">
                  {copy.eyebrow}
                </span>

                <h1 className="text-center text-[5rem] 2xl:text-[5.25rem] max-lg:text-[8vw] max-xs:text-[9vw] leading-[1.2] font-bold font-display">
                  {copy.headline}
                </h1>

                <div className="w-full max-w-[30rem] mx-auto">
                  <p className="text-muted-foreground text-center text-lg leading-[1.4] font-normal">
                    {copy.sub}
                  </p>
                </div>

                <div className="flex flex-row flex-wrap justify-center items-center gap-6 max-xs:gap-5 mt-2">
                  <Button
                    variant="invofy"
                    size="invofy"
                    onClick={handleDemoMode}
                    disabled={isDemoLoading}
                  >
                    {isDemoLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting Demo...
                      </>
                    ) : (
                      copy.primaryCta
                    )}
                  </Button>
                  <Button variant="invofyOutline" size="invofy" asChild>
                    <Link to={audiencePath(copy.other.audience)}>{copy.other.label}</Link>
                  </Button>
                </div>
              </div>

              {/* Hero Images */}
              <div className="col-span-3 row-start-3 self-end gap-4 xl:gap-6 2xl:gap-8 max-xs:gap-3 w-full translate-y-0 max-lg:translate-y-8 max-md:-translate-y-4 max-xs:-translate-y-6 flex items-end justify-center py-0 pt-2">
                {images.map((image, index) => (
                  <motion.div
                    key={index}
                    style={{ 
                      y: parallaxValues[index], 
                      backgroundColor: image.bgColor 
                    }}
                    className="relative w-64 xl:w-72 2xl:w-80 3xl:w-[22rem] aspect-[3/4] rounded-[30px] max-lg:rounded-[24px] max-md:rounded-[20px] max-xs:rounded-[14px] overflow-hidden"
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      width={256}
                      height={341}
                      loading={index < 2 ? "eager" : "lazy"}
                      decoding={index < 2 ? "sync" : "async"}
                      className="w-full h-full object-cover object-top"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
