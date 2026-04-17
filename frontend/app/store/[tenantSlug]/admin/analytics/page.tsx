import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/shared/stat-card';
import { DollarSign, ShoppingCart, Users, TrendingUp, Package, ChartBar as BarChart3 } from 'lucide-react';

interface Props {
  params: { tenantSlug: string };
}

export default async function AnalyticsPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  const tenantId = session.tenant.id;

  const [
    { data: orders },
    { count: customerCount },
    { count: productCount },
  ] = await Promise.all([
    supabase.from('orders').select('total_amount, payment_status, status, created_at').eq('tenant_id', tenantId),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
  ]);

  const paidOrders = (orders ?? []).filter(o => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total_amount, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const now = new Date();
  const last30 = new Date(now); last30.setDate(now.getDate() - 30);
  const prev30 = new Date(last30); prev30.setDate(last30.getDate() - 30);

  const recentRevenue = paidOrders
    .filter(o => new Date(o.created_at) >= last30)
    .reduce((s, o) => s + o.total_amount, 0);
  const prevRevenue = paidOrders
    .filter(o => new Date(o.created_at) >= prev30 && new Date(o.created_at) < last30)
    .reduce((s, o) => s + o.total_amount, 0);
  const revGrowth = prevRevenue > 0 ? Math.round(((recentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

  const statusCounts = (orders ?? []).reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Performance overview for {session.tenant.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign}
          iconColor="text-emerald-600" iconBg="bg-emerald-50"
          trend={{ value: revGrowth, label: 'vs prev 30 days' }} />
        <StatCard title="Total Orders" value={(orders ?? []).length} icon={ShoppingCart}
          iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard title="Avg. Order Value" value={`$${avgOrderValue.toFixed(2)}`} icon={TrendingUp}
          iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Total Customers" value={customerCount ?? 0} icon={Users}
          iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center gap-2">
            <BarChart3 size={16} className="text-muted-foreground" />
            <h3 className="font-semibold">Orders by Status</h3>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const total = (orders ?? []).length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const colors: Record<string, string> = {
                delivered: 'bg-emerald-500',
                shipped: 'bg-blue-500',
                processing: 'bg-sky-400',
                pending: 'bg-amber-400',
                cancelled: 'bg-red-400',
              };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize font-medium text-foreground">{status}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status] ?? 'bg-slate-400'} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center gap-2">
            <TrendingUp size={16} className="text-muted-foreground" />
            <h3 className="font-semibold">Revenue Summary</h3>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'Last 30 days', value: `$${recentRevenue.toFixed(2)}` },
              { label: 'Previous 30 days', value: `$${prevRevenue.toFixed(2)}` },
              { label: 'All-time revenue', value: `$${totalRevenue.toFixed(2)}` },
              { label: 'Avg. order value', value: `$${avgOrderValue.toFixed(2)}` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
