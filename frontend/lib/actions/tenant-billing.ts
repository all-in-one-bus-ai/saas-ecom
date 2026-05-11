'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function saveTenantStripeKeys(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const tenantId = String(formData.get('tenant_id') ?? '');
  const pk = String(formData.get('stripe_publishable_key') ?? '').trim();
  const sk = String(formData.get('stripe_secret_key') ?? '').trim();

  if (!tenantId) return { error: 'Missing tenant' };

  const admin = getSupabaseServiceClient();

  // Authorization: super admin OR active store_admin membership
  if (session.systemRole !== 'super_admin') {
    const { data: m } = await admin
      .from('tenant_memberships')
      .select('role, is_active')
      .eq('tenant_id', tenantId)
      .eq('user_id', session.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!m || m.role !== 'store_admin') return { error: 'Forbidden' };
  }

  const rows: Array<{ tenant_id: string; key: string; value: string }> = [];
  if (pk) rows.push({ tenant_id: tenantId, key: 'stripe_publishable_key', value: pk });
  if (sk) rows.push({ tenant_id: tenantId, key: 'stripe_secret_key', value: sk });

  if (rows.length === 0) return { error: 'Nothing to save' };

  const { error } = await admin
    .from('store_settings')
    .upsert(rows, { onConflict: 'tenant_id,key' });

  if (error) return { error: error.message };

  revalidatePath(`/store/${tenantId}/admin/billing`);
  return { success: true };
}
