import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import aboutBg from '@/assets/about/about-bg.jpg';
import aboutImage01 from '@/assets/about/about-image-01.jpg';
import aboutImage02 from '@/assets/about/about-image-02.jpg';
import aboutImage03 from '@/assets/about/about-image-03.jpg';
import aboutImage04 from '@/assets/about/about-image-04.jpg';

const stats = [
  { value: '180K+', label: 'Videos Posted' },
  { value: '6', label: 'Markets Across East Africa' },
  { value: '2', label: 'Payout Rails: MoMo & Airtel' },
];

const AboutHeader = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation for mouse movement
  const springConfig = { stiffness: 150, damping: 25, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Different movement intensities for each image (creates depth)
  const topLeftX = useTransform(smoothX, [-1, 1], [-15, 15]);
  const topLeftY = useTransform(smoothY, [-1, 1], [-12, 12]);
  
  const topRightX = useTransform(smoothX, [-1, 1], [18, -18]);
  const topRightY = useTransform(smoothY, [-1, 1], [-10, 10]);
  
  const bottomLeftX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const bottomLeftY = useTransform(smoothY, [-1, 1], [-15, 15]);
  
  const bottomRightX = useTransform(smoothX, [-1, 1], [14, -14]);
  const bottomRightY = useTransform(smoothY, [-1, 1], [-12, 12]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    
    const rect = sectionRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Normalize to -1 to 1 range
    const normalizedX = (e.clientX - centerX) / (rect.width / 2);
    const normalizedY = (e.clientY - centerY) / (rect.height / 2);
    
    mouseX.set(normalizedX);
    mouseY.set(normalizedY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section 
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full overflow-hidden rounded-b-[4rem] max-[479px]:rounded-b-[3rem] min-h-screen max-[991px]:min-h-fit flex flex-col"
    >
      {/* Background Image */}
      <img 
        src={aboutBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Main Content Container */}
      <div className="relative z-10 w-full px-10 max-[767px]:px-6 max-[479px]:px-5 flex-1 flex flex-col justify-center">
        <div className="w-full max-w-[100rem] mx-auto">
          {/* Header Content with Images */}
          <div className="relative pt-48 pb-24 max-[991px]:pt-40 max-[991px]:pb-20 max-[767px]:pt-36 max-[767px]:pb-16 max-[479px]:pt-32 max-[479px]:pb-12">
            
            {/* Positioned Images - Desktop Only */}
            <div className="max-[991px]:hidden">
              {/* Top Left - Woman in yellow sweater */}
              <motion.div 
                className="absolute left-[2%] top-[12%] w-[13rem] min-[1440px]:w-[14rem] min-[1920px]:w-[16rem]"
                style={{ x: topLeftX, y: topLeftY }}
              >
                <div className="relative overflow-hidden rounded-3xl bg-[#e8c547] aspect-square">
                  <img 
                    src={aboutImage03}
                    alt="Team member"
                    width={256}
                    height={256}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              
              {/* Top Right - Man in blue polo */}
              <motion.div 
                className="absolute right-[3%] top-[10%] w-[14rem] min-[1440px]:w-[15rem] min-[1920px]:w-[17rem]"
                style={{ x: topRightX, y: topRightY }}
              >
                <div className="relative overflow-hidden rounded-3xl bg-[#6fa8dc] aspect-square">
                  <img 
                    src={aboutImage04}
                    alt="Team member"
                    width={256}
                    height={256}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              
              {/* Bottom Left - Man in gray sweater */}
              <motion.div 
                className="absolute left-[8%] top-[58%] w-[12rem] min-[1440px]:w-[13rem] min-[1920px]:w-[15rem]"
                style={{ x: bottomLeftX, y: bottomLeftY }}
              >
                <div className="relative overflow-hidden rounded-3xl bg-[#a4c2a5] aspect-square">
                  <img 
                    src={aboutImage01}
                    alt="Team member"
                    width={256}
                    height={256}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              
              {/* Bottom Right - Woman with phone on teal */}
              <motion.div 
                className="absolute right-[8%] top-[56%] w-[12rem] min-[1440px]:w-[13rem] min-[1920px]:w-[15rem]"
                style={{ x: bottomRightX, y: bottomRightY }}
              >
                <div className="relative overflow-hidden rounded-3xl bg-[#5daa9e] aspect-square">
                  <img 
                    src={aboutImage02}
                    alt="Team member"
                    width={256}
                    height={256}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
            
            {/* Centered Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-[42rem] mx-auto">
              {/* Label */}
              <span className="text-foreground text-sm font-semibold uppercase tracking-[0.2em] mb-6 max-[479px]:text-xs max-[479px]:mb-4">
                About Us
              </span>
              
              {/* Heading */}
              <h1 className="text-foreground text-[4.5rem] max-[991px]:text-[3.5rem] max-[767px]:text-[3rem] max-[479px]:text-[2.25rem] font-bold font-display leading-[1.1] mb-6 max-[479px]:mb-4">
                Views, Turned Into Income.
              </h1>

              {/* Description */}
              <p className="text-foreground/80 text-lg max-[479px]:text-base leading-relaxed mb-10 max-[479px]:mb-8 max-w-[32rem]">
                Unignored exists because creators in this region were already earning attention — just not money. We fixed the second part.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="invofy" size="invofy" asChild>
                  <Link to="/contact">Get in Touch</Link>
                </Button>
                <Button variant="invofyOutline" size="invofy" asChild>
                  <Link to="/pricing">How Earnings Work</Link>
                </Button>
              </div>
            </div>
            
            {/* Mobile/Tablet Images Grid */}
            <div className="hidden max-[991px]:grid grid-cols-2 gap-4 mt-12 max-[479px]:mt-8 max-[479px]:gap-3">
              <div className="overflow-hidden rounded-2xl min-[480px]:max-[991px]:rounded-3xl aspect-square">
                <img 
                  src={aboutImage03}
                  alt="Team member"
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-2xl min-[480px]:max-[991px]:rounded-3xl aspect-square">
                <img 
                  src={aboutImage04}
                  alt="Team member"
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-2xl min-[480px]:max-[991px]:rounded-3xl aspect-square">
                <img 
                  src={aboutImage01}
                  alt="Team member"
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-2xl min-[480px]:max-[991px]:rounded-3xl aspect-square">
                <img 
                  src={aboutImage02}
                  alt="Team member"
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="relative z-10 w-full px-10 max-[767px]:px-6 max-[479px]:px-5 pb-14 max-[767px]:pb-12 max-[479px]:pb-10">
        <div className="w-full max-w-[100rem] mx-auto">
          <div className="grid grid-cols-3 max-[767px]:grid-cols-1 max-[767px]:gap-8 w-full">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className={`flex flex-col gap-2 ${
                  index === 0 
                    ? 'items-start max-[767px]:items-center' 
                    : index === 1 
                      ? 'items-center' 
                      : 'items-end max-[767px]:items-center'
                }`}
              >
                <span className="text-[4rem] max-[991px]:text-[3rem] max-[767px]:text-[2.5rem] max-[479px]:text-[2rem] font-bold font-display leading-none text-foreground">
                  {stat.value}
                </span>
                <span className="text-base max-[479px]:text-sm font-medium text-foreground/80">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHeader;
