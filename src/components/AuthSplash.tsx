import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/logos';
import type { Audience } from '@/lib/audience';

const COPY: Record<Audience, { line: string; sub: string }> = {
  creator: {
    line: 'Earn from every post',
    sub: 'Funded campaigns. Verified views. Cash out.',
  },
  brand: {
    line: 'Flood the feed',
    sub: 'Real creators. Real reach. Pay for views.',
  },
};

type AuthSplashProps = {
  role: Audience;
  /** Called after the intro finishes — open Privy from here. */
  onDone: () => void;
};

/**
 * Full-bleed dark interstitial before Privy.
 * Twen ink + peach→coral type, then hands off to login.
 */
export function AuthSplash({ role, onDone }: AuthSplashProps) {
  const copy = COPY[role];
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = window.setTimeout(() => onDoneRef.current(), 2400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#0A101D] text-[#F5F5F5]">
      {/* Soft animated atmosphere — not flat black */}
      <motion.div
        className="pointer-events-none absolute -left-1/4 top-[-20%] h-[70vmin] w-[70vmin] rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #FFB0B6 0%, transparent 70%)',
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -right-1/4 bottom-[-10%] h-[65vmin] w-[65vmin] rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #FFDFD2 0%, transparent 70%)',
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, -25, 15, 0], scale: [1, 0.94, 1.06, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Logo
            variant="full"
            reverse
            iconClassName="w-9 h-9 md:w-11 md:h-11"
            wordmarkClassName="text-[2rem] md:text-[2.35rem] text-[#F5F5F5]"
          />
        </motion.div>

        <motion.h1
          className="mt-10 max-w-[18ch] font-display text-[clamp(2.25rem,8vw,4.5rem)] font-bold leading-[1.05] tracking-tight"
          style={{
            backgroundImage: 'linear-gradient(120deg, #FFDFD2 0%, #FFB0B6 55%, #FFDFD2 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{
            opacity: 1,
            y: 0,
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            opacity: { delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            y: { delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            backgroundPosition: { delay: 0.6, duration: 4, repeat: Infinity, ease: 'linear' },
          }}
        >
          {copy.line}
        </motion.h1>

        <motion.p
          className="mt-4 max-w-sm text-base font-medium text-[#F5F5F5]/70 md:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {copy.sub}
        </motion.p>

        <motion.div
          className="mt-12 h-px w-16 origin-center bg-gradient-to-r from-transparent via-[#FFB0B6] to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.55 }}
        />
      </div>
    </div>
  );
}
