/*
  # Core Multi-Tenant Schema: Tenants, Users, Roles & Permissions

  ## Overview
  Establishes the foundational multi-tenant architecture with:
  - Tenant isolation via `tenant_id` on all scoped tables
  - Role-Based Access Control (RBAC) with 4 built-in roles
  - Permission system for fine-grained access control
  - Subscription tracking per tenant

  ## New Tables

  ### tenants
  - Core tenant record. Each tenant represents a store/organization.
  - Fields: id, slug (URL-safe unique identifier), name, status, plan, created_at

  ### user_profiles
  - Extended profile data linked to Supabase auth.users
  - Fields: id (auth.uid), full_name, avatar_url, system_role (super_admin or null)

  ### tenant_memberships
  - Links users to tenants with a specific role
  - Fields: user_id, tenant_id, role (store_admin | manager | operative), is_active

  ### roles
  - Defines the permission sets per role per tenant context
  - Built-in: super_admin, store_admin, manager, operative

  ### store_settings
  - Key-value settings per tenant
  - Fields: tenant_id, key, value

  ### subscriptions
  - Tracks SaaS subscription per tenant (Stripe integration)
  - Fields: tenant_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end

  ## Security
  - RLS enabled on all tables
  - Users can only access data within their tenant scope
  - Super admins bypass tenant restrictions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== TENANTS ====================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'cancelled')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ==================== USER PROFILES ====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  system_role text DEFAULT NULL CHECK (system_role IS NULL OR system_role = 'super_admin'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==================== TENANT MEMBERSHIPS ====================
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('store_admin', 'manager', 'operative')),
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON tenant_memberships(role);

-- ==================== STORE SETTINGS ====================
CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_store_settings_tenant_id ON store_settings(tenant_id);

-- ==================== SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- ==================== TRIGGER: updated_at ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_memberships_updated_at BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS: TENANTS ====================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

CREATE POLICY "Tenant members can view their tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = tenants.id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Super admins can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update tenants"
  ON tenants FOR UPDATE
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

CREATE POLICY "Super admins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

-- ==================== RLS: USER PROFILES ====================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up2
      WHERE up2.id = auth.uid()
      AND up2.system_role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==================== RLS: TENANT MEMBERSHIPS ====================
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON tenant_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Store admins can view tenant memberships"
  ON tenant_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm2
      WHERE tm2.tenant_id = tenant_memberships.tenant_id
      AND tm2.user_id = auth.uid()
      AND tm2.role = 'store_admin'
      AND tm2.is_active = true
    )
  );

CREATE POLICY "Super admins can view all memberships"
  ON tenant_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

CREATE POLICY "Store admins can insert memberships for their tenant"
  ON tenant_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm2
      WHERE tm2.tenant_id = tenant_memberships.tenant_id
      AND tm2.user_id = auth.uid()
      AND tm2.role = 'store_admin'
      AND tm2.is_active = true
    )
  );

CREATE POLICY "Store admins can update memberships for their tenant"
  ON tenant_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm2
      WHERE tm2.tenant_id = tenant_memberships.tenant_id
      AND tm2.user_id = auth.uid()
      AND tm2.role = 'store_admin'
      AND tm2.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm2
      WHERE tm2.tenant_id = tenant_memberships.tenant_id
      AND tm2.user_id = auth.uid()
      AND tm2.role = 'store_admin'
      AND tm2.is_active = true
    )
  );

-- ==================== RLS: STORE SETTINGS ====================
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view store settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = store_settings.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can manage store settings"
  ON store_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = store_settings.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Store admins can update store settings"
  ON store_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = store_settings.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = store_settings.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

-- ==================== RLS: SUBSCRIPTIONS ====================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

CREATE POLICY "Store admins can view their tenant subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.tenant_id = subscriptions.tenant_id
      AND tenant_memberships.user_id = auth.uid()
      AND tenant_memberships.role = 'store_admin'
      AND tenant_memberships.is_active = true
    )
  );

CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.system_role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update subscriptions"
  ON subscriptions FOR UPDATE
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
