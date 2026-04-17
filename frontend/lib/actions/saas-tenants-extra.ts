'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/get-session';

export async function deleteTenant(tenantId: string) {
  await requireSuperAdmin();
  const admin = getSupabaseServiceClient();

  const { error } = await admin.from('tenants').delete().eq('id', tenantId);
  if (error) return { error: error.message };

  revalidatePath('/saas/tenants');
  return { success: true };
}

export async function getTenantDetail(tenantId: string) {
  await requireSuperAdmin();
  const admin = getSupabaseServiceClient();

  const [tenantRes, productsRes, ordersRes, customersRes, membershipsRes] = await Promise.all([
    admin.from('tenants').select('*').eq('id', tenantId).maybeSingle(),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('orders').select('id, total_amount, status, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
    admin.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('tenant_memberships').select('id, user_id, role, is_active, created_at').eq('tenant_id', tenantId),
  ]);

  if (!tenantRes.data) return { error: 'Tenant not found' };

  const memberUserIds = (membershipsRes.data ?? []).map((m) => m.user_id);
  let memberProfiles: any[] = [];
  let memberEmails = new Map<string, string>();
  if (memberUserIds.length > 0) {
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('id, full_name')
      .in('id', memberUserIds);
    memberProfiles = profiles ?? [];

    const { data: authRes } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    (authRes?.users ?? []).forEach((u) => {
      if (u.email) memberEmails.set(u.id, u.email);
    });
  }

  const totalRevenue = (ordersRes.data ?? [])
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  return {
    data: {
      tenant: tenantRes.data,
      productCount: productsRes.count ?? 0,
      customerCount: customersRes.count ?? 0,
      recentOrders: ordersRes.data ?? [],
      totalRevenue,
      memberships: (membershipsRes.data ?? []).map((m) => ({
        ...m,
        profile: memberProfiles.find((p) => p.id === m.user_id) ?? null,
        email: memberEmails.get(m.user_id) ?? null,
      })),
    },
  };
}
