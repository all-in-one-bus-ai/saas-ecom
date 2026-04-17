'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/get-session';

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500).optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).default('free'),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'pending', 'cancelled']).optional(),
});

export async function createTenant(formData: FormData) {
  await requireSuperAdmin();
  const supabase = getSupabaseServerClient();

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') ?? '',
    plan: formData.get('plan') ?? 'free',
  };

  const parsed = createTenantSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A store with that slug already exists' };
    }
    return { error: error.message };
  }

  revalidatePath('/saas/tenants');
  return { data };
}

export async function updateTenant(tenantId: string, formData: FormData) {
  await requireSuperAdmin();
  const supabase = getSupabaseServerClient();

  const raw = Object.fromEntries(
    ['name', 'description', 'plan', 'status'].map((k) => [k, formData.get(k)]).filter(([, v]) => v !== null)
  );

  const parsed = updateTenantSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(parsed.data)
    .eq('id', tenantId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/saas/tenants');
  return { data };
}

export async function suspendTenant(tenantId: string) {
  await requireSuperAdmin();
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('id', tenantId);

  if (error) return { error: error.message };

  revalidatePath('/saas/tenants');
  return { success: true };
}

export async function activateTenant(tenantId: string) {
  await requireSuperAdmin();
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('tenants')
    .update({ status: 'active' })
    .eq('id', tenantId);

  if (error) return { error: error.message };

  revalidatePath('/saas/tenants');
  return { success: true };
}

export async function getAllTenants() {
  await requireSuperAdmin();
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}
