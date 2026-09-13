import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import FilterSelect from '@/components/creator/FilterSelect';
import CountryFlag from '@/components/creator/CountryFlag';
import PayoutMethodLogo from '@/components/creator/PayoutMethodLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  dialCodeFor,
  isMethodForCountry,
  isPayoutCountry,
  isoForCountry,
  methodLabel,
  methodsForCountry,
  normalizePayoutNumber,
  payoutCountryNames,
  validateWithdrawalAccount,
} from '@/lib/payout-methods';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CreatorPayoutAccount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(false);

  const initialCountry =
    (profile?.country && isPayoutCountry(profile.country) ? profile.country : '') || '';
  const [country, setCountry] = useState(initialCountry);
  const [method, setMethod] = useState(
    initialCountry && profile?.payout_provider && isMethodForCountry(initialCountry, profile.payout_provider)
      ? profile.payout_provider
      : methodsForCountry(initialCountry).length === 1
        ? methodsForCountry(initialCountry)[0]
        : '',
  );
  const [accountNumber, setAccountNumber] = useState(profile?.payout_number || '');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void supabase
      .from('withdrawal_accounts')
      .select('*')
      .eq('creator_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(true);
          setCountry(data.country);
          setMethod(data.method);
          setAccountNumber(data.account_number);
        }
        setLoading(false);
      });
  }, [user]);

  const methods = methodsForCountry(country);
  const dial = dialCodeFor(country);
  const countryOptions = payoutCountryNames().map((name) => ({
    value: name,
    label: name,
    leading: <CountryFlag iso={isoForCountry(name)} />,
  }));

  const applyCountry = (next: string) => {
    setCountry(next);
    const nextMethods = methodsForCountry(next);
    setMethod((current) =>
      isMethodForCountry(next, current) ? current : nextMethods.length === 1 ? nextMethods[0] : '',
    );
  };

  const save = async () => {
    if (!user) return;
    const errorMessage = validateWithdrawalAccount({ country, method, accountNumber });
    if (errorMessage) {
      toast({ title: errorMessage, variant: 'destructive' });
      return;
    }
    const number = normalizePayoutNumber(accountNumber);
    setSaving(true);
    const { data, error } = await supabase
      .from('withdrawal_accounts')
      .upsert(
        {
          creator_id: user.id,
          country,
          method,
          account_number: number,
          account_name: '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'creator_id' },
      )
      .select('*')
      .maybeSingle();
    if (!error) {
      await supabase
        .from('profiles')
        .update({ payout_provider: method, payout_number: number })
        .eq('id', user.id);
      await refreshProfile();
    }
    setSaving(false);
    if (error || !data) {
      toast({
        title: 'Could not save payout account',
        description: error?.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: existing ? 'Payout account updated' : 'Payout account saved' });
    navigate('/creator/earnings');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-5 md:px-10 py-8 md:py-12 flex flex-col gap-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {existing ? 'Edit payout account' : 'Set up payouts'}
          </h1>
          <p className="text-muted-foreground">
            Choose a country and payout method once. We send earnings there automatically.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label>Country</Label>
              <FilterSelect
                value={country}
                onChange={applyCountry}
                ariaLabel="Country"
                inactiveValue=""
                placeholder="Select country"
                fullWidth
                searchable
                searchPlaceholder="Filter countries"
                showLeadingOnTrigger={false}
                options={countryOptions}
              />
            </div>

            {country ? (
              <div className="flex flex-col gap-2">
                <Label>Payout method</Label>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {methods.map((id) => {
                    const selected = method === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMethod(id)}
                        className={cn(
                          'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold outline-none transition-shadow hover:shadow-md',
                          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          selected
                            ? 'border-transparent bg-primary text-primary-foreground'
                            : 'border-[#dddddd] bg-white text-foreground',
                        )}
                      >
                        <PayoutMethodLogo method={id} />
                        {methodLabel(id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="payout-number">Mobile money number</Label>
              <Input
                id="payout-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={dial ? `${dial} 77 000 0000` : '07…'}
              />
            </div>

            <div>
              <Button variant="invofy" size="invofy" className="max-md:w-full" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {existing ? 'Save changes' : 'Save payout account'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorPayoutAccount;
