'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/get-session';

const PLATFORM_SETTING_KEY = '__platform_settings__';
const PLATFORM_TENANT_PROBE = '00000000-0000-0000-0000-000000000000';

export type PlatformSettings = {
  platform_name: string;
  support_email: string;
  default_plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maintenance_mode: boolean;
  allow_signups: boolean;
};

const DEFAULTS: PlatformSettings = {
  platform_name: 'ShopStack',
  support_email: '',
  default_plan: 'free',
  maintenance_mode: false,
  allow_signups: true,
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = getSupabaseServiceClient();
  const { data } = await admin
    .from('store_settings')
    .select('value')
    .eq('key', PLATFORM_SETTING_KEY)
    .maybeSingle();

  if (!data?.value) return DEFAULTS;

  try {
    return { ...DEFAULTS, ...JSON.parse(data.value) };
  } catch {
    return DEFAULTS;
  }
}

export async function updatePlatformSettings(formData: FormData) {
  await requireSuperAdmin();
  const admin = getSupabaseServiceClient();

  const next: PlatformSettings = {
    platform_name: String(formData.get('platform_name') ?? DEFAULTS.platform_name).slice(0, 100),
    support_email: String(formData.get('support_email') ?? ''),
    default_plan: (formData.get('default_plan') as any) || DEFAULTS.default_plan,
    maintenance_mode: formData.get('maintenance_mode') === 'on',
    allow_signups: formData.get('allow_signups') === 'on',
  };

  // Upsert a single platform-wide row. We reuse store_settings with a reserved tenant_id.
  const { error } = await admin
    .from('store_settings')
    .upsert(
      {
        tenant_id: PLATFORM_TENANT_PROBE,
        key: PLATFORM_SETTING_KEY,
        value: JSON.stringify(next),
      },
      { onConflict: 'tenant_id,key' }
    );

  if (error) return { error: error.message };
  revalidatePath('/saas/settings');
  return { success: true };
}
