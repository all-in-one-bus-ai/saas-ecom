/*
  # Orders, Customers & Addresses Schema

  ## Overview
  Complete order management system:
  - Customer profiles (separate from auth users - for guest checkout support)
  - Address book for customers
  - Orders with full lifecycle (pending -> processing -> shipped -> delivered)
  - Order line items with snapshot of product data at time of purchase
  - Discount codes system

  ## New Tables

  ### customers
  - Store customers (can be linked to auth users or be guest records)
  - Fields: tenant_id, email, full_name, phone, user_id (optional link to auth)

  ### addresses
  - Reusable address records for customers
  - Fields: customer_id, tenant_id, line1, line2, city, state, zip, country, is_default

  ### discount_codes
  - Promo codes with usage limits and expiry
  - Fields: tenant_id, code, type (percent/fixed), value, min_order, max_uses, used_count

  ### orders
  - Full order records with status lifecycle
  - Fields: tenant_id, customer_id, status, subtotal, discount, tax, shipping, total,
            payment_status, stripe_payment_intent_id, notes, discount_code_id

  ### order_items
  - Snapshot of each line item in an order
  - Fields: order_id, tenant_id, variant_id, product_name, variant_name, sku, qty, unit_price, total_price

  ## Security
  - RLS: customers/orders visible to tenant members only
  - Operatives can update order status but not delete orders
*/

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  total_orders int NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- ==================== ADDRESSES ====================
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  line1 text NOT NULL DEFAULT '',
  line2 text DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'US',
  phone text DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_tenant_id ON addresses(tenant_id);

-- ==================== DISCOUNT CODES ====================
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
  value numeric(10,2) NOT NULL DEFAULT 0,
  min_order_amount numeric(10,2) DEFAULT 0,
  max_uses int DEFAULT NULL,
  used_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_tenant_id ON discount_codes(tenant_id);

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'refunded', 'failed')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  shipping_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  discount_code_id uuid REFERENCES discount_codes(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  shipping_address jsonb DEFAULT '{}',
  billing_address jsonb DEFAULT '{}',
  notes text DEFAULT '',
  staff_notes text DEFAULT '',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ==================== ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  variant_name text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  product_image text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id ON order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- ==================== TRIGGERS ====================
CREATE OR REPLACE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ORDER NUMBER SEQUENCE FUNCTION ====================
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  order_count int;
  order_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO order_count FROM orders WHERE tenant_id = p_tenant_id;
  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(order_count::text, 5, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS: CUSTOMERS ====================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = customers.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Tenant members can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = customers.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins and managers can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = customers.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager')
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = customers.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager')
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = customers.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: ADDRESSES ====================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = addresses.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Tenant members can insert addresses"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = addresses.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Tenant members can update addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = addresses.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = addresses.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: ORDERS ====================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = orders.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Tenant members can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = orders.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "All tenant members can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = orders.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = orders.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = orders.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: ORDER ITEMS ====================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = order_items.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Tenant members can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = order_items.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: DISCOUNT CODES ====================
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active discount codes"
  ON discount_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Tenant members can view all discount codes"
  ON discount_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = discount_codes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can manage discount codes"
  ON discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = discount_codes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can update discount codes"
  ON discount_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = discount_codes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = discount_codes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );
