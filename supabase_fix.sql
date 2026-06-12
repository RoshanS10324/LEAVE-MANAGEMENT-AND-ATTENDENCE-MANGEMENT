-- ============================================================
-- SQL COMMANDS TO RUN IN SUPABASE SQL EDITOR
-- Run these to fix the database schema
-- ============================================================

-- 1. Create missing tables
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

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  head TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create RPC functions
CREATE OR REPLACE FUNCTION public.increment_leave_balance(p_emp_id UUID, p_leave_type_id UUID, p_year INTEGER, p_days NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leave_balances
  SET used = used + p_days
  WHERE emp_id = p_emp_id AND leave_type_id = p_leave_type_id AND year = p_year;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_leave_balance(p_emp_id UUID, p_leave_type_id UUID, p_year INTEGER, p_days NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leave_balances
  SET used = GREATEST(0, used - p_days)
  WHERE emp_id = p_emp_id AND leave_type_id = p_leave_type_id AND year = p_year;
END;
$$;

-- 3. Enable RLS and create anon policies for all tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['employees','shifts','attendance','leave_types','leave_balances','leave_applications','notifications','audit_logs','face_descriptors','weekend_policy','holidays','regularization_requests','departments','designations'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS anon_all ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY anon_all ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END;
$$;
