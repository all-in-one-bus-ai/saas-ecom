import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { suspendTenant, activateTenant } from '@/lib/actions/tenants';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink, Plus, PowerOff, Power } from 'lucide-react';

export const metadata = { title: 'Tenants' };

async function getTenants() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'badge-status-active',
  suspended: 'badge-status-cancelled',
  pending: 'badge-status-pending',
  cancelled: 'bg-slate-50 text-slate-600 border border-slate-200 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
};

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  starter: 'bg-sky-100 text-sky-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

export default async function TenantsPage() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const tenants = await getTenants();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tenants</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{tenants.length} registered stores</p>
        </div>
        <Button asChild className="bg-sky-600 hover:bg-sky-500 text-white gap-2">
          <Link href="/saas/tenants/new">
            <Plus size={16} /> New Tenant
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Building2 size={32} className="text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No tenants yet. Create your first store.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="data-table-row">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-medium text-foreground">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">/{tenant.slug}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${PLAN_STYLES[tenant.plan] ?? ''}`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={STATUS_STYLES[tenant.status] ?? ''}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${tenant.slug}`} target="_blank">
                          <ExternalLink size={14} />
                        </Link>
                      </Button>
                      {tenant.status === 'active' ? (
                        <form action={suspendTenant.bind(null, tenant.id)}>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" type="submit">
                            <PowerOff size={14} />
                          </Button>
                        </form>
                      ) : (
                        <form action={activateTenant.bind(null, tenant.id)}>
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" type="submit">
                            <Power size={14} />
                          </Button>
                        </form>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/saas/tenants/${tenant.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
