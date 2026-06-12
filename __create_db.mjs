import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjhcqsfgztccmedonsyx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8';
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// Create the exec_sql function via raw SQL
async function createRPCFunctions() {
  // We need to use the management API or raw SQL
  // The Supabase REST API can't directly create functions
  // But we can try using the pg connection via the API
  console.log('Trying to create function via Supabase management API...');
  
  // Try to create via the supabase client raw query
  // This won't work via REST, let's try a different approach
  
  // Create tables using the REST API (insert a row to trigger table creation if the table is configured)
  // Actually, the table must already exist for REST API to work
  console.log('Checking what we can do via REST API...');
  
  // Let's try to use the Auth admin API to verify the service key works
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  console.log('Auth admin check:', usersError ? `ERROR: ${usersError.message}` : `OK - ${users?.users?.length || 0} users`);
  
  // Try creating the tables by inserting data
  // (tables need to exist first - this won't create them)
  
  console.log('\nRPC functions and tables need to be created via Supabase SQL editor.');
  console.log('Run these commands in Supabase SQL editor:');
  console.log(`
-- 1. Regularization Requests table
CREATE TABLE IF NOT EXISTS public.regularization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  correction TEXT,
  raised TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  head TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Designations table
CREATE TABLE IF NOT EXISTS public.designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Increment leave balance RPC
CREATE OR REPLACE FUNCTION public.increment_leave_balance(p_emp_id UUID, p_leave_type_id UUID, p_year INTEGER, p_days NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  UPDATE public.leave_balances
  SET used = used + p_days
  WHERE emp_id = p_emp_id AND leave_type_id = p_leave_type_id AND year = p_year;
END;
\$\$;

-- 5. Decrement leave balance RPC
CREATE OR REPLACE FUNCTION public.decrement_leave_balance(p_emp_id UUID, p_leave_type_id UUID, p_year INTEGER, p_days NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  UPDATE public.leave_balances
  SET used = GREATEST(0, used - p_days)
  WHERE emp_id = p_emp_id AND leave_type_id = p_leave_type_id AND year = p_year;
END;
\$\$;

-- 6. Enable RLS and allow service_role access
DO \$\$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['regularization_requests', 'departments', 'designations']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY service_role_all ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END;
\$\$;
`);
}

createRPCFunctions().catch(console.error);
