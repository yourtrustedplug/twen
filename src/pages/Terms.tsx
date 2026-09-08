import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="mx-auto max-w-3xl px-6 pt-32 pb-16 prose prose-neutral">
      <h1>Terms of Service</h1>
      <p className="lead text-muted-foreground">Last updated: September 7, 2026</p>
      <p>
        These Terms govern your use of Twen (&quot;we&quot;, &quot;us&quot;), a content distribution
        network that connects brands and creators for performance-based campaigns.
      </p>
      <h2>Accounts</h2>
      <p>
        You must provide accurate information and keep your login secure. You are responsible for
        activity under your account. Moderators may suspend accounts that violate these Terms.
      </p>
      <h2>Campaigns &amp; payments</h2>
      <p>
        Brands fund campaigns into escrow. Creators earn based on verified views at the campaign
        rate, subject to budget caps, review, and hold periods disclosed in the product. Payouts
        are processed to the mobile-money details you provide. Fees, if any, are shown before you
        confirm a funding or withdrawal action.
      </p>
      <h2>Content</h2>
      <p>
        Creators retain ownership of their content but grant brands a license to use submitted
        campaign content as described in each brief. Do not submit illegal, infringing, or
        deceptive content.
      </p>
      <h2>Disclaimers</h2>
      <p>
        The service is provided &quot;as is.&quot; We do not guarantee campaign performance, view
        counts from third-party platforms, or uninterrupted availability.
      </p>
      <h2>Contact</h2>
      <p>
        Questions:{' '}
        <a href="mailto:hello@twen.app">hello@twen.app</a>. See also our{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </main>
    <Footer />
  </div>
);

export default Terms;
