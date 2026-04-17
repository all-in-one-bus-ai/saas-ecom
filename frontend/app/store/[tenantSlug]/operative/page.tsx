import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CircleCheck as CheckCircle, Package, ArrowRight } from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/orders';
import Link from 'next/link';

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

export default async function OperativeDashboard({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager', 'operative']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  const tenantId = session.tenant.id;

  const { data: myOrders } = await supabase
    .from('orders')
    .select(`*, customers(full_name, email)`)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(10);

  const { count: pendingCount } = await supabase
    .from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending');

  const { count: processingCount } = await supabase
    .from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'processing');

  const { data: lowStock } = await supabase
    .from('product_variants')
    .select('sku, stock_qty, products!inner(name)')
    .eq('tenant_id', tenantId)
    .lte('stock_qty', 3)
    .order('stock_qty', { ascending: true })
    .limit(5);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Work Queue</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Good day, {session.user.profile?.full_name ?? session.user.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Pending Orders" value={pendingCount ?? 0} icon={Clock}
          iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Processing" value={processingCount ?? 0} icon={Package}
          iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard title="Critical Stock" value={lowStock?.length ?? 0} icon={ShoppingCart}
          iconColor="text-red-600" iconBg="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold">Orders Needing Attention</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Pending and processing orders to action</p>
          </div>
          <div className="divide-y">
            {(myOrders ?? []).length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              (myOrders ?? []).map((order) => {
                const customer = order.customers as { full_name: string; email: string } | null;
                return (
                  <div key={order.id} className="data-table-row px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
                          <span className={ORDER_STATUS_BADGE[order.status] ?? ''}>{order.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {customer?.full_name ?? customer?.email ?? 'Guest'} — ${order.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {order.status === 'pending' && (
                          <form action={async () => {
                            'use server';
                            const fd = new FormData();
                            fd.append('status', 'processing');
                            await updateOrderStatus(tenantSlug, order.id, fd);
                          }}>
                            <Button type="submit" size="sm" variant="outline" className="text-xs h-7">
                              Mark Processing
                            </Button>
                          </form>
                        )}
                        {order.status === 'processing' && (
                          <form action={async () => {
                            'use server';
                            const fd = new FormData();
                            fd.append('status', 'shipped');
                            await updateOrderStatus(tenantSlug, order.id, fd);
                          }}>
                            <Button type="submit" size="sm" className="text-xs h-7 bg-sky-600 hover:bg-sky-500 text-white">
                              Mark Shipped
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold">Critical Stock</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Items with 3 or fewer units left</p>
          </div>
          <div className="divide-y">
            {(lowStock ?? []).length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All inventory looks good!</p>
              </div>
            ) : (
              (lowStock ?? []).map((v) => {
                const prod = v.products as { name: string };
                return (
                  <div key={v.sku} className="data-table-row flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{prod?.name}</p>
                      <p className="text-xs text-muted-foreground">{v.sku}</p>
                    </div>
                    <span className={`text-sm font-bold ${v.stock_qty === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {v.stock_qty === 0 ? 'OUT' : `${v.stock_qty} left`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {(lowStock ?? []).length > 0 && (
            <div className="p-4 border-t">
              <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
                <Link href={`/store/${tenantSlug}/operative/inventory`}>
                  Manage Inventory <ArrowRight size={13} />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
