-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- AFTER you have run migrations (001_initial_schema.sql) and seed.sql

-- Demo organization (safe if already exists)
INSERT INTO organizations (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Sortyx Demo', 'sortyx-demo')
ON CONFLICT (id) DO NOTHING;

-- Attach YOUR auth user as Admin (change email if you used a different one)
UPDATE profiles SET
  organization_id = 'a0000000-0000-4000-8000-000000000001',
  role = 'admin',
  full_name = COALESCE(full_name, 'Admin')
WHERE email = 'assassinnightcap008@gmail.com';

-- If profile row is missing (trigger did not run), create it from auth.users
INSERT INTO profiles (id, email, full_name, role, organization_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin'::user_role,
  'a0000000-0000-4000-8000-000000000001'
FROM auth.users u
WHERE u.email = 'assassinnightcap008@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- Verify
SELECT id, email, role, organization_id FROM profiles
WHERE email = 'assassinnightcap008@gmail.com';
