import { lazy, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';

const LogoCloud = lazy(() => import('@/components/LogoCloud'));
const Features = lazy(() => import('@/components/Features'));
const HowItWorks = lazy(() => import('@/components/HowItWorks'));
const CallToAction = lazy(() => import('@/components/CallToAction'));
const Footer = lazy(() => import('@/components/Footer'));

const BrandLanding = () => (
  <div className="relative min-h-screen bg-background">
    <Navbar />
    <main>
      <Hero audience="brand" />
      <Suspense fallback={<div className="h-48" aria-hidden="true" />}>
        <LogoCloud />
        <Features audience="brand" />
        <HowItWorks audience="brand" />
        <CallToAction audience="brand" />
        <Footer />
      </Suspense>
    </main>
  </div>
);

export default BrandLanding;
