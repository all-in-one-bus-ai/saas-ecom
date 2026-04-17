import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { updateOrderStatus } from '@/lib/actions/orders';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface Props {
  params: { tenantSlug: string };
}

const ORDER_BADGE: Record<string, string> = {
  pending: 'badge-status-pending',
  processing: 'badge-status-shipped',
  shipped: 'badge-status-shipped',
  delivered: 'badge-status-active',
  cancelled: 'badge-status-cancelled',
};

export default async function ManagerOrdersPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  const { data: orders } = await supabase
    .from('orders')
    .select(`*, customers(full_name, email), order_items(id)`)
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{(orders ?? []).length} orders total</p>
        </div>
      </div>

      {(orders ?? []).length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders yet" description="Orders will appear here." />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders!.map((order) => {
                const customer = order.customers as { full_name: string; email: string } | null;
                return (
                  <tr key={order.id} className="data-table-row">
                    <td className="px-5 py-3.5 font-medium text-foreground">{order.order_number}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium">{customer?.full_name ?? 'Guest'}</p>
                      <p className="text-xs text-muted-foreground">{customer?.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold">${order.total_amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={ORDER_BADGE[order.status] ?? ''}>{order.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        {order.status === 'pending' && (
                          <form action={async () => {
                            'use server';
                            const fd = new FormData();
                            fd.append('status', 'processing');
                            await updateOrderStatus(tenantSlug, order.id, fd);
                          }}>
                            <Button type="submit" size="sm" variant="outline" className="text-xs h-7">
                              Process
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
                              Ship
                            </Button>
                          </form>
                        )}
                      </div>
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
