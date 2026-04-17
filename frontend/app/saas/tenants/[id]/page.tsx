import { redirect, notFound } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getTenantDetail } from '@/lib/actions/saas-tenants-extra';
import { updateTenant } from '@/lib/actions/tenants';
import { deleteTenant } from '@/lib/actions/saas-tenants-extra';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Users as UsersIcon,
  DollarSign,
  ShoppingCart,
  ArrowLeft,
  ExternalLink,
  Trash2,
  UserCog,
} from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';

export const metadata = { title: 'Tenant detail' };
export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

const STATUS_STYLES: Record<string, string> = {
  active: 'badge-status-active',
  suspended: 'badge-status-cancelled',
  pending: 'badge-status-pending',
  cancelled: 'bg-slate-50 text-slate-600 border border-slate-200 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
};

const ROLE_COLORS: Record<string, string> = {
  store_admin: 'bg-sky-100 text-sky-700',
  manager: 'bg-emerald-100 text-emerald-700',
  operative: 'bg-slate-100 text-slate-700',
};

export default async function TenantDetailPage({ params }: Props) {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const res = await getTenantDetail(params.id);
  if (res.error || !res.data) notFound();

  const { tenant, productCount, customerCount, recentOrders, totalRevenue, memberships } = res.data;

  async function onUpdate(formData: FormData) {
    'use server';
    await updateTenant(tenant.id, formData);
  }

  async function onDelete() {
    'use server';
    await deleteTenant(tenant.id);
    redirect('/saas/tenants');
  }

  return (
    <div className="animate-in" data-testid="tenant-detail-page">
      <Link
        href="/saas/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={14} /> Back to tenants
      </Link>

      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{tenant.name}</h2>
            <span className={STATUS_STYLES[tenant.status] ?? ''}>{tenant.status}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">/{tenant.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${tenant.slug}`} target="_blank">
              <ExternalLink size={14} className="mr-1.5" />
              View storefront
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Products" value={productCount} icon={Package} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Customers" value={customerCount} icon={UsersIcon} iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard title="Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={DollarSign} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Recent orders" value={recentOrders.length} icon={ShoppingCart} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form action={onUpdate} className="lg:col-span-2 rounded-xl border bg-card shadow-sm p-6 space-y-5" data-testid="edit-tenant-form">
          <h3 className="font-semibold text-foreground">Store details</h3>

          <div>
            <Label htmlFor="name">Store name</Label>
            <Input id="name" name="name" defaultValue={tenant.name} required minLength={2} maxLength={100} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={tenant.description ?? ''} maxLength={500} rows={3} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan">Plan</Label>
              <select id="plan" name="plan" defaultValue={tenant.plan} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={tenant.status} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white" data-testid="save-tenant">
              Save changes
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserCog size={16} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Staff ({memberships.length})</h3>
            </div>
            <div className="space-y-2">
              {memberships.length === 0 && (
                <p className="text-sm text-muted-foreground">No staff members assigned.</p>
              )}
              {memberships.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.profile?.full_name ?? 'Unnamed user'}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email ?? m.user_id}</p>
                  </div>
                  <span className={`text-[11px] font-medium capitalize rounded-md px-2 py-0.5 ${ROLE_COLORS[m.role] ?? 'bg-slate-100 text-slate-700'}`}>
                    {m.role.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm p-5">
            <h3 className="font-semibold text-foreground mb-3">Recent orders</h3>
            <div className="divide-y">
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
              {recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground capitalize">{o.status}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="font-medium">${Number(o.total_amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
            <h3 className="font-semibold text-red-700">Danger zone</h3>
            <p className="text-xs text-red-600/80 mt-1">Deleting a tenant removes it and all related data. This cannot be undone.</p>
            <form action={onDelete} className="mt-3">
              <Button
                type="submit"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                data-testid="delete-tenant-btn"
              >
                <Trash2 size={14} className="mr-1.5" />
                Delete tenant
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
