import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  BRAND_FREE_PERKS,
  BRAND_PLUS_MONTHLY_USD,
  BRAND_PLUS_PERKS,
  CREATOR_FREE_PERKS,
  CREATOR_PRO_MONTHLY_USD,
  CREATOR_PRO_PERKS,
  formatUsd,
  nextPlanCharge,
} from '@/lib/plan';
import { formatDate } from '@/lib/format';
import type { Audience } from '@/lib/audience';
import { cn } from '@/lib/utils';
import checkIcon from '@/assets/icons/check-icon.png';

const card = 'bg-[#fafafa] border border-[#f1f1f1] rounded-[20px] p-4 md:p-5 flex flex-col gap-4';

interface ProfilePlanPanelProps {
  audience: Audience;
  isPro: boolean;
  pending?: boolean;
  upgrading?: boolean;
  renewsAt?: string | null;
  focus?: 'plan' | 'billing';
  onUpgrade: () => void;
}

const PerkList = ({ perks }: { perks: readonly string[] }) => (
  <ul className="flex flex-col gap-2">
    {perks.map((perk) => (
      <li key={perk} className="flex items-start gap-3">
        <img
          src={checkIcon}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          decoding="async"
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <span className="text-sm text-muted-foreground">{perk}</span>
      </li>
    ))}
  </ul>
);

const ProfilePlanPanel = ({
  audience,
  isPro,
  pending = false,
  upgrading = false,
  renewsAt = null,
  focus = 'plan',
  onUpgrade,
}: ProfilePlanPanelProps) => {
  const paidName = audience === 'brand' ? 'Twen Plus' : 'Creator Pro';
  const price = audience === 'brand' ? BRAND_PLUS_MONTHLY_USD : CREATOR_PRO_MONTHLY_USD;
  const freePerks = audience === 'brand' ? BRAND_FREE_PERKS : CREATOR_FREE_PERKS;
  const paidPerks = audience === 'brand' ? BRAND_PLUS_PERKS : CREATOR_PRO_PERKS;
  const charge = nextPlanCharge({ isPro, pending, renewsAt, amount: price });
  const panelId = audience === 'brand' ? `brand-panel-${focus}` : `profile-panel-${focus}`;
  const labelledBy = audience === 'brand' ? `brand-tab-${focus}` : `profile-tab-${focus}`;

  if (focus === 'billing') {
    return (
      <div role="tabpanel" id={panelId} aria-labelledby={labelledBy} className={card}>
        <h2 className="font-display text-xl font-bold">Billing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground">
              Next payment
            </p>
            <p className="font-display text-xl font-bold mt-1">
              {charge.pending ? 'Confirming' : charge.date ? formatDate(charge.date) : 'None'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground">
              Amount
            </p>
            <p className="font-display text-xl font-bold mt-1">{formatUsd(charge.amount)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" id={panelId} aria-labelledby={labelledBy} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {isPro ? null : (
        <div className={cn(card, 'ring-1 ring-foreground/10')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground">
                You are on
              </p>
              <h2 className="font-display text-xl font-bold mt-1">Free</h2>
            </div>
            <span className="shrink-0 rounded-full bg-foreground text-background px-2.5 py-1 text-[11px] font-semibold">
              Current
            </span>
          </div>
          <PerkList perks={freePerks} />
        </div>
      )}

      <div className={cn(card, isPro ? 'ring-1 ring-foreground/10 sm:col-span-2' : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[1px] font-semibold text-muted-foreground">
              {isPro ? 'You are on' : 'Upgrade'}
            </p>
            <h2 className="font-display text-xl font-bold mt-1">{paidName}</h2>
          </div>
          {isPro ? (
            <span className="shrink-0 rounded-full bg-foreground text-background px-2.5 py-1 text-[11px] font-semibold">
              Current
            </span>
          ) : null}
        </div>
        <PerkList perks={paidPerks} />
        {isPro ? null : (
          <Button variant="invofy" size="invofy" className="w-full" disabled={upgrading} onClick={onUpgrade}>
            {upgrading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {pending ? 'Open NardoPay' : `Get ${paidName}`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfilePlanPanel;
