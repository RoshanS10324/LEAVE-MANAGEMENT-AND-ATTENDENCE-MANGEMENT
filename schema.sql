-- Recreated Schema for Leave & Attendance System

-- Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('employee', 'manager', 'hr')) DEFAULT 'employee',
    status TEXT DEFAULT 'Active',
    department TEXT,
    designation TEXT,
    manager_id UUID REFERENCES public.employees(id),
    shift_id UUID REFERENCES public.shifts(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekend Policy Table
CREATE TABLE IF NOT EXISTS public.weekend_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saturday_off BOOLEAN DEFAULT true,
    sunday_off BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Face Descriptors (Biometrics)
CREATE TABLE IF NOT EXISTS public.face_descriptors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    descriptor JSONB NOT NULL, -- The 128D Float32Array stored as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT, -- 'Present', 'Absent', 'Half Day'
    face_verified BOOLEAN DEFAULT false,
    face_confidence NUMERIC,
    is_late BOOLEAN DEFAULT false,
    early_leave BOOLEAN DEFAULT false,
    overtime_hours NUMERIC DEFAULT 0,
    check_in_location TEXT,
    check_out_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emp_id, date)
);

-- Leave Types
CREATE TABLE IF NOT EXISTS public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_paid BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave Balances
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total NUMERIC NOT NULL,
    used NUMERIC DEFAULT 0,
    UNIQUE(emp_id, leave_type_id, year)
);

-- Leave Applications
CREATE TABLE IF NOT EXISTS public.leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days NUMERIC NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')) DEFAULT 'Pending',
    approver_id UUID REFERENCES public.employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC for incrementing leave balance
CREATE OR REPLACE FUNCTION increment_leave_balance(p_emp_id UUID, p_leave_type_id UUID, p_year INTEGER, p_days NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.leave_balances
    SET used = used + p_days
    WHERE emp_id = p_emp_id AND leave_type_id = p_leave_type_id AND year = p_year;
END;
$$ LANGUAGE plpgsql;

-- RPC for decrementing leave balance
CREATE OR REPLACE FUNCTION decrement_leave_balance(p_emp_id UUID, p_leave_type_id UUID, p_year INTEGER, p_days NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.leave_balances
    SET used = GREATEST(0, used - p_days)
    WHERE emp_id = p_emp_id AND leave_type_id = p_leave_type_id AND year = p_year;
END;
$$ LANGUAGE plpgsql;
