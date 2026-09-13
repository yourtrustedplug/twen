import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { onboardingFor } from '@/lib/onboarding';

export function OnboardingRequired({ action }: { action: string }) {
  const { profile } = useAuth();
  const check = onboardingFor(profile);

  return (
    <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] md:rounded-[30px] p-6 md:p-12">
      <h1 className="font-display text-3xl font-bold mb-3">Finish onboarding first</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        You can&apos;t {action} until your profile is complete.
      </p>
      <ul className="flex flex-col gap-2 mb-8">
        {check.missing.map((item) => (
          <li key={item.key} className="text-sm font-medium">
            ·{' '}
            <Link to={item.path} className="underline underline-offset-2 hover:text-foreground">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Button variant="invofy" size="invofy" asChild>
        <Link to={check.profilePath}>Complete profile</Link>
      </Button>
    </div>
  );
}

export function OnboardingBanner() {
  const { profile } = useAuth();
  const check = onboardingFor(profile);
  if (check.complete) return null;

  const action = profile?.role === 'brand' ? 'create a campaign' : 'submit to a campaign';

  return (
    <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[20px] px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="font-semibold">Finish your profile to {action}.</p>
        <p className="text-sm text-muted-foreground">
          Still needed:{' '}
          {check.missing.map((m, i) => (
            <span key={m.key}>
              {i > 0 ? ', ' : ''}
              <Link to={m.path} className="underline underline-offset-2 hover:text-foreground">
                {m.label}
              </Link>
            </span>
          ))}
          . Twen also sent this in{' '}
          <Link to="/messages" className="underline underline-offset-2 hover:text-foreground">
            Messages
          </Link>
          .
        </p>
      </div>
      <Button variant="invofy" size="sm" asChild>
        <Link to={check.profilePath}>Complete profile</Link>
      </Button>
    </div>
  );
}
