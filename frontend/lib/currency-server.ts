import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/actions/platform-settings';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/currency';

/**
 * Resolve the currency for a given tenant. Order of precedence:
 *  1. tenant's own `currency` row in store_settings
 *  2. platform default_currency (from PlatformSettings)
 *  3. DEFAULT_CURRENCY (GBP)
 */
export async function resolveTenantCurrency(tenantId: string): Promise<string> {
  const admin = getSupabaseServiceClient();
  const { data: rows } = await admin
    .from('store_settings')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', 'currency')
    .maybeSingle();
  const tenantCur = (rows?.value || '').toUpperCase();
  if (tenantCur && SUPPORTED_CURRENCIES.some((c) => c.code === tenantCur)) {
    return tenantCur;
  }
  const platform = await getPlatformSettings();
  return platform.default_currency || DEFAULT_CURRENCY;
}

export async function resolvePlatformCurrency(): Promise<string> {
  const platform = await getPlatformSettings();
  return platform.default_currency || DEFAULT_CURRENCY;
}
