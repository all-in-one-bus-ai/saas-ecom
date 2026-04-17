import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface Props {
  params: { tenantSlug: string };
  searchParams: { status?: string };
}

const STATUS_TABS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-status-pending',
  processing: 'badge-status-shipped',
  shipped: 'badge-status-shipped',
  delivered: 'badge-status-active',
  cancelled: 'badge-status-cancelled',
  refunded: 'bg-slate-50 text-slate-600 border border-slate-200 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
};

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  paid: 'text-emerald-600 font-medium',
  unpaid: 'text-amber-600 font-medium',
  failed: 'text-red-600 font-medium',
  refunded: 'text-slate-500',
};

export default async function OrdersPage({ params, searchParams }: Props) {
  const { tenantSlug } = params;
  const filterStatus = searchParams.status;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('orders')
    .select(`
      *,
      customers(full_name, email),
      order_items(id, product_name, quantity)
    `)
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded');
  }

  const { data: orders } = await query;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{(orders ?? []).length} orders</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/store/${tenantSlug}/admin/orders${tab !== 'all' ? `?status=${tab}` : ''}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              (filterStatus ?? 'all') === tab
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      {(orders ?? []).length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders found"
          description={filterStatus ? `No ${filterStatus} orders.` : 'Orders will appear here when customers place them.'}
          action={filterStatus ? { label: 'View all orders', onClick: () => {} } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders!.map((order) => {
                const customer = order.customers as { full_name: string; email: string } | null;
                const items = order.order_items as { id: string; product_name: string; quantity: number }[] | null;
                return (
                  <tr key={order.id} className="data-table-row">
                    <td className="px-5 py-3.5 font-medium text-foreground">{order.order_number}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{customer?.full_name ?? 'Guest'}</p>
                        <p className="text-xs text-muted-foreground">{customer?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{(items ?? []).length} item(s)</td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">${order.total_amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={ORDER_STATUS_BADGE[order.status] ?? ''}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={PAYMENT_STATUS_STYLE[order.payment_status] ?? 'text-muted-foreground'}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/store/${tenantSlug}/admin/orders/${order.id}`}>
                          View <ArrowRight size={13} className="ml-1" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
