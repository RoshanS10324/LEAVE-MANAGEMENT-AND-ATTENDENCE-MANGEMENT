-- ============================================================
-- STEP 1: Run this in Supabase SQL Editor to create test users
-- Go to: https://supabase.com/dashboard/project/gjhcqsfgztccmedonsyx/sql/new
-- ============================================================

-- First, create the auth users via Supabase Dashboard:
-- Go to Authentication > Users > "Add user" button
-- Create these two users manually in the UI:
--   Email: hr@lams.com     Password: Admin@1234
--   Email: emp@lams.com    Password: Admin@1234

-- ============================================================
-- STEP 2: After creating auth users, run this SQL to link them
-- to employee profiles. Replace the UUIDs with the actual ones
-- shown in the Auth > Users list after you create them.
-- ============================================================

-- Insert HR employee (replace 'PASTE-HR-AUTH-UUID-HERE' with real UUID from Auth dashboard)
INSERT INTO employees (auth_user_id, name, email, role, department, designation, status)
VALUES (
  'PASTE-HR-AUTH-UUID-HERE',
  'Sarah Reyes',
  'hr@lams.com',
  'hr',
  'Human Resources',
  'HR Administrator',
  'Active'
)
ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;

-- Insert Employee (replace 'PASTE-EMP-AUTH-UUID-HERE' with real UUID from Auth dashboard)
INSERT INTO employees (auth_user_id, name, email, role, department, designation, status)
VALUES (
  'PASTE-EMP-AUTH-UUID-HERE',
  'Arjun Mehta',
  'emp@lams.com',
  'employee',
  'Engineering',
  'Sr. Engineer',
  'Active'
)
ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;

-- ============================================================
-- STEP 3: Verify the links are correct
-- ============================================================
SELECT e.name, e.email, e.role, e.auth_user_id 
FROM employees e 
WHERE e.auth_user_id IS NOT NULL;
