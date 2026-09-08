import { lazy, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';

const Features = lazy(() => import('@/components/Features'));
const HowItWorks = lazy(() => import('@/components/HowItWorks'));
const Testimonials = lazy(() => import('@/components/Testimonials'));
const CallToAction = lazy(() => import('@/components/CallToAction'));
const Footer = lazy(() => import('@/components/Footer'));

const CreatorLanding = () => (
  <div className="relative min-h-screen bg-background">
    <Navbar />
    <main>
      <Hero audience="creator" />
      <Suspense fallback={<div className="h-48" aria-hidden="true" />}>
        <Features audience="creator" />
        <HowItWorks audience="creator" />
        <Testimonials />
        <CallToAction audience="creator" />
        <Footer />
      </Suspense>
    </main>
  </div>
);

export default CreatorLanding;
