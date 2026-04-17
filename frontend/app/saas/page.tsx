import { Building2, Users, Activity, DollarSign } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/shared/stat-card';

export const metadata = { title: 'Super Admin Dashboard' };

async function getSaasStats() {
  try {
    const supabase = getSupabaseServerClient();

    const [r1, r2, r3] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('id, name, slug, status, plan, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const r4 = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    return {
      tenantCount: r1.count ?? 0,
      userCount: r2.count ?? 0,
      activeCount: r4.count ?? 0,
      recentTenants: r3.data ?? [],
    };
  } catch {
    return { tenantCount: 0, userCount: 0, activeCount: 0, recentTenants: [] };
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-50 text-slate-600 border-slate-200',
  starter: 'bg-sky-50 text-sky-700 border-sky-200',
  professional: 'bg-blue-50 text-blue-700 border-blue-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default async function SaasPage() {
  const stats = await getSaasStats();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor your entire SaaS platform at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Stores"
          value={stats.tenantCount}
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          trend={{ value: 12, label: 'this month' }}
        />
        <StatCard
          title="Active Stores"
          value={stats.activeCount}
          icon={Activity}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Platform Users"
          value={stats.userCount}
          icon={Users}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          trend={{ value: 8, label: 'this month' }}
        />
        <StatCard
          title="MRR"
          value="$4,280"
          icon={DollarSign}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: 23, label: 'this month' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold text-foreground">Recent Stores</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Last 5 registered tenants</p>
          </div>
          <div className="divide-y">
            {stats.recentTenants.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No tenants yet.</p>
            ) : (
              stats.recentTenants.map((tenant) => (
                <div key={tenant.id} className="data-table-row flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${PLAN_COLORS[tenant.plan] ?? ''}`}>
                      {tenant.plan}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${STATUS_COLORS[tenant.status] ?? ''}`}>
                      {tenant.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold text-foreground">Plan Distribution</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Stores by subscription tier</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { plan: 'Enterprise', count: 2, pct: 15, color: 'bg-amber-500' },
              { plan: 'Professional', count: 4, pct: 30, color: 'bg-blue-500' },
              { plan: 'Starter', count: 5, pct: 38, color: 'bg-sky-400' },
              { plan: 'Free', count: 2, pct: 15, color: 'bg-slate-300' },
            ].map((tier) => (
              <div key={tier.plan}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{tier.plan}</span>
                  <span className="text-muted-foreground">{tier.count} stores</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tier.color} rounded-full transition-all duration-500`}
                    style={{ width: `${tier.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
