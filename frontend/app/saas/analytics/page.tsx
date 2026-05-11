import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { resolvePlatformCurrency } from '@/lib/currency-server';
import { formatPrice } from '@/lib/currency';
import { StatCard } from '@/components/shared/stat-card';
import { BarChart3, DollarSign, ShoppingCart, Building2, TrendingUp } from 'lucide-react';

export const metadata = { title: 'Platform Analytics' };
export const dynamic = 'force-dynamic';

async function getAnalytics() {
  const admin = getSupabaseServiceClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [ordersRes, tenantsRes, productsRes, customersRes] = await Promise.all([
    admin.from('orders').select('id, tenant_id, total_amount, status, created_at'),
    admin.from('tenants').select('id, name, slug, plan, status, created_at').neq('id', '00000000-0000-0000-0000-000000000000'),
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('customers').select('id', { count: 'exact', head: true }),
  ]);

  const orders = (ordersRes.data ?? []).filter((o: any) => o.status !== 'cancelled' && o.status !== 'refunded');
  const tenants = tenantsRes.data ?? [];

  const gmv = orders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);
  const last30Orders = orders.filter((o: any) => new Date(o.created_at) >= thirtyDaysAgo);
  const last30Gmv = last30Orders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);

  // Revenue per tenant
  const revenueByTenant = new Map<string, number>();
  const ordersByTenant = new Map<string, number>();
  orders.forEach((o: any) => {
    revenueByTenant.set(o.tenant_id, (revenueByTenant.get(o.tenant_id) ?? 0) + Number(o.total_amount ?? 0));
    ordersByTenant.set(o.tenant_id, (ordersByTenant.get(o.tenant_id) ?? 0) + 1);
  });

  const topTenants = tenants
    .map((t) => ({
      ...t,
      revenue: revenueByTenant.get(t.id) ?? 0,
      orders: ordersByTenant.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Daily revenue last 30 days
  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o: any) => o.created_at.slice(0, 10) === key);
    days.push({
      date: key,
      revenue: dayOrders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0),
      orders: dayOrders.length,
    });
  }

  const maxDay = Math.max(...days.map((d) => d.revenue), 1);

  // Plan distribution
  const planCounts = tenants.reduce((acc: Record<string, number>, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  return {
    gmv,
    last30Gmv,
    orderCount: orders.length,
    tenantCount: tenants.length,
    productCount: productsRes.count ?? 0,
    customerCount: customersRes.count ?? 0,
    topTenants,
    days,
    maxDay,
    planCounts,
  };
}

export default async function AnalyticsPage() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const [a, currency] = await Promise.all([getAnalytics(), resolvePlatformCurrency()]);

  return (
    <div className="animate-in" data-testid="saas-analytics-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cross-tenant performance over the last 30 days
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="GMV (all time)" value={formatPrice(a.gmv, currency)} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="GMV (30 days)" value={formatPrice(a.last30Gmv, currency)} icon={TrendingUp} iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard title="Total orders" value={a.orderCount} icon={ShoppingCart} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Tenants" value={a.tenantCount} icon={Building2} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Daily revenue · last 30 days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sum of completed order totals per day</p>
          </div>
          <BarChart3 size={18} className="text-muted-foreground" />
        </div>
        <div className="flex items-end gap-1 h-48">
          {a.days.map((d) => {
            const h = Math.max((d.revenue / a.maxDay) * 100, 2);
            return (
              <div
                key={d.date}
                className="flex-1 group relative flex flex-col items-center justify-end"
                title={`${d.date}: ${formatPrice(d.revenue, currency)} · ${d.orders} orders`}
              >
                <div
                  className="w-full bg-sky-500/80 hover:bg-sky-500 rounded-t transition-all"
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>{a.days[0]?.date}</span>
          <span>{a.days[a.days.length - 1]?.date}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold text-foreground">Top 10 tenants by revenue</h3>
          </div>
          <div className="divide-y">
            {a.topTenants.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">No orders yet across any tenant.</p>
            )}
            {a.topTenants.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">/{t.slug} · {t.orders} orders</p>
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatPrice(t.revenue, currency)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">Plan distribution</h3>
          <div className="space-y-3">
            {(['enterprise', 'professional', 'starter', 'free'] as const).map((plan) => {
              const count = a.planCounts[plan] ?? 0;
              const pct = a.tenantCount === 0 ? 0 : Math.round((count / a.tenantCount) * 100);
              const colors: Record<string, string> = {
                enterprise: 'bg-amber-500',
                professional: 'bg-blue-500',
                starter: 'bg-sky-400',
                free: 'bg-slate-300',
              };
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{plan}</span>
                    <span className="text-muted-foreground">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${colors[plan]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
