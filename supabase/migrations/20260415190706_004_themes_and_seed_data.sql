/*
  # Themes Schema & Seed Data

  ## Overview
  Theme system for multi-tenant storefronts plus seed data for demo purposes.

  ## New Tables

  ### themes
  - Pre-bundled theme templates available to all tenants
  - Fields: name, slug, preview_url, is_active

  ### tenant_themes
  - Active theme selection + customization config per tenant
  - Fields: tenant_id, theme_id, config (JSON with color overrides, fonts, layout options), is_active

  ## Seed Data
  - 3 built-in themes: Minimal, Bold, Classic
  - 2 demo tenants: TechStore, FashionBoutique
  - Sample products and categories

  ## Security
  - themes: public read, super admin write
  - tenant_themes: tenant-scoped read/write for store admins
*/

-- ==================== THEMES ====================
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  preview_url text DEFAULT '',
  thumbnail_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  default_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ==================== TENANT THEMES ====================
CREATE TABLE IF NOT EXISTS tenant_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_themes_tenant_id ON tenant_themes(tenant_id);

-- ==================== TRIGGER ====================
CREATE OR REPLACE TRIGGER update_tenant_themes_updated_at BEFORE UPDATE ON tenant_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS: THEMES ====================
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active themes"
  ON themes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can insert themes"
  ON themes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update themes"
  ON themes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

-- ==================== RLS: TENANT THEMES ====================
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their themes"
  ON tenant_themes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = tenant_themes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can insert tenant themes"
  ON tenant_themes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = tenant_themes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can update tenant themes"
  ON tenant_themes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = tenant_themes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = tenant_themes.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== SEED: 3 THEMES ====================
INSERT INTO themes (name, slug, description, default_config) VALUES
(
  'Minimal',
  'minimal',
  'Clean, whitespace-focused design with subtle typography and no visual noise.',
  '{"colors":{"primary":"#0f172a","primary_foreground":"#f8fafc","secondary":"#f1f5f9","secondary_foreground":"#0f172a","accent":"#0ea5e9","accent_foreground":"#ffffff","background":"#ffffff","foreground":"#0f172a","muted":"#f8fafc","muted_foreground":"#64748b","border":"#e2e8f0","card":"#ffffff","card_foreground":"#0f172a"},"fonts":{"heading":"Inter","body":"Inter"},"radius":"0.375rem","layout":{"header_sticky":true,"show_announcement_bar":false,"product_grid_cols":3,"show_product_quick_view":true}}'::jsonb
),
(
  'Bold',
  'bold',
  'High-contrast, energetic design with vivid colors and strong typography.',
  '{"colors":{"primary":"#dc2626","primary_foreground":"#ffffff","secondary":"#fef2f2","secondary_foreground":"#dc2626","accent":"#f97316","accent_foreground":"#ffffff","background":"#ffffff","foreground":"#111827","muted":"#f9fafb","muted_foreground":"#6b7280","border":"#e5e7eb","card":"#ffffff","card_foreground":"#111827"},"fonts":{"heading":"Montserrat","body":"Inter"},"radius":"0.125rem","layout":{"header_sticky":true,"show_announcement_bar":true,"product_grid_cols":4,"show_product_quick_view":false}}'::jsonb
),
(
  'Classic',
  'classic',
  'Timeless, elegant design inspired by luxury retail with warm tones and serif typography.',
  '{"colors":{"primary":"#292524","primary_foreground":"#fafaf9","secondary":"#fafaf9","secondary_foreground":"#292524","accent":"#b45309","accent_foreground":"#ffffff","background":"#fffbf5","foreground":"#1c1917","muted":"#f5f5f4","muted_foreground":"#78716c","border":"#d6d3d1","card":"#ffffff","card_foreground":"#1c1917"},"fonts":{"heading":"Playfair Display","body":"Lora"},"radius":"0.25rem","layout":{"header_sticky":false,"show_announcement_bar":true,"product_grid_cols":3,"show_product_quick_view":true}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ==================== SEED: DEMO TENANTS ====================
INSERT INTO tenants (id, slug, name, description, status, plan) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'techstore',
  'TechStore Pro',
  'Premium electronics and gadgets for professionals',
  'active',
  'professional'
),
(
  '22222222-2222-2222-2222-222222222222',
  'fashionboutique',
  'Fashion Boutique',
  'Curated fashion from independent designers',
  'active',
  'starter'
)
ON CONFLICT (slug) DO NOTHING;

-- ==================== SEED: DEMO CATEGORIES ====================
INSERT INTO categories (tenant_id, name, slug, description, is_active, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Laptops', 'laptops', 'Professional laptops and workstations', true, 1),
('11111111-1111-1111-1111-111111111111', 'Smartphones', 'smartphones', 'Latest smartphones and accessories', true, 2),
('11111111-1111-1111-1111-111111111111', 'Audio', 'audio', 'Headphones, speakers, and audio gear', true, 3),
('22222222-2222-2222-2222-222222222222', 'Dresses', 'dresses', 'Evening and casual dresses', true, 1),
('22222222-2222-2222-2222-222222222222', 'Accessories', 'accessories', 'Bags, jewelry, and more', true, 2),
('22222222-2222-2222-2222-222222222222', 'Outerwear', 'outerwear', 'Jackets and coats', true, 3)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ==================== SEED: DEMO PRODUCTS ====================
DO $$
DECLARE
  cat_laptops uuid;
  cat_phones uuid;
  cat_audio uuid;
  cat_dresses uuid;
  prod1 uuid;
  prod2 uuid;
  prod3 uuid;
  prod4 uuid;
BEGIN
  SELECT id INTO cat_laptops FROM categories WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND slug = 'laptops';
  SELECT id INTO cat_phones FROM categories WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND slug = 'smartphones';
  SELECT id INTO cat_audio FROM categories WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND slug = 'audio';
  SELECT id INTO cat_dresses FROM categories WHERE tenant_id = '22222222-2222-2222-2222-222222222222' AND slug = 'dresses';

  INSERT INTO products (tenant_id, category_id, name, slug, description, price, compare_at_price, status, is_featured, images)
  VALUES
  (
    '11111111-1111-1111-1111-111111111111', cat_laptops,
    'ProBook X1 Ultra', 'probook-x1-ultra',
    'The ultimate developer laptop with 32GB RAM, 1TB NVMe SSD, and a stunning 4K OLED display.',
    2499.00, 2799.00, 'active', true,
    '[{"url": "https://images.pexels.com/photos/18105/pexels-photo.jpg", "alt": "ProBook X1 Ultra"}]'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111111', cat_phones,
    'NexPhone 15 Pro', 'nexphone-15-pro',
    'Flagship smartphone with AI-powered camera system and all-day battery life.',
    999.00, 1099.00, 'active', true,
    '[{"url": "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg", "alt": "NexPhone 15 Pro"}]'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111111', cat_audio,
    'SoundWave Pro 500', 'soundwave-pro-500',
    'Studio-quality wireless headphones with 40-hour battery and active noise cancellation.',
    349.00, 399.00, 'active', false,
    '[{"url": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg", "alt": "SoundWave Pro 500"}]'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222', cat_dresses,
    'Silk Evening Gown', 'silk-evening-gown',
    'Luxurious silk evening gown with hand-embroidered details. Perfect for formal occasions.',
    589.00, 750.00, 'active', true,
    '[{"url": "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg", "alt": "Silk Evening Gown"}]'::jsonb
  )
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  SELECT id INTO prod1 FROM products WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND slug = 'probook-x1-ultra';
  SELECT id INTO prod2 FROM products WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND slug = 'nexphone-15-pro';
  SELECT id INTO prod3 FROM products WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND slug = 'soundwave-pro-500';
  SELECT id INTO prod4 FROM products WHERE tenant_id = '22222222-2222-2222-2222-222222222222' AND slug = 'silk-evening-gown';

  IF prod1 IS NOT NULL THEN
    INSERT INTO product_variants (product_id, tenant_id, name, sku, stock_qty, attributes)
    VALUES
    (prod1, '11111111-1111-1111-1111-111111111111', '16GB / 512GB', 'PBX1-16-512', 15, '{"ram": "16GB", "storage": "512GB"}'::jsonb),
    (prod1, '11111111-1111-1111-1111-111111111111', '32GB / 1TB', 'PBX1-32-1TB', 8, '{"ram": "32GB", "storage": "1TB"}'::jsonb)
    ON CONFLICT (tenant_id, sku) DO NOTHING;
  END IF;

  IF prod2 IS NOT NULL THEN
    INSERT INTO product_variants (product_id, tenant_id, name, sku, stock_qty, attributes)
    VALUES
    (prod2, '11111111-1111-1111-1111-111111111111', 'Space Black / 256GB', 'NEX15-BLK-256', 25, '{"color": "Space Black", "storage": "256GB"}'::jsonb),
    (prod2, '11111111-1111-1111-1111-111111111111', 'Silver / 512GB', 'NEX15-SLV-512', 12, '{"color": "Silver", "storage": "512GB"}'::jsonb)
    ON CONFLICT (tenant_id, sku) DO NOTHING;
  END IF;

  IF prod3 IS NOT NULL THEN
    INSERT INTO product_variants (product_id, tenant_id, name, sku, stock_qty, attributes)
    VALUES
    (prod3, '11111111-1111-1111-1111-111111111111', 'Midnight Black', 'SWP500-BLK', 40, '{"color": "Midnight Black"}'::jsonb),
    (prod3, '11111111-1111-1111-1111-111111111111', 'Pearl White', 'SWP500-WHT', 22, '{"color": "Pearl White"}'::jsonb)
    ON CONFLICT (tenant_id, sku) DO NOTHING;
  END IF;

  IF prod4 IS NOT NULL THEN
    INSERT INTO product_variants (product_id, tenant_id, name, sku, stock_qty, attributes)
    VALUES
    (prod4, '22222222-2222-2222-2222-222222222222', 'Midnight Blue / Size 6', 'SEG-BLUE-6', 3, '{"color": "Midnight Blue", "size": "6"}'::jsonb),
    (prod4, '22222222-2222-2222-2222-222222222222', 'Champagne / Size 8', 'SEG-CHMP-8', 5, '{"color": "Champagne", "size": "8"}'::jsonb)
    ON CONFLICT (tenant_id, sku) DO NOTHING;
  END IF;

END $$;

-- ==================== SEED: TENANT THEME ASSIGNMENTS ====================
INSERT INTO tenant_themes (tenant_id, theme_id, config, is_active)
SELECT
  '11111111-1111-1111-1111-111111111111',
  t.id,
  '{}'::jsonb,
  true
FROM themes t WHERE t.slug = 'minimal'
ON CONFLICT (tenant_id, theme_id) DO NOTHING;

INSERT INTO tenant_themes (tenant_id, theme_id, config, is_active)
SELECT
  '22222222-2222-2222-2222-222222222222',
  t.id,
  '{}'::jsonb,
  true
FROM themes t WHERE t.slug = 'classic'
ON CONFLICT (tenant_id, theme_id) DO NOTHING;

-- ==================== SEED: STORE SETTINGS ====================
INSERT INTO store_settings (tenant_id, key, value) VALUES
('11111111-1111-1111-1111-111111111111', 'currency', 'USD'),
('11111111-1111-1111-1111-111111111111', 'tax_rate', '0.08'),
('11111111-1111-1111-1111-111111111111', 'shipping_enabled', 'true'),
('11111111-1111-1111-1111-111111111111', 'free_shipping_threshold', '100'),
('22222222-2222-2222-2222-222222222222', 'currency', 'USD'),
('22222222-2222-2222-2222-222222222222', 'tax_rate', '0.09'),
('22222222-2222-2222-2222-222222222222', 'shipping_enabled', 'true'),
('22222222-2222-2222-2222-222222222222', 'free_shipping_threshold', '150')
ON CONFLICT (tenant_id, key) DO NOTHING;
