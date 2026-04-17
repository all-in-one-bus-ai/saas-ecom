/*
  # Product Catalog Schema: Products, Categories, Variants & Inventory

  ## Overview
  Complete product management system for multi-tenant e-commerce:
  - Categories with hierarchical support (parent_id)
  - Products with rich metadata, SEO fields, and tenant isolation
  - Product variants (size, color, etc.) with separate pricing/SKU
  - Inventory tracking per variant with low-stock alerting

  ## New Tables

  ### categories
  - Hierarchical product categories per tenant
  - Fields: tenant_id, name, slug, parent_id, image_url, is_active, sort_order

  ### products
  - Core product records
  - Fields: tenant_id, category_id, name, slug, description, price, compare_at_price,
            images, tags, status, seo_title, seo_description, is_featured

  ### product_variants
  - SKU-level product variations (color, size, material, etc.)
  - Fields: product_id, tenant_id, name, sku, price_override, stock_qty, attributes (JSON)

  ### inventory_logs
  - Audit log of all inventory changes for traceability
  - Fields: variant_id, tenant_id, change_qty, reason, performed_by

  ## Security
  - All tables tenant-scoped with RLS
  - Managers & admins can write; operatives can update inventory counts
  - Public read access for active products (storefront)
*/

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  short_description text DEFAULT '',
  price numeric(12,2) NOT NULL DEFAULT 0,
  compare_at_price numeric(12,2),
  cost_price numeric(12,2),
  images jsonb NOT NULL DEFAULT '[]',
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  is_featured boolean NOT NULL DEFAULT false,
  seo_title text DEFAULT '',
  seo_description text DEFAULT '',
  weight numeric(8,3) DEFAULT 0,
  requires_shipping boolean NOT NULL DEFAULT true,
  track_inventory boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- ==================== PRODUCT VARIANTS ====================
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  sku text NOT NULL,
  price_override numeric(12,2),
  stock_qty int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 5,
  attributes jsonb NOT NULL DEFAULT '{}',
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant_id ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- ==================== INVENTORY LOGS ====================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  change_qty int NOT NULL,
  previous_qty int NOT NULL DEFAULT 0,
  new_qty int NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'manual_adjustment' CHECK (reason IN ('sale', 'return', 'manual_adjustment', 'restock', 'damage', 'transfer')),
  notes text DEFAULT '',
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_tenant_id ON inventory_logs(tenant_id);

-- ==================== TRIGGERS ====================
CREATE OR REPLACE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_variants_updated_at BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS: CATEGORIES ====================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Tenant members can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = categories.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins and managers can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = categories.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager')
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins and managers can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = categories.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager')
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = categories.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager')
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = categories.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: PRODUCTS ====================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (status = 'active');

CREATE POLICY "Tenant members can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = products.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = products.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = products.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = products.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = products.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: PRODUCT VARIANTS ====================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active variants"
  ON product_variants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Tenant members can view all variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = product_variants.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can insert variants"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = product_variants.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins and managers can update variants"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = product_variants.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager', 'operative')
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = product_variants.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role IN ('store_admin', 'manager', 'operative')
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can delete variants"
  ON product_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = product_variants.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: INVENTORY LOGS ====================
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view inventory logs"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = inventory_logs.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Tenant members can insert inventory logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = inventory_logs.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );
