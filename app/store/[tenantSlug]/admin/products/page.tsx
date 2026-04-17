import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import Link from 'next/link';
import { requireTenantRole } from '@/lib/auth/get-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, CreditCard as Edit, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface Props {
  params: { tenantSlug: string };
}

async function getProducts(tenantId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('products')
    .select(`*, categories(name), product_variants(stock_qty)`)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

const STATUS_STYLE: Record<string, string> = {
  active: 'badge-status-active',
  draft: 'badge-status-pending',
  archived: 'bg-slate-50 text-slate-500 border border-slate-200 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
};

export default async function ProductsPage({ params }: Props) {
  const { tenantSlug } = params;

  let session;
  try {
    session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect('/login');
  }

  const products = await getProducts(session.tenant.id);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} products total</p>
        </div>
        <Button asChild className="bg-sky-600 hover:bg-sky-500 text-white gap-2">
          <Link href={`/store/${tenantSlug}/admin/products/new`}>
            <Plus size={16} /> Add Product
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start selling. Products can be physical or digital items."
          action={{ label: 'Add Product', onClick: () => {} }}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const category = product.categories as { name: string } | null;
                const variants = product.product_variants as { stock_qty: number }[] | null;
                const totalStock = (variants ?? []).reduce((sum, v) => sum + (v.stock_qty ?? 0), 0);
                const images = product.images as Array<{ url: string; alt: string }> | null;
                const image = images?.[0]?.url;

                return (
                  <tr key={product.id} className="data-table-row">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {image ? (
                          <img src={image} alt={product.name} className="w-10 h-10 object-cover rounded-lg border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package size={16} className="text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {category?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      ${product.price.toFixed(2)}
                      {product.compare_at_price && (
                        <span className="ml-1.5 text-xs text-muted-foreground line-through">
                          ${product.compare_at_price.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={totalStock === 0 ? 'text-red-600 font-medium' : totalStock <= 10 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={STATUS_STYLE[product.status] ?? ''}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/store/${tenantSlug}/admin/products/${product.id}/edit`}>
                            <Edit size={14} />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
