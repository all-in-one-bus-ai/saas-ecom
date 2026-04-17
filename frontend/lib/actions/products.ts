'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireTenantRole } from '@/lib/auth/get-session';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(10000).optional(),
  short_description: z.string().max(500).optional(),
  price: z.coerce.number().min(0),
  compare_at_price: z.coerce.number().min(0).optional().nullable(),
  cost_price: z.coerce.number().min(0).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  is_featured: z.coerce.boolean().default(false),
  track_inventory: z.coerce.boolean().default(true),
  requires_shipping: z.coerce.boolean().default(true),
});

export async function getProducts(tenantSlug: string) {
  const session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager', 'operative']);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(id, name),
      product_variants(id, sku, stock_qty, price_override)
    `)
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function createProduct(tenantSlug: string, formData: FormData) {
  const session = await requireTenantRole(tenantSlug, ['store_admin']);
  const supabase = getSupabaseServerClient();

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') ?? '',
    short_description: formData.get('short_description') ?? '',
    price: formData.get('price'),
    compare_at_price: formData.get('compare_at_price') || null,
    cost_price: formData.get('cost_price') || null,
    category_id: formData.get('category_id') || null,
    status: formData.get('status') ?? 'draft',
    is_featured: formData.get('is_featured') === 'true',
    track_inventory: formData.get('track_inventory') !== 'false',
    requires_shipping: formData.get('requires_shipping') !== 'false',
  };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ ...parsed.data, tenant_id: session.tenant.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'A product with that slug already exists' };
    return { error: error.message };
  }

  revalidatePath(`/store/${tenantSlug}/admin/products`);
  return { data };
}

export async function updateProduct(tenantSlug: string, productId: string, updates: Partial<z.infer<typeof productSchema>>) {
  const session = await requireTenantRole(tenantSlug, ['store_admin']);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .eq('tenant_id', session.tenant.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/store/${tenantSlug}/admin/products`);
  return { data };
}

export async function deleteProduct(tenantSlug: string, productId: string) {
  const session = await requireTenantRole(tenantSlug, ['store_admin']);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('tenant_id', session.tenant.id);

  if (error) return { error: error.message };

  revalidatePath(`/store/${tenantSlug}/admin/products`);
  return { success: true };
}

export async function updateInventory(
  tenantSlug: string,
  variantId: string,
  newQty: number,
  reason: 'manual_adjustment' | 'restock' | 'damage' | 'transfer',
  notes?: string
) {
  const session = await requireTenantRole(tenantSlug, ['store_admin', 'manager', 'operative']);
  const supabase = getSupabaseServerClient();

  const { data: variant } = await supabase
    .from('product_variants')
    .select('stock_qty')
    .eq('id', variantId)
    .eq('tenant_id', session.tenant.id)
    .maybeSingle();

  if (!variant) return { error: 'Variant not found' };

  const previousQty = variant.stock_qty;
  const changeQty = newQty - previousQty;

  const { error: updateError } = await supabase
    .from('product_variants')
    .update({ stock_qty: newQty })
    .eq('id', variantId)
    .eq('tenant_id', session.tenant.id);

  if (updateError) return { error: updateError.message };

  await supabase.from('inventory_logs').insert({
    variant_id: variantId,
    tenant_id: session.tenant.id,
    change_qty: changeQty,
    previous_qty: previousQty,
    new_qty: newQty,
    reason,
    notes: notes ?? '',
    performed_by: session.user.id,
  });

  revalidatePath(`/store/${tenantSlug}/admin/products`);
  return { success: true };
}
