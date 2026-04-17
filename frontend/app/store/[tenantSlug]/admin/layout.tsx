import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { getTenantSession } from '@/lib/auth/get-session';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  children: React.ReactNode;
  params: { tenantSlug: string };
}

export default async function StoreAdminLayout({ children, params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await getTenantSession(tenantSlug);
    if (!session || !['super_admin', 'store_admin'].includes(session.role)) {
      redirect('/login');
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const base = `/store/${tenantSlug}/admin`;

  const navGroups = [
    {
      items: [
        { label: 'Dashboard', href: base, icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Store',
      items: [
        { label: 'Products', href: `${base}/products`, icon: 'Package' },
        { label: 'Categories', href: `${base}/categories`, icon: 'Layers' },
        { label: 'Orders', href: `${base}/orders`, icon: 'ShoppingCart' },
        { label: 'Customers', href: `${base}/customers`, icon: 'Users' },
        { label: 'Discounts', href: `${base}/discounts`, icon: 'Tag' },
        { label: 'Shipping', href: `${base}/shipping`, icon: 'Truck' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Analytics', href: `${base}/analytics`, icon: 'BarChart3' },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { label: 'Staff', href: `${base}/staff`, icon: 'UserCog' },
        { label: 'Theme', href: `${base}/theme`, icon: 'Palette' },
        { label: 'Billing', href: `${base}/billing`, icon: 'CreditCard' },
        { label: 'Settings', href: `${base}/settings`, icon: 'Settings' },
      ],
    },
  ];

  const logo = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
        <ShoppingBag size={16} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white leading-none truncate">{session.tenant.name}</p>
        <p className="text-[10px] text-slate-400 leading-none mt-0.5">Store Admin</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar logo={logo} navGroups={navGroups} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          userEmail={session.user.email}
          userName={session.user.profile?.full_name}
          roleBadge="Store Admin"
        />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
