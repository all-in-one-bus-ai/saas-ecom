'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireTenantRole } from '@/lib/auth/get-session';

const inviteStaffSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role: z.enum(['manager', 'operative']),
});

export async function getStaffMembers(tenantSlug: string) {
  const session = await requireTenantRole(tenantSlug, ['store_admin', 'manager']);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('tenant_memberships')
    .select(`
      *,
      user_profiles(id, full_name, avatar_url)
    `)
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function inviteStaffMember(tenantSlug: string, formData: FormData) {
  const session = await requireTenantRole(tenantSlug, ['store_admin']);
  const supabaseService = getSupabaseServiceClient();

  const raw = {
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
  };

  const parsed = inviteStaffSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { data: usersData } = await supabaseService.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const existingAuthUser = usersData?.users?.find(u => u.email === parsed.data.email);

  let userId: string;

  if (existingAuthUser) {
    userId = existingAuthUser.id;
  } else {
    const { data: newUser, error: createError } = await supabaseService.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });
    if (createError) return { error: createError.message };
    userId = newUser.user.id;

    await supabaseService.from('user_profiles').insert({
      id: userId,
      full_name: parsed.data.full_name,
    });
  }

  const { data: existingMembership } = await supabaseService
    .from('tenant_memberships')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('tenant_id', session.tenant.id)
    .maybeSingle();

  if (existingMembership) {
    const { error: updateError } = await supabaseService
      .from('tenant_memberships')
      .update({ role: parsed.data.role, is_active: true, invited_by: session.user.id })
      .eq('id', existingMembership.id);

    if (updateError) return { error: updateError.message };
  } else {
    const { error: insertError } = await supabaseService
      .from('tenant_memberships')
      .insert({
        user_id: userId,
        tenant_id: session.tenant.id,
        role: parsed.data.role,
        invited_by: session.user.id,
      });

    if (insertError) return { error: insertError.message };
  }

  revalidatePath(`/store/${tenantSlug}/admin/staff`);
  return { success: true };
}

export async function updateStaffRole(
  tenantSlug: string,
  membershipId: string,
  newRole: 'manager' | 'operative'
) {
  const session = await requireTenantRole(tenantSlug, ['store_admin']);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('tenant_memberships')
    .update({ role: newRole })
    .eq('id', membershipId)
    .eq('tenant_id', session.tenant.id);

  if (error) return { error: error.message };

  revalidatePath(`/store/${tenantSlug}/admin/staff`);
  return { success: true };
}

export async function removeStaffMember(tenantSlug: string, membershipId: string) {
  const session = await requireTenantRole(tenantSlug, ['store_admin']);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('tenant_memberships')
    .update({ is_active: false })
    .eq('id', membershipId)
    .eq('tenant_id', session.tenant.id);

  if (error) return { error: error.message };

  revalidatePath(`/store/${tenantSlug}/admin/staff`);
  return { success: true };
}
