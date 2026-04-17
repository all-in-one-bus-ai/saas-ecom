import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StaffManagement } from '@/components/store-admin/staff-management';

interface Props {
  params: { tenantSlug: string };
}

export default async function StaffPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  const { data: memberships } = await supabase
    .from('tenant_memberships')
    .select(`*, user_profiles(id, full_name, avatar_url)`)
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Staff Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members and their access permissions
          </p>
        </div>
      </div>

      <StaffManagement
        memberships={memberships ?? []}
        tenantSlug={tenantSlug}
        tenantId={session.tenant.id}
        currentUserId={session.user.id}
      />
    </div>
  );
}
