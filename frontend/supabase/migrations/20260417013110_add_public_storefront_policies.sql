/*
  # Add public read policies for storefront

  1. Changes
    - `tenants`: Add public SELECT policy for active tenants (needed so storefront can load by slug without auth)
    - `tenant_themes`: Add public SELECT policy for active tenant themes (needed for storefront theme loading)
    - `product_variants`: Add public SELECT policy for variants of active products (needed for storefront product grid)

  2. Security
    - Public can only read tenants with status = 'active'
    - Public can only read tenant_themes that are marked is_active = true
    - Public can only read product_variants where the parent product is active
    - No write access is granted
*/

CREATE POLICY "Public can view active tenants"
  ON tenants FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public can view active tenant themes"
  ON tenant_themes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view variants of active products"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.status = 'active'
    )
  );
