
/*
  # Fix Recursive RLS Policies and Add New User Trigger

  ## Problems
  1. is_super_admin() SECURITY DEFINER function has no search_path set, causing
     potential resolution issues.
  2. "Store admins can view tenant memberships" policy is self-referential —
     it queries tenant_memberships to check if you're a store_admin in
     tenant_memberships, causing infinite recursion for any non-admin user.
  3. No handle_new_user trigger — new registrations never get a user_profiles
     row, causing all subsequent profile queries to return null.

  ## Fixes
  1. Recreate is_super_admin() with SET search_path = public
  2. Create is_store_admin(uuid) helper (SECURITY DEFINER) to break the
     recursive tenant_memberships policy
  3. Replace recursive tenant_memberships SELECT policy with helper function
  4. Add handle_new_user trigger on auth.users to auto-create user_profiles
*/

-- ==================== FIX is_super_admin search_path ====================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND system_role = 'super_admin'
  );
$$;

-- ==================== NEW: is_store_admin helper ====================

CREATE OR REPLACE FUNCTION is_store_admin_of(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND role = 'store_admin'
    AND is_active = true
  );
$$;

-- ==================== FIX recursive tenant_memberships policies ====================

DROP POLICY IF EXISTS "Store admins can view tenant memberships" ON tenant_memberships;
DROP POLICY IF EXISTS "Store admins can insert memberships for their tenant" ON tenant_memberships;
DROP POLICY IF EXISTS "Store admins can update memberships for their tenant" ON tenant_memberships;

CREATE POLICY "Store admins can view tenant memberships"
  ON tenant_memberships FOR SELECT
  TO authenticated
  USING (is_store_admin_of(tenant_id));

CREATE POLICY "Store admins can insert memberships for their tenant"
  ON tenant_memberships FOR INSERT
  TO authenticated
  WITH CHECK (is_store_admin_of(tenant_id));

CREATE POLICY "Store admins can update memberships for their tenant"
  ON tenant_memberships FOR UPDATE
  TO authenticated
  USING (is_store_admin_of(tenant_id))
  WITH CHECK (is_store_admin_of(tenant_id));

-- ==================== NEW: handle_new_user trigger ====================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
