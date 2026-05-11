'use client';

import { useState, useTransition } from 'react';
import { Check, Sparkles, Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveTenantStripeKeys } from '@/lib/actions/tenant-billing';

const PLANS = [
  { plan: 'free', name: 'Free', price: 0, features: ['1 storefront', '25 products', 'Basic analytics'] },
  { plan: 'starter', name: 'Starter', price: 29, features: ['500 products', 'Custom theme', 'Email support'] },
  { plan: 'professional', name: 'Professional', price: 99, features: ['Unlimited products', 'Staff & roles', 'Connect your Stripe'] },
  { plan: 'enterprise', name: 'Enterprise', price: 299, features: ['Multiple storefronts', 'White-label', 'SLA'] },
];

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  starter: 'bg-sky-100 text-sky-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

interface Props {
  tenantId: string;
  tenantSlug: string;
  currentPlan: string;
  subscriptionStatus: string | null;
  hasOwnStripe: boolean;
  publishableKey: string;
  recentOrders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    payment_status: string;
    status: string;
    created_at: string;
  }>;
}

export function BillingClient({
  tenantId,
  tenantSlug,
  currentPlan,
  subscriptionStatus,
  hasOwnStripe,
  publishableKey,
  recentOrders,
}: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripePk, setStripePk] = useState(publishableKey);
  const [stripeSk, setStripeSk] = useState('');
  const [savingKeys, startSavingKeys] = useTransition();
  const [keyMsg, setKeyMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  async function upgrade(plan: string) {
    setError(null);
    if (plan === currentPlan) return;
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/payments/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          plan,
          origin_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'Failed to start checkout');
      setLoadingPlan(null);
    }
  }

  function saveKeys(e: React.FormEvent) {
    e.preventDefault();
    setKeyMsg(null);
    const fd = new FormData();
    fd.set('tenant_id', tenantId);
    fd.set('stripe_publishable_key', stripePk);
    if (stripeSk) fd.set('stripe_secret_key', stripeSk);

    startSavingKeys(async () => {
      const res = await saveTenantStripeKeys(fd);
      if (res?.error) setKeyMsg({ error: res.error });
      else {
        setKeyMsg({ ok: true });
        setStripeSk('');
      }
    });
  }

  return (
    <>
      <div
        className="rounded-xl border bg-white shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        data-testid="current-plan-card"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[currentPlan] ?? ''}`}>
              {currentPlan}
            </span>
            {subscriptionStatus && (
              <span className="text-xs text-muted-foreground capitalize">· {subscriptionStatus}</span>
            )}
          </div>
          <h3 className="text-lg font-semibold">You&apos;re on the {currentPlan} plan</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentPlan === 'enterprise'
              ? 'You have access to every feature.'
              : 'Upgrade to unlock more features and higher limits.'}
          </p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700" data-testid="upgrade-error">
            {error}
          </div>
        )}
      </div>

      <h3 className="font-semibold mb-3">Plans</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLANS.map((p) => {
          const isCurrent = p.plan === currentPlan;
          return (
            <div
              key={p.plan}
              className={`rounded-xl border p-5 bg-white shadow-sm flex flex-col ${isCurrent ? 'border-sky-400 ring-2 ring-sky-100' : ''}`}
              data-testid={`billing-plan-${p.plan}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{p.name}</h4>
                {isCurrent && (
                  <span className="text-[10px] font-bold tracking-wider uppercase text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold tracking-tight">${p.price}</span>
                <span className="text-xs text-muted-foreground ml-1">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs">
                    <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => upgrade(p.plan)}
                disabled={isCurrent || loadingPlan !== null || p.plan === 'free'}
                size="sm"
                variant={isCurrent ? 'outline' : 'default'}
                className={isCurrent ? '' : 'bg-sky-600 hover:bg-sky-500 text-white'}
                data-testid={`upgrade-to-${p.plan}`}
              >
                {isCurrent ? 'Current plan' : p.plan === 'free' ? 'Free' : loadingPlan === p.plan ? 'Redirecting…' : 'Upgrade'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={saveKeys}
          className="lg:col-span-2 rounded-xl border bg-white shadow-sm p-6"
          data-testid="stripe-keys-form"
        >
          <div className="flex items-start gap-2 mb-4">
            <Key size={16} className="text-amber-600 mt-1" />
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Your Stripe keys{' '}
                {hasOwnStripe && (
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                    Configured
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your own Stripe account so customer payments go directly to you. Available on
                Professional &amp; Enterprise. Leave blank to keep using the platform&apos;s test key.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pk" className="text-xs">
                Publishable key
              </Label>
              <Input
                id="pk"
                value={stripePk}
                onChange={(e) => setStripePk(e.target.value)}
                placeholder="pk_live_..."
                className="mt-1 font-mono text-xs"
                data-testid="stripe-pk-input"
              />
            </div>

            <div>
              <Label htmlFor="sk" className="text-xs">
                Secret key {hasOwnStripe && <span className="text-muted-foreground">(leave blank to keep current)</span>}
              </Label>
              <Input
                id="sk"
                type="password"
                value={stripeSk}
                onChange={(e) => setStripeSk(e.target.value)}
                placeholder="sk_live_..."
                className="mt-1 font-mono text-xs"
                data-testid="stripe-sk-input"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Stored encrypted at rest. Used by the platform when creating shopper checkout sessions
                for /{tenantSlug}.
              </p>
            </div>
          </div>

          {keyMsg?.error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700" data-testid="stripe-key-error">
              {keyMsg.error}
            </div>
          )}
          {keyMsg?.ok && (
            <div className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700" data-testid="stripe-key-success">
              Stripe keys saved.
            </div>
          )}

          <Button
            type="submit"
            disabled={savingKeys}
            size="sm"
            className="mt-5 bg-sky-600 hover:bg-sky-500 text-white gap-2"
            data-testid="save-stripe-keys"
          >
            <Save size={14} /> {savingKeys ? 'Saving…' : 'Save Stripe keys'}
          </Button>
        </form>

        <div className="rounded-xl border bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-amber-500" />
            <h3 className="font-semibold text-sm">Recent invoices</h3>
          </div>
          {recentOrders.length === 0 && (
            <p className="text-xs text-muted-foreground">No orders yet.</p>
          )}
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-1.5 text-xs">
                <div>
                  <p className="font-medium text-foreground">{o.order_number}</p>
                  <p className="text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()} · {o.status}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">${Number(o.total_amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
