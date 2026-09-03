import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { formatMoney, formatRate } from '@/lib/format';

const NewCampaign = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    topic: '',
    angle: '',
    must_include: '',
    avoid: '',
    hashtags: '',
    disclosure: '#ad',
    budget: '',
    rate: '',
    deadline: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const budget = Number(form.budget) || 0;
  const rate = Number(form.rate) || 0;
  const estimatedViews = rate > 0 ? Math.floor((budget / rate) * 1000) : 0;

  const validate = () => {
    if (!form.title.trim()) return 'Give the campaign a title.';
    if (!form.topic.trim()) return 'Describe what creators should cover.';
    if (budget <= 0) return 'Set a budget above zero.';
    if (rate <= 0) return 'Set a rate per 1,000 views above zero.';
    if (!form.deadline) return 'Pick a deadline.';
    return null;
  };

  const saveDraft = async () => {
    const error = validate();
    if (error || !user) {
      if (error) toast({ title: 'Almost there', description: error, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        brand_id: user.id,
        brand_name: profile?.company_name || profile?.full_name || 'A brand on Unignored',
        title: form.title.trim(),
        topic: form.topic.trim(),
        angle: form.angle.trim(),
        must_include: form.must_include.trim(),
        avoid: form.avoid.trim(),
        hashtags: form.hashtags.trim(),
        disclosure: form.disclosure.trim() || '#ad',
        budget,
        rate_per_1k: rate,
        deadline: form.deadline,
        status: 'draft',
      })
      .select('id')
      .maybeSingle();
    setSaving(false);
    if (insertError || !data) {
      toast({ title: 'Could not save the campaign', description: insertError?.message, variant: 'destructive' });
      return;
    }
    setDraftId((data as { id: string }).id);
    setStep(2);
  };

  const fundCampaign = async () => {
    if (!draftId) return;
    setSaving(true);
    const { error } = await supabase.rpc('fund_campaign', { p_campaign_id: draftId });
    setSaving(false);
    if (error) {
      toast({ title: 'Funding failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Campaign funded and live',
      description: `${formatMoney(budget)} is in escrow. Creators can see it now.`,
    });
    navigate(`/brand/campaigns/${draftId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12">
        <Link to="/brand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        {step === 1 ? (
          <>
            <h1 className="font-display text-4xl font-bold mb-2">Write the brief</h1>
            <p className="text-muted-foreground mb-10">
              The brief is the contract. Creators execute it in their own voice — you review every submission before it earns.
            </p>

            <div className="flex flex-col gap-6 bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Campaign title</Label>
                <Input id="title" value={form.title} onChange={set('title')} placeholder="Sparkling Yuzu Soda — Summer Push" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="topic">Topic — what should the video cover?</Label>
                <Textarea id="topic" value={form.topic} onChange={set('topic')} placeholder="Taste-test the new Sparkling Yuzu Soda and react honestly." />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="angle">Angle — how should it feel?</Label>
                <Textarea id="angle" value={form.angle} onChange={set('angle')} placeholder="First-sip reaction, no script, outdoors or in a kitchen." />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="must_include">Must include</Label>
                <Textarea id="must_include" value={form.must_include} onChange={set('must_include')} placeholder="Show the can clearly, mention it has 40% less sugar." />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="avoid">Avoid</Label>
                <Textarea id="avoid" value={form.avoid} onChange={set('avoid')} placeholder="No energy-drink comparisons, no health claims." />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="hashtags">Required hashtags</Label>
                  <Input id="hashtags" value={form.hashtags} onChange={set('hashtags')} placeholder="#sparklingyuzu" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="disclosure">Ad disclosure</Label>
                  <Input id="disclosure" value={form.disclosure} onChange={set('disclosure')} placeholder="#ad" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input id="budget" type="number" min="0" step="1" value={form.budget} onChange={set('budget')} placeholder="500" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rate">Rate per 1,000 views (USD)</Label>
                  <Input id="rate" type="number" min="0" step="0.05" value={form.rate} onChange={set('rate')} placeholder="1.50" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" type="date" value={form.deadline} onChange={set('deadline')} />
                </div>
              </div>
              {estimatedViews > 0 && (
                <p className="text-sm text-muted-foreground">
                  At {formatMoney(rate)} per 1,000 views, {formatMoney(budget)} buys about{' '}
                  <span className="font-semibold text-foreground">{estimatedViews.toLocaleString()} views</span>.
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                <Button variant="invofy" size="invofy" onClick={saveDraft} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Continue to funding
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold mb-2">Fund the campaign</h1>
            <p className="text-muted-foreground mb-10">
              The full budget goes into escrow before creators see anything. You never pay more than you funded, and unspent budget comes back to you.
            </p>

            <div className="bg-[#fafafa] border border-[#f1f1f1] rounded-[30px] p-8 flex flex-col gap-5 mb-8">
              {[
                ['Campaign', form.title],
                ['Budget (escrowed upfront)', formatMoney(budget)],
                ['Rate', formatRate(rate)],
                ['Estimated reach', `${estimatedViews.toLocaleString()} views`],
                ['Deadline', form.deadline],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-dashed border-[#e9e9e9] pb-4 last:border-0 last:pb-0">
                  <span className="text-muted-foreground text-sm">{label}</span>
                  <span className="font-semibold text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 bg-white border border-[#f1f1f1] rounded-[30px] p-6 mb-8">
              <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                The budget is held in escrow the moment you fund. Earnings accrue only against verified views, capped at the remaining budget. If the campaign closes with money left, it's refunded.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button variant="invofy" size="invofy" onClick={fundCampaign} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Fund {formatMoney(budget)} & publish
              </Button>
              <Button variant="invofyOutline" size="invofy" asChild>
                <Link to={draftId ? `/brand/campaigns/${draftId}` : '/brand'}>Save as draft</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NewCampaign;
