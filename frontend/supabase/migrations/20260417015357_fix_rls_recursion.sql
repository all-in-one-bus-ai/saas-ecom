
/*
  # Fix RLS Recursion on user_profiles

  ## Problem
  The "Database error querying schema" on login is caused by circular RLS policy
  evaluation. The "Super admins can view all profiles" policy queries user_profiles
  to check if the current user is a super_admin — but that check itself triggers
  another RLS evaluation on user_profiles, causing infinite recursion.

  Supabase auth reads user data during login, which triggers these policies.

  ## Fix
  1. Create a SECURITY DEFINER helper function that bypasses RLS to check super_admin status
  2. Replace recursive policies with the helper function
  3. Same fix applied to any other policies that self-reference user_profiles

  ## Changes
  - New function: `is_super_admin()` — SECURITY DEFINER, bypasses RLS
  - Drops and recreates recursive policies on user_profiles, tenants, tenant_memberships, subscriptions
*/

-- Helper function: checks super_admin status without triggering RLS
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND system_role = 'super_admin'
  );
$$;

-- ==================== FIX user_profiles RLS ====================

DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- ==================== FIX tenants RLS ====================

DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Super admins can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Super admins can update tenants" ON tenants;
DROP POLICY IF EXISTS "Super admins can delete tenants" ON tenants;

CREATE POLICY "Super admins can view all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- ==================== FIX tenant_memberships RLS ====================

DROP POLICY IF EXISTS "Super admins can view all memberships" ON tenant_memberships;

CREATE POLICY "Super admins can view all memberships"
  ON tenant_memberships FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- ==================== FIX subscriptions RLS ====================

DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can update subscriptions" ON subscriptions;

CREATE POLICY "Super admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
