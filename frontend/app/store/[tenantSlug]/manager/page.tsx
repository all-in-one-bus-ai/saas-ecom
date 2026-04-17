import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Warehouse, Users, DollarSign, Clock, ArrowRight, TriangleAlert as AlertTriangle } from 'lucide-react';

interface Props {
  params: { tenantSlug: string };
}

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-status-pending',
  processing: 'badge-status-shipped',
  shipped: 'badge-status-shipped',
  delivered: 'badge-status-active',
  cancelled: 'badge-status-cancelled',
};

export default async function ManagerDashboard({ params }: Props) {
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
    { data: pendingOrders },
    { data: recentOrders },
    { count: customerCount },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from('orders').select('id').eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('orders')
      .select('*, customers(full_name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('product_variants')
      .select('sku, stock_qty, products!inner(name)')
      .eq('tenant_id', tenantId)
      .lt('stock_qty', 6)
      .order('stock_qty', { ascending: true })
      .limit(5),
  ]);

  const { data: revenueData } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'paid');
  const totalRevenue = (revenueData ?? []).reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manager Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Operations overview for {session.tenant.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Pending Orders" value={pendingOrders?.length ?? 0} icon={Clock}
          iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign}
          iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Customers" value={customerCount ?? 0} icon={Users}
          iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard title="Low Stock Items" value={lowStock?.length ?? 0} icon={AlertTriangle}
          iconColor="text-red-600" iconBg="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold">Recent Orders</h3>
            <Button variant="ghost" size="sm" asChild className="text-sky-600 gap-1">
              <Link href={`/store/${tenantSlug}/manager/orders`}>View all <ArrowRight size={13} /></Link>
            </Button>
          </div>
          <div className="divide-y">
            {(recentOrders ?? []).map((order) => {
              const customer = order.customers as { full_name: string } | null;
              return (
                <div key={order.id} className="data-table-row flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{customer?.full_name ?? 'Guest'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={ORDER_STATUS_BADGE[order.status] ?? ''}>{order.status}</span>
                    <span className="text-sm font-semibold">${order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Low Stock Alert
            </h3>
          </div>
          <div className="divide-y">
            {(lowStock ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">All good!</p>
            ) : (
              (lowStock ?? []).map((v) => {
                const prod = v.products as { name: string };
                return (
                  <div key={v.sku} className="data-table-row flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-foreground">{prod?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{v.sku}</p>
                    </div>
                    <span className={`text-xs font-bold ${v.stock_qty === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {v.stock_qty} left
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
