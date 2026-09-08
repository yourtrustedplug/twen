import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="mx-auto max-w-3xl px-6 pt-32 pb-16 prose prose-neutral">
      <h1>Privacy Policy</h1>
      <p className="lead text-muted-foreground">Last updated: September 7, 2026</p>
      <p>
        Twen (&quot;we&quot;, &quot;us&quot;) explains here how we collect and use personal
        data when you use our website and app.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account data: name, email, role (creator/brand), company or TikTok handle</li>
        <li>Auth data via Privy (email / Google) and session identifiers</li>
        <li>Campaign, submission, earnings, and payout details you enter</li>
        <li>Technical logs needed to operate and secure the service</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To operate the marketplace, authenticate you, process escrow and payouts, moderate
        submissions, send transactional email (e.g. contact form replies), and improve the product.
      </p>
      <h2>Processors</h2>
      <p>
        We use Privy (authentication), Supabase (database/auth sessions), Resend (email), and
        payment providers when payouts go live. Each processes data only as needed to provide their
        service.
      </p>
      <h2>Retention &amp; rights</h2>
      <p>
        We retain account and transaction records as long as your account is active and as required
        for legal/accounting reasons. Contact{' '}
        <a href="mailto:hello@twen.app">hello@twen.app</a> to request access, correction,
        or deletion where applicable.
      </p>
      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@twen.app">hello@twen.app</a> ·{' '}
        <Link to="/terms">Terms of Service</Link>
      </p>
    </main>
    <Footer />
  </div>
);

export default Privacy;
