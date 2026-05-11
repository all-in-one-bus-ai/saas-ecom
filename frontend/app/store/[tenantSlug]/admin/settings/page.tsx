import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getTenantSettingsData } from '@/lib/actions/tenant-settings';
import { resolveTenantCurrency } from '@/lib/currency-server';
import { TenantSettingsForm } from './settings-form';
import { Settings } from 'lucide-react';

export const metadata = { title: 'Store settings' };
export const dynamic = 'force-dynamic';

interface Props {
  params: { tenantSlug: string };
}

export default async function TenantSettingsPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const data = await getTenantSettingsData(session.tenant.id);
  const effectiveCurrency = await resolveTenantCurrency(session.tenant.id);

  return (
    <div className="animate-in max-w-3xl" data-testid="tenant-settings-page">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings size={20} /> Store settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update your store name, description and the currency shown to shoppers
          </p>
        </div>
      </div>

      <TenantSettingsForm
        tenantId={session.tenant.id}
        tenantSlug={session.tenant.slug}
        initial={{
          name: data.tenant?.name ?? '',
          description: data.tenant?.description ?? '',
          currency: data.currency || '',
        }}
        effectiveCurrency={effectiveCurrency}
      />
    </div>
  );
}
