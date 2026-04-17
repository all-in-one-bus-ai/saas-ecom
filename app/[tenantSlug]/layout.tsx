import { notFound } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { StorefrontThemeProvider } from '@/lib/theme/theme-provider';
import { THEMES, mergeThemeConfig } from '@/lib/theme/themes';
import type { ThemeConfig } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  children: React.ReactNode;
  params: { tenantSlug: string };
}

async function getTenantWithTheme(slug: string) {
  const supabase = getSupabasePublicClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (!tenant) return null;

  const { data: tenantTheme } = await supabase
    .from('tenant_themes')
    .select(`*, themes(*)`)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();

  const themeSlug = (tenantTheme?.themes as unknown as { slug: string } | null)?.slug ?? 'minimal';
  const baseConfig = THEMES[themeSlug] ?? THEMES['minimal'];
  const overrides = (tenantTheme?.config ?? {}) as Partial<ThemeConfig>;
  const config = mergeThemeConfig(baseConfig, overrides);

  return { tenant, themeSlug, config };
}

export async function generateMetadata({ params }: { params: { tenantSlug: string } }) {
  const supabase = getSupabasePublicClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, description')
    .eq('slug', params.tenantSlug)
    .maybeSingle();

  return {
    title: tenant?.name ?? 'Store',
    description: tenant?.description ?? '',
  };
}

export default async function StorefrontLayout({ children, params }: Props) {
  const result = await getTenantWithTheme(params.tenantSlug);

  if (!result) notFound();

  const { tenant, themeSlug, config } = result;

  return (
    <StorefrontThemeProvider initialSlug={themeSlug} initialConfig={config}>
      <div className="min-h-screen" style={{ backgroundColor: config.colors.background, color: config.colors.foreground }}>
        {children}
      </div>
    </StorefrontThemeProvider>
  );
}
