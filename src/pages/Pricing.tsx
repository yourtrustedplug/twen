import { lazy, Suspense, useState } from 'react';
import Navbar from '@/components/Navbar';
import PricingHeader from '@/components/PricingHeader';
import type { Audience } from '@/lib/audience';

const PricingComparison = lazy(() => import('@/components/PricingComparison'));
const FAQ = lazy(() => import('@/components/FAQ'));
const Footer = lazy(() => import('@/components/Footer'));

const Pricing = () => {
  const [audience, setAudience] = useState<Audience>('creator');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PricingHeader audience={audience} onAudienceChange={setAudience} />
      <Suspense fallback={<div className="h-48" />}>
        <PricingComparison audience={audience} onAudienceChange={setAudience} />
        <FAQ audience={audience} />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Pricing;
