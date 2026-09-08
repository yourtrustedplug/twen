import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Audience } from '@/lib/audience';
import { useAuth } from '@/contexts/AuthContext';
import { useStartAuth } from '@/hooks/use-start-auth';
import Navbar from '@/components/Navbar';
import creatorImage from '@/assets/gate/gate-creator.jpg';
import brandImage from '@/assets/gate/gate-brand.jpg';

const options: { audience: Audience; label: string; sub: string; image: string }[] = [
  { audience: 'creator', label: 'Creator', sub: 'I make videos', image: creatorImage },
  { audience: 'brand', label: 'Brand', sub: 'I want reach', image: brandImage },
];

const AudienceGate = () => {
  const startAuth = useStartAuth();
  const { authSyncError } = useAuth();

  return (
    <main className="h-dvh overflow-hidden bg-background">
      <Navbar compact />

      <div className="h-full flex flex-col px-5 md:px-10 pt-[5.75rem] pb-4 max-xs:pt-[5.25rem] max-xs:pb-3">
        <h1 className="text-center text-[clamp(1.75rem,5vw,3rem)] leading-[1.15] font-bold font-display mb-4 max-xs:mb-3 shrink-0">
          You are a…
        </h1>

        <div className="grid grid-cols-2 max-md:grid-cols-1 max-md:grid-rows-2 gap-5 max-md:gap-3 max-w-[80rem] w-full mx-auto flex-1 min-h-0">
          {options.map((option, index) => (
            <motion.button
              key={option.audience}
              type="button"
              onClick={() => startAuth(option.audience)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="group relative h-full min-h-0 w-full overflow-hidden rounded-[40px] max-md:rounded-[28px] text-left"
            >
              <img
                src={option.image}
                alt={`${option.label} — ${option.sub} on Twen`}
                width={912}
                height={1200}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 max-md:p-5 max-xs:p-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white/70 text-sm max-xs:text-[11px] uppercase tracking-[1px] font-semibold">
                    {option.sub}
                  </p>
                  <p className="text-white text-[clamp(1.5rem,6vw,3rem)] font-bold font-display leading-[1.1]">
                    {option.label}
                  </p>
                </div>
                <span className="flex items-center justify-center w-12 h-12 max-xs:w-9 max-xs:h-9 rounded-full bg-white text-black flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="w-5 h-5 max-xs:w-4 max-xs:h-4" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {authSyncError ? (
          <p className="text-center text-sm text-red-600 mt-3 shrink-0">{authSyncError}</p>
        ) : null}
      </div>
    </main>
  );
};

export default AudienceGate;
