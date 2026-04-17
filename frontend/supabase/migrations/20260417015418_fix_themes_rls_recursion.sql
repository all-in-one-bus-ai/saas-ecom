
/*
  # Fix themes RLS to use is_super_admin() helper

  Replaces direct user_profiles queries in themes policies
  with the is_super_admin() SECURITY DEFINER function to
  prevent any indirect recursion during auth token evaluation.
*/

DROP POLICY IF EXISTS "Super admins can insert themes" ON themes;
DROP POLICY IF EXISTS "Super admins can update themes" ON themes;

CREATE POLICY "Super admins can insert themes"
  ON themes FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update themes"
  ON themes FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
