'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireTenantRole } from '@/lib/auth/get-session';

const orderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  staff_notes: z.string().max(1000).optional(),
});

export async function getOrders(tenantSlug: string, filters?: {
  status?: string;
  payment_status?: string;
  limit?: number;
  offset?: number;
}) {
  const session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager', 'operative']);
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('orders')
    .select(`
      *,
      customers(id, email, full_name),
      order_items(id, product_name, variant_name, quantity, unit_price, total_price)
    `)
    .eq('tenant_id', session.tenant.id)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded');
  if (filters?.payment_status) query = query.eq('payment_status', filters.payment_status as 'unpaid' | 'paid' | 'partial' | 'refunded' | 'failed');
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 20) - 1));

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data };
}

export async function updateOrderStatus(
  tenantSlug: string,
  orderId: string,
  formData: FormData
) {
  const session = await requireTenantRole(tenantSlug, ['super_admin', 'store_admin', 'manager', 'operative']);
  const supabase = getSupabaseServerClient();

  const raw = {
    status: formData.get('status'),
    staff_notes: formData.get('staff_notes') ?? undefined,
  };

  const parsed = orderStatusSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const updates = {
    status: parsed.data.status,
    ...(parsed.data.staff_notes !== undefined ? { staff_notes: parsed.data.staff_notes } : {}),
    ...(parsed.data.status === 'shipped' ? { shipped_at: new Date().toISOString() } : {}),
    ...(parsed.data.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
  };

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('tenant_id', session.tenant.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/store/${tenantSlug}/admin/orders`);
  revalidatePath(`/store/${tenantSlug}/manager/orders`);
  revalidatePath(`/store/${tenantSlug}/operative`);
  return { data };
}

export async function getOrderAnalytics(tenantSlug: string) {
  const session = await requireTenantRole(tenantSlug, ['store_admin', 'manager']);
  const supabase = getSupabaseServerClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, payment_status, total_amount, created_at')
    .eq('tenant_id', session.tenant.id);

  if (error) return { error: error.message };

  const totalRevenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const processingOrders = orders.filter((o) => o.status === 'processing').length;
  const totalOrders = orders.length;

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const recentOrders = orders.filter(
    (o) => new Date(o.created_at) >= last30Days && o.payment_status === 'paid'
  );
  const recentRevenue = recentOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  return {
    data: {
      totalRevenue,
      totalOrders,
      pendingOrders,
      processingOrders,
      recentRevenue,
      recentOrderCount: recentOrders.length,
    },
  };
}
