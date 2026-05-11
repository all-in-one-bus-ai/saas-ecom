'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

async function assertTenantAdmin(tenantId: string) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };
  if (session.systemRole === 'super_admin') return { session };

  const admin = getSupabaseServiceClient();
  const { data: m } = await admin
    .from('tenant_memberships')
    .select('role, is_active')
    .eq('tenant_id', tenantId)
    .eq('user_id', session.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!m || m.role !== 'store_admin') return { error: 'Forbidden' };
  return { session };
}

export async function updateTenantSettings(formData: FormData) {
  const tenantId = String(formData.get('tenant_id') ?? '');
  const tenantSlug = String(formData.get('tenant_slug') ?? '');
  if (!tenantId) return { error: 'Missing tenant' };

  const auth = await assertTenantAdmin(tenantId);
  if ('error' in auth && auth.error) return { error: auth.error };

  const admin = getSupabaseServiceClient();

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const currencyRaw = String(formData.get('currency') ?? '').toUpperCase();
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyRaw)?.code;

  const tenantUpdate: Record<string, any> = {};
  if (name && name.length >= 2 && name.length <= 100) tenantUpdate.name = name;
  if (description.length <= 500) tenantUpdate.description = description;

  if (Object.keys(tenantUpdate).length > 0) {
    const { error } = await admin.from('tenants').update(tenantUpdate).eq('id', tenantId);
    if (error) return { error: error.message };
  }

  if (currency) {
    const { error } = await admin
      .from('store_settings')
      .upsert([{ tenant_id: tenantId, key: 'currency', value: currency }], {
        onConflict: 'tenant_id,key',
      });
    if (error) return { error: error.message };
  }

  if (tenantSlug) {
    revalidatePath(`/store/${tenantSlug}/admin/settings`);
    revalidatePath(`/${tenantSlug}`);
    revalidatePath(`/${tenantSlug}/cart`);
  }
  return { success: true };
}

export async function getTenantSettingsData(tenantId: string) {
  const admin = getSupabaseServiceClient();
  const [tenantRes, settingsRes] = await Promise.all([
    admin.from('tenants').select('id, slug, name, description, plan, status').eq('id', tenantId).maybeSingle(),
    admin.from('store_settings').select('key, value').eq('tenant_id', tenantId).in('key', ['currency']),
  ]);
  const settings = new Map((settingsRes.data ?? []).map((s) => [s.key, s.value]));
  return {
    tenant: tenantRes.data,
    currency: settings.get('currency') ?? '',
  };
}
