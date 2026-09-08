import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { onboardingFor } from '@/lib/onboarding';

export function OnboardingRequired({ action }: { action: string }) {
  const { profile } = useAuth();
  const check = onboardingFor(profile);

  return (
    <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-10 md:p-12">
      <h1 className="font-display text-3xl font-bold mb-3">Finish onboarding first</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        You can&apos;t {action} until your profile is complete.
      </p>
      <ul className="flex flex-col gap-2 mb-8">
        {check.missing.map((item) => (
          <li key={item.key} className="text-sm font-medium">
            · {item.label}
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
    <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[24px] px-5 py-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="font-semibold">Finish your profile to {action}.</p>
        <p className="text-sm text-muted-foreground">
          Still needed: {check.missing.map((m) => m.label).join(', ')}.
        </p>
      </div>
      <Button variant="invofy" size="sm" asChild>
        <Link to={check.profilePath}>Complete profile</Link>
      </Button>
    </div>
  );
}
