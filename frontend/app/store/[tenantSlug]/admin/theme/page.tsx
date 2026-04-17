import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ThemeSelector } from '@/components/store-admin/theme-selector';

interface Props {
  params: { tenantSlug: string };
}

export default async function ThemePage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();

  const [{ data: themes }, { data: activeTheme }] = await Promise.all([
    supabase.from('themes').select('*').eq('is_active', true).order('name'),
    supabase
      .from('tenant_themes')
      .select(`*, themes(*)`)
      .eq('tenant_id', session.tenant.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Theme Customization</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose and customize your storefront appearance
          </p>
        </div>
      </div>

      <ThemeSelector
        themes={themes ?? []}
        activeTheme={activeTheme}
        tenantSlug={tenantSlug}
        tenantId={session.tenant.id}
      />
    </div>
  );
}
