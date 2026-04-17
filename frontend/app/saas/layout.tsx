import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SaasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (session.systemRole !== 'super_admin') {
    redirect('/login?error=unauthorized');
  }

  const navGroups = [
    {
      items: [
        { label: 'Dashboard', href: '/saas', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Platform',
      items: [
        { label: 'Tenants', href: '/saas/tenants', icon: 'Building2' },
        { label: 'Users', href: '/saas/users', icon: 'Users' },
        { label: 'Subscriptions', href: '/saas/subscriptions', icon: 'CreditCard' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Analytics', href: '/saas/analytics', icon: 'BarChart3' },
        { label: 'Activity', href: '/saas/activity', icon: 'Activity' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/saas/settings', icon: 'Settings' },
      ],
    },
  ];

  const logo = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
        <ShoppingBag size={16} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-white leading-none">ShopStack</p>
        <p className="text-[10px] text-slate-400 leading-none mt-0.5">Super Admin</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar logo={logo} navGroups={navGroups} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          userEmail={session.email}
          userName={session.profile?.full_name}
          roleBadge="Super Admin"
        />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
