import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireSuperAdmin } from '@/lib/auth/get-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/currency';
import { ShoppingCart, Building2, UserPlus, Package, Activity as ActivityIcon } from 'lucide-react';

export const metadata = { title: 'Platform Activity' };
export const dynamic = 'force-dynamic';

type Event = {
  id: string;
  kind: 'order' | 'tenant' | 'user' | 'product';
  title: string;
  subtitle: string;
  at: string;
};

async function getActivity(): Promise<Event[]> {
  const admin = getSupabaseServiceClient();

  const [ordersRes, tenantsRes, productsRes, profilesRes] = await Promise.all([
    admin.from('orders').select('id, order_number, tenant_id, total_amount, currency, status, created_at, tenants(name, slug)').order('created_at', { ascending: false }).limit(20),
    admin.from('tenants').select('id, name, slug, plan, status, created_at').neq('id', '00000000-0000-0000-0000-000000000000').order('created_at', { ascending: false }).limit(20),
    admin.from('products').select('id, name, tenant_id, created_at, tenants(name, slug)').order('created_at', { ascending: false }).limit(20),
    admin.from('user_profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const events: Event[] = [];

  (ordersRes.data ?? []).forEach((o: any) => {
    events.push({
      id: `order-${o.id}`,
      kind: 'order',
      title: `Order ${o.order_number} · ${formatPrice(Number(o.total_amount), (o.currency || 'USD').toUpperCase())}`,
      subtitle: `${o.tenants?.name ?? 'Unknown'} · ${o.status}`,
      at: o.created_at,
    });
  });

  (tenantsRes.data ?? []).forEach((t: any) => {
    events.push({
      id: `tenant-${t.id}`,
      kind: 'tenant',
      title: `New tenant: ${t.name}`,
      subtitle: `${t.plan} plan · /${t.slug}`,
      at: t.created_at,
    });
  });

  (productsRes.data ?? []).forEach((p: any) => {
    events.push({
      id: `product-${p.id}`,
      kind: 'product',
      title: `Product added: ${p.name}`,
      subtitle: p.tenants?.name ?? 'Unknown tenant',
      at: p.created_at,
    });
  });

  (profilesRes.data ?? []).forEach((u: any) => {
    events.push({
      id: `user-${u.id}`,
      kind: 'user',
      title: `New user: ${u.full_name || 'Unnamed'}`,
      subtitle: 'Signed up',
      at: u.created_at,
    });
  });

  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50);
}

const ICONS = { order: ShoppingCart, tenant: Building2, user: UserPlus, product: Package };
const COLORS = {
  order: 'bg-emerald-50 text-emerald-600',
  tenant: 'bg-sky-50 text-sky-600',
  user: 'bg-amber-50 text-amber-600',
  product: 'bg-blue-50 text-blue-600',
};

function formatAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function ActivityPage() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const events = await getActivity();

  return (
    <div className="animate-in max-w-4xl" data-testid="saas-activity-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Platform Activity</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Latest 50 events across orders, tenants, products and users
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {events.length === 0 ? (
          <div className="p-12 text-center">
            <ActivityIcon size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <ol className="divide-y">
            {events.map((e) => {
              const Icon = ICONS[e.kind];
              return (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3.5" data-testid={`activity-${e.kind}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${COLORS[e.kind]}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.subtitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatAgo(e.at)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
