import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { UserProfile, TenantMembership, Tenant, UserRole } from '@/lib/types/database';

export interface SessionUser {
  id: string;
  email: string | undefined;
  profile: UserProfile | null;
  systemRole: 'super_admin' | null;
}

export interface TenantSession {
  user: SessionUser;
  membership: TenantMembership;
  tenant: Tenant;
  role: UserRole;
}

export async function getSession(): Promise<SessionUser | null> {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    profile,
    systemRole: profile?.system_role ?? null,
  };
}

export async function getTenantSession(tenantSlug: string): Promise<TenantSession | null> {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (!tenant) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.system_role === 'super_admin') {
    const mockMembership: TenantMembership = {
      id: 'super-admin-bypass',
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'store_admin',
      is_active: true,
      invited_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return {
      user: { id: user.id, email: user.email, profile, systemRole: 'super_admin' },
      membership: mockMembership,
      tenant,
      role: 'super_admin',
    };
  }

  const { data: membership } = await supabase
    .from('tenant_memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership) return null;

  return {
    user: { id: user.id, email: user.email, profile, systemRole: null },
    membership,
    tenant,
    role: membership.role as UserRole,
  };
}

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.systemRole !== 'super_admin') {
    throw new Error('UNAUTHORIZED: Super admin access required');
  }
  return session;
}

export async function requireTenantRole(
  tenantSlug: string,
  allowedRoles: UserRole[]
): Promise<TenantSession> {
  const session = await getTenantSession(tenantSlug);
  if (!session) {
    throw new Error('UNAUTHORIZED: Not authenticated');
  }
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`FORBIDDEN: Role ${session.role} not permitted. Required: ${allowedRoles.join(', ')}`);
  }
  return session;
}
