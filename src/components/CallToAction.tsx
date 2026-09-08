import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ctaBg from '@/assets/cta-bg.png';

import ctaImage01 from '@/assets/cta/cta-image-01.jpg';
import ctaImage02 from '@/assets/cta/cta-image-02.jpg';
import ctaImage03 from '@/assets/cta/cta-image-03.jpg';
import ctaImage04 from '@/assets/cta/cta-image-04.jpg';
import ctaImage05 from '@/assets/cta/cta-image-05.jpg';
import ctaImage06 from '@/assets/cta/cta-image-06.jpg';
import { Audience, audienceCopy, getRememberedAudience } from '@/lib/audience';
import { useStartAuth } from '@/hooks/use-start-auth';

const ctaImages = [
  { src: ctaImage01, alt: 'Professional man', bgColor: '#d4c4e8', endX: '-30vw', endY: '-28vh', endScale: 0.8 },
  { src: ctaImage02, alt: 'Professional woman', bgColor: '#f5c5d5', endX: '35vw', endY: '20vh', endScale: 1.1 },
  { src: ctaImage03, alt: 'Woman with phone', bgColor: '#c4e8e4', endX: '30vw', endY: '-30vh', endScale: 0.9 },
  { src: ctaImage04, alt: 'Smiling woman', bgColor: '#c4e8f5', endX: '-30vw', endY: '30vh', endScale: 0.95 },
  { src: ctaImage05, alt: 'Woman in yellow sweater', bgColor: '#c4d4f5', endX: '0vw', endY: '-35vh', endScale: 1 },
  { src: ctaImage06, alt: 'Man smiling', bgColor: '#f5e8c4', endX: '0vw', endY: '35vh', endScale: 0.75 },
];

const CallToAction = ({ audience }: { audience?: Audience }) => {
  const role = audience ?? getRememberedAudience() ?? 'creator';
  const copy = audienceCopy[role];
  const startAuth = useStartAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const x1 = useTransform(smoothProgress, [0.2, 0.95], ['0vw', '-30vw']);
  const y1 = useTransform(smoothProgress, [0.2, 0.95], ['0vh', '-28vh']);
  const scale1 = useTransform(smoothProgress, [0.2, 0.95], [1, 0.8]);

  const x2 = useTransform(smoothProgress, [0.2, 0.95], ['0vw', '35vw']);
  const y2 = useTransform(smoothProgress, [0.2, 0.95], ['0vh', '20vh']);
  const scale2 = useTransform(smoothProgress, [0.2, 0.95], [1, 1.1]);

  const x3 = useTransform(smoothProgress, [0.2, 0.95], ['0vw', '30vw']);
  const y3 = useTransform(smoothProgress, [0.2, 0.95], ['0vh', '-30vh']);
  const scale3 = useTransform(smoothProgress, [0.2, 0.95], [1, 0.9]);

  const x4 = useTransform(smoothProgress, [0.2, 0.95], ['0vw', '-30vw']);
  const y4 = useTransform(smoothProgress, [0.2, 0.95], ['0vh', '30vh']);
  const scale4 = useTransform(smoothProgress, [0.2, 0.95], [1, 0.95]);

  const x5 = useTransform(smoothProgress, [0.2, 0.95], ['0vw', '0vw']);
  const y5 = useTransform(smoothProgress, [0.2, 0.95], ['0vh', '-35vh']);
  const scale5 = useTransform(smoothProgress, [0.2, 0.95], [1, 1]);

  const x6 = useTransform(smoothProgress, [0.2, 0.95], ['0vw', '0vw']);
  const y6 = useTransform(smoothProgress, [0.2, 0.95], ['0vh', '35vh']);
  const scale6 = useTransform(smoothProgress, [0.2, 0.95], [1, 0.75]);

  const contentOpacity = useTransform(smoothProgress, [0.7, 0.8], [0, 1]);

  const imageTransforms = [
    { x: x1, y: y1, scale: scale1 },
    { x: x2, y: y2, scale: scale2 },
    { x: x3, y: y3, scale: scale3 },
    { x: x4, y: y4, scale: scale4 },
    { x: x5, y: y5, scale: scale5 },
    { x: x6, y: y6, scale: scale6 },
  ];

  return (
    <section ref={containerRef} className="relative h-[200vh] bg-background">
      <div className="sticky top-0 h-screen overflow-hidden">
        <img
          src={ctaBg}
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30"
        />
        <div className="relative w-full h-full flex items-center justify-center">
          {ctaImages.map((image, index) => (
            <motion.div
              key={index}
              style={{
                x: imageTransforms[index].x,
                y: imageTransforms[index].y,
                scale: imageTransforms[index].scale,
                backgroundColor: image.bgColor,
              }}
              className="absolute w-[120px] md:w-[140px] lg:w-[220px] xl:w-[250px] 2xl:w-[280px] aspect-square rounded-[20px] md:rounded-[24px] lg:rounded-[30px] overflow-hidden"
            >
              <img
                src={image.src}
                alt={image.alt}
                width={280}
                height={280}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-top"
              />
            </motion.div>
          ))}

          <motion.div
            style={{ opacity: contentOpacity }}
            className="relative z-10 flex flex-col items-center text-center px-5 max-w-[40rem]"
          >
            <span className="text-xs tracking-[1px] uppercase font-semibold mb-4">
              {copy.ctaEyebrow}
            </span>

            <h2 className="text-[2rem] md:text-[3rem] lg:text-[4rem] leading-[1.2] font-bold font-display mb-6">
              {copy.ctaHeadline}
            </h2>

            <Button variant="invofy" size="invofy" onClick={() => startAuth(role)}>
              {copy.primaryCta}
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
