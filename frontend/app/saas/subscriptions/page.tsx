import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { resolvePlatformCurrency } from '@/lib/currency-server';
import { formatPrice } from '@/lib/currency';
import { StatCard } from '@/components/shared/stat-card';
import { DollarSign, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

export const metadata = { title: 'Subscriptions' };
export const dynamic = 'force-dynamic';

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 29,
  professional: 99,
  enterprise: 299,
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-sky-100 text-sky-700',
  past_due: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
  incomplete: 'bg-red-100 text-red-700',
};

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  starter: 'bg-sky-100 text-sky-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

async function getSubscriptionData() {
  const admin = getSupabaseServiceClient();

  const [subsRes, tenantsRes] = await Promise.all([
    admin.from('subscriptions').select('*').order('created_at', { ascending: false }),
    admin.from('tenants').select('id, name, slug, plan, status, created_at').neq('id', '00000000-0000-0000-0000-000000000000'),
  ]);

  const subs = subsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  // Build rows: one per tenant, enriched with subscription if any
  const rows = tenants.map((t) => {
    const sub = subs.find((s: any) => s.tenant_id === t.id);
    return {
      tenant: t,
      subscription: sub,
      mrr: PLAN_PRICES[t.plan] ?? 0,
      status: sub?.status ?? (t.plan === 'free' ? 'free' : 'active'),
    };
  });

  const totalMRR = rows.reduce((sum, r) => sum + (r.mrr ?? 0), 0);
  const paidCount = rows.filter((r) => (r.mrr ?? 0) > 0).length;
  const pastDue = subs.filter((s: any) => s.status === 'past_due').length;
  const arr = totalMRR * 12;

  return { rows, totalMRR, arr, paidCount, pastDue };
}

export default async function SubscriptionsPage() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const { rows, totalMRR, arr, paidCount, pastDue } = await getSubscriptionData();
  const currency = await resolvePlatformCurrency();

  return (
    <div className="animate-in" data-testid="saas-subscriptions-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscriptions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Billing and subscription status across all tenants
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="MRR" value={formatPrice(totalMRR, currency)} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="ARR" value={formatPrice(arr, currency)} icon={TrendingUp} iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard title="Paying tenants" value={paidCount} icon={CreditCard} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard
          title="Past due"
          value={pastDue}
          icon={AlertCircle}
          iconColor={pastDue > 0 ? 'text-red-600' : 'text-slate-400'}
          iconBg={pastDue > 0 ? 'bg-red-50' : 'bg-slate-50'}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">MRR</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stripe customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next renewal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tenant.id} className="data-table-row">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-foreground">{r.tenant.name}</p>
                  <p className="text-xs text-muted-foreground">/{r.tenant.slug}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${PLAN_STYLES[r.tenant.plan] ?? ''}`}>
                    {r.tenant.plan}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-medium">
                  {r.mrr > 0 ? `${formatPrice(r.mrr, currency)}/mo` : '—'}
                </td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                  {r.subscription?.stripe_customer_id ?? '—'}
                </td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground">
                  {r.subscription?.current_period_end
                    ? new Date(r.subscription.current_period_end).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  No tenants yet. Subscriptions will appear once tenants sign up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border bg-slate-50/50 p-4 text-xs text-muted-foreground">
        MRR and renewal data shown here are derived from each tenant&apos;s plan and the{' '}
        <code className="font-mono">subscriptions</code> table. Connect Stripe to keep these values in
        sync automatically (webhook handlers can populate the <code className="font-mono">subscriptions</code> rows).
      </div>
    </div>
  );
}
