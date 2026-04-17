import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, Users, DollarSign, Plus, ArrowRight, TrendingUp, Clock, CircleCheck as CheckCircle, Truck } from 'lucide-react';

interface Props {
  params: { tenantSlug: string };
}

async function getStoreStats(tenantId: string) {
  const supabase = getSupabaseServerClient();

  const [
    { count: orderCount },
    { count: productCount },
    { count: customerCount },
    { data: recentOrders },
    { data: lowStockVariants },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders')
      .select('id, order_number, status, total_amount, created_at, customers(full_name, email)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('product_variants')
      .select('id, sku, stock_qty, low_stock_threshold, products!inner(name)')
      .eq('tenant_id', tenantId)
      .lte('stock_qty', 10)
      .order('stock_qty', { ascending: true })
      .limit(5),
  ]);

  const { data: revenueData } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'paid');

  const totalRevenue = (revenueData ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  return {
    orderCount: orderCount ?? 0,
    productCount: productCount ?? 0,
    customerCount: customerCount ?? 0,
    totalRevenue,
    recentOrders: recentOrders ?? [],
    lowStockVariants: lowStockVariants ?? [],
  };
}

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-status-pending',
  processing: 'badge-status-shipped',
  shipped: 'badge-status-shipped',
  delivered: 'badge-status-active',
  cancelled: 'badge-status-cancelled',
};

export default async function StoreAdminDashboard({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const stats = await getStoreStats(session.tenant.id);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Store Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {session.user.profile?.full_name ?? session.user.email}
          </p>
        </div>
        <Button asChild className="bg-sky-600 hover:bg-sky-500 text-white gap-2">
          <Link href={`/store/${tenantSlug}/admin/products/new`}>
            <Plus size={16} /> Add Product
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={{ value: 18, label: 'vs last month' }}
        />
        <StatCard
          title="Total Orders"
          value={stats.orderCount}
          icon={ShoppingCart}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatCard
          title="Products"
          value={stats.productCount}
          icon={Package}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Customers"
          value={stats.customerCount}
          icon={Users}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: 5, label: 'vs last month' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recent Orders</h3>
            <Button variant="ghost" size="sm" asChild className="text-sky-600 hover:text-sky-700 gap-1">
              <Link href={`/store/${tenantSlug}/admin/orders`}>
                View all <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
          <div className="divide-y">
            {stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              stats.recentOrders.map((order) => {
                const customer = order.customers as unknown as { full_name: string; email: string } | null;
                return (
                  <div key={order.id} className="data-table-row flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <ShoppingCart size={14} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer?.full_name ?? customer?.email ?? 'Guest'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={ORDER_STATUS_BADGE[order.status] ?? ''}>
                        {order.status}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        ${(order.total_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { href: `/store/${tenantSlug}/admin/products/new`, label: 'Add product', icon: Package },
                { href: `/store/${tenantSlug}/admin/orders`, label: 'View orders', icon: ShoppingCart },
                { href: `/store/${tenantSlug}/admin/customers`, label: 'Manage customers', icon: Users },
                { href: `/store/${tenantSlug}/admin/theme`, label: 'Customize theme', icon: TrendingUp },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium text-foreground"
                  >
                    <Icon size={15} className="text-muted-foreground" />
                    {action.label}
                    <ArrowRight size={13} className="ml-auto text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-foreground">Low Stock</h3>
            </div>
            <div className="divide-y">
              {stats.lowStockVariants.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">All inventory healthy</div>
              ) : (
                stats.lowStockVariants.slice(0, 3).map((v) => {
                  const prod = v.products as unknown as { name: string };
                  return (
                    <div key={v.id} className="data-table-row flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{prod?.name}</p>
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
    </div>
  );
}
