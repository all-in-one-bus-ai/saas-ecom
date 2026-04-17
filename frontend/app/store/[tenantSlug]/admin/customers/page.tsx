import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface Props {
  params: { tenantSlug: string };
}

export default async function CustomersPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{(customers ?? []).length} customers</p>
        </div>
      </div>

      {(customers ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers will appear here when they place their first order."
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers!.map((c) => (
                <tr key={c.id} className="data-table-row">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{c.full_name || 'Guest'}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-foreground font-medium">{c.total_orders}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">${c.total_spent.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
