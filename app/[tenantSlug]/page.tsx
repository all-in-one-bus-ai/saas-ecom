import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { StorefrontHeader } from '@/components/storefront/storefront-header';
import { StorefrontProductGrid } from '@/components/storefront/storefront-product-grid';
import { StorefrontHero } from '@/components/storefront/storefront-hero';
import type { ProductImage } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  params: { tenantSlug: string };
}

async function getStorefrontData(tenantSlug: string) {
  const supabase = getSupabasePublicClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .maybeSingle();

  if (!tenant) return null;

  const [{ data: featuredProducts }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select(`*, categories(name), product_variants(id, stock_qty, price_override)`)
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  return { tenant, products: featuredProducts ?? [], categories: categories ?? [] };
}

export default async function StorefrontPage({ params }: Props) {
  const data = await getStorefrontData(params.tenantSlug);

  if (!data) notFound();

  const { tenant, products, categories } = data;

  return (
    <>
      <StorefrontHeader
        tenantSlug={params.tenantSlug}
        storeName={tenant.name}
        categories={categories}
      />
      <StorefrontHero storeName={tenant.name} description={tenant.description} />
      <StorefrontProductGrid
        products={products}
        tenantSlug={params.tenantSlug}
      />
      <footer className="mt-20 border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              {tenant.name}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              {tenant.description}
            </p>
            <p className="text-xs mt-4" style={{ color: 'var(--color-muted-foreground)' }}>
              &copy; {new Date().getFullYear()} {tenant.name}. Powered by ShopStack.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
