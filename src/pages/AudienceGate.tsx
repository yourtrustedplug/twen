import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Audience, rememberAudience } from '@/lib/audience';
import creatorImage from '@/assets/gate/gate-creator.jpg';
import brandImage from '@/assets/gate/gate-brand.jpg';

const options: { audience: Audience; label: string; sub: string; image: string }[] = [
  { audience: 'creator', label: 'Creator', sub: 'I make videos', image: creatorImage },
  { audience: 'brand', label: 'Brand', sub: 'I want reach', image: brandImage },
];

const AudienceGate = () => {
  const navigate = useNavigate();

  const choose = (audience: Audience) => {
    rememberAudience(audience);
    navigate(`/signup?role=${audience}`);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="px-5 md:px-10 py-6">
        <Link to="/" className="text-[1.675rem] font-bold font-display text-foreground no-underline">
          Unignored
        </Link>
      </header>

      <div className="flex-1 flex flex-col justify-center px-5 md:px-10 pb-10">
        <h1 className="text-center text-[3rem] max-md:text-[2rem] leading-[1.15] font-bold font-display mb-8">
          You are a…
        </h1>

        <div className="grid grid-cols-2 max-xs:grid-cols-1 gap-5 max-w-[80rem] w-full mx-auto">
          {options.map((option, index) => (
            <motion.button
              key={option.audience}
              type="button"
              onClick={() => choose(option.audience)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="group relative aspect-[3/4] max-md:aspect-[4/5] w-full overflow-hidden rounded-[40px] max-xs:rounded-[28px] text-left"
            >
              <img
                src={option.image}
                alt={option.label}
                width={912}
                height={1200}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 max-xs:p-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-white/70 text-sm uppercase tracking-[1px] font-semibold">
                    {option.sub}
                  </p>
                  <p className="text-white text-[3rem] max-md:text-[2rem] font-bold font-display leading-[1.1]">
                    {option.label}
                  </p>
                </div>
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-black flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="w-5 h-5" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default AudienceGate;
