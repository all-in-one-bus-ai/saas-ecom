import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { BillingClient } from './billing-client';
import { Receipt } from 'lucide-react';

export const metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

interface Props {
  params: { tenantSlug: string };
}

async function getBillingData(tenantId: string) {
  const admin = getSupabaseServiceClient();
  const [tenantRes, subRes, settingsRes, ordersRes] = await Promise.all([
    admin.from('tenants').select('id, name, slug, plan, status, created_at').eq('id', tenantId).maybeSingle(),
    admin.from('subscriptions').select('*').eq('tenant_id', tenantId).maybeSingle(),
    admin.from('store_settings').select('key, value').eq('tenant_id', tenantId).in('key', ['stripe_secret_key', 'stripe_publishable_key']),
    admin.from('orders').select('id, order_number, total_amount, payment_status, status, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(8),
  ]);

  const settingsMap = new Map((settingsRes.data ?? []).map((s) => [s.key, s.value]));

  return {
    tenant: tenantRes.data,
    subscription: subRes.data,
    hasOwnStripe: !!settingsMap.get('stripe_secret_key'),
    publishableKey: settingsMap.get('stripe_publishable_key') ?? '',
    recentOrders: ordersRes.data ?? [],
  };
}

export default async function BillingPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const data = await getBillingData(session.tenant.id);

  return (
    <div className="animate-in max-w-5xl" data-testid="billing-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt size={20} /> Billing
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your subscription plan and Stripe integration
          </p>
        </div>
      </div>

      <BillingClient
        tenantId={session.tenant.id}
        tenantSlug={session.tenant.slug}
        currentPlan={data.tenant?.plan ?? 'free'}
        subscriptionStatus={data.subscription?.status ?? null}
        hasOwnStripe={data.hasOwnStripe}
        publishableKey={data.publishableKey}
        recentOrders={data.recentOrders as any}
      />
    </div>
  );
}
