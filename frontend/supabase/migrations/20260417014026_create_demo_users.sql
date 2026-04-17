
/*
  # Create Demo Users for All Roles

  Creates 4 demo accounts using the proper auth.users insertion pattern
  that Supabase's auth engine expects, including all required fields.

  Roles covered:
  - super_admin: Platform-wide SaaS admin
  - store_admin: Full store admin for TechStore Pro
  - manager: Store manager for TechStore Pro
  - operative: Store operative for TechStore Pro

  All passwords: Demo1234!
*/

DO $$
DECLARE
  v_super_id uuid := 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa';
  v_admin_id uuid := 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa';
  v_manager_id uuid := 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';
  v_operative_id uuid := 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa';
  v_tenant_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token,
    reauthentication_token, email_change_confirm_status
  ) VALUES
  (
    v_super_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'superadmin@demo.com', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Super Admin"}',
    false, false, false,
    '', '', '', '', '', '', '', 0
  ),
  (
    v_admin_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'storeadmin@demo.com', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Store Admin"}',
    false, false, false,
    '', '', '', '', '', '', '', 0
  ),
  (
    v_manager_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'manager@demo.com', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Store Manager"}',
    false, false, false,
    '', '', '', '', '', '', '', 0
  ),
  (
    v_operative_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'operative@demo.com', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Store Operative"}',
    false, false, false,
    '', '', '', '', '', '', '', 0
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (v_super_id, v_super_id, 'superadmin@demo.com', 'email',
     jsonb_build_object('sub', v_super_id::text, 'email', 'superadmin@demo.com', 'email_verified', true, 'provider', 'email'),
     now(), now(), now()),
    (v_admin_id, v_admin_id, 'storeadmin@demo.com', 'email',
     jsonb_build_object('sub', v_admin_id::text, 'email', 'storeadmin@demo.com', 'email_verified', true, 'provider', 'email'),
     now(), now(), now()),
    (v_manager_id, v_manager_id, 'manager@demo.com', 'email',
     jsonb_build_object('sub', v_manager_id::text, 'email', 'manager@demo.com', 'email_verified', true, 'provider', 'email'),
     now(), now(), now()),
    (v_operative_id, v_operative_id, 'operative@demo.com', 'email',
     jsonb_build_object('sub', v_operative_id::text, 'email', 'operative@demo.com', 'email_verified', true, 'provider', 'email'),
     now(), now(), now())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO user_profiles (id, full_name, system_role) VALUES
    (v_super_id, 'Super Admin', 'super_admin'),
    (v_admin_id, 'Store Admin', NULL),
    (v_manager_id, 'Store Manager', NULL),
    (v_operative_id, 'Store Operative', NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO tenant_memberships (id, user_id, tenant_id, role, is_active)
  VALUES
    (gen_random_uuid(), v_admin_id, v_tenant_id, 'store_admin', true),
    (gen_random_uuid(), v_manager_id, v_tenant_id, 'manager', true),
    (gen_random_uuid(), v_operative_id, v_tenant_id, 'operative', true)
  ON CONFLICT DO NOTHING;

END $$;
