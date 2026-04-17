'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/get-session';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1).max(100),
  system_role: z.enum(['super_admin', 'none']).default('none'),
});

export async function listPlatformUsers() {
  await requireSuperAdmin();
  const admin = getSupabaseServiceClient();

  const { data: authRes, error: authErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authErr) return { error: authErr.message };

  const userIds = authRes.users.map((u) => u.id);
  if (userIds.length === 0) return { data: [] };

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('*')
    .in('id', userIds);

  const { data: memberships } = await admin
    .from('tenant_memberships')
    .select('user_id, tenant_id, role, is_active, tenants(name, slug)')
    .in('user_id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const membershipMap = new Map<string, any[]>();
  (memberships ?? []).forEach((m: any) => {
    if (!membershipMap.has(m.user_id)) membershipMap.set(m.user_id, []);
    membershipMap.get(m.user_id)!.push(m);
  });

  const enriched = authRes.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email_confirmed: !!u.email_confirmed_at,
    profile: profileMap.get(u.id) ?? null,
    memberships: membershipMap.get(u.id) ?? [],
  }));

  return { data: enriched };
}

export async function grantSuperAdmin(userId: string) {
  await requireSuperAdmin();
  const admin = getSupabaseServiceClient();

  const { error } = await admin
    .from('user_profiles')
    .update({ system_role: 'super_admin' })
    .eq('id', userId);

  if (error) return { error: error.message };
  revalidatePath('/saas/users');
  return { success: true };
}

export async function revokeSuperAdmin(userId: string) {
  const session = await requireSuperAdmin();
  if (session.id === userId) {
    return { error: 'You cannot revoke your own super admin access' };
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from('user_profiles')
    .update({ system_role: null })
    .eq('id', userId);

  if (error) return { error: error.message };
  revalidatePath('/saas/users');
  return { success: true };
}

export async function createPlatformUser(formData: FormData) {
  await requireSuperAdmin();
  const admin = getSupabaseServiceClient();

  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    system_role: formData.get('system_role') ?? 'none',
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (createErr) return { error: createErr.message };

  await admin.from('user_profiles').upsert({
    id: created.user.id,
    full_name: parsed.data.full_name,
    system_role: parsed.data.system_role === 'super_admin' ? 'super_admin' : null,
  });

  revalidatePath('/saas/users');
  return { success: true, userId: created.user.id };
}

export async function deletePlatformUser(userId: string) {
  const session = await requireSuperAdmin();
  if (session.id === userId) {
    return { error: 'You cannot delete your own account' };
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath('/saas/users');
  return { success: true };
}
