-- SQL Script for Payroll Aggregation RPC
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION calculate_payroll_cycle(start_date DATE, end_date DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH attendance_summary AS (
    SELECT 
      emp_id,
      SUM(total_hours) as payable_hours
    FROM attendance
    WHERE date >= start_date AND date <= end_date
    GROUP BY emp_id
  ),
  leave_summary AS (
    SELECT 
      emp_id,
      SUM(days) as unpaid_leave_days
    FROM leave_applications
    WHERE 
      status = 'Approved' 
      AND leave_type_id = (SELECT id FROM leave_types WHERE name ILIKE '%unpaid%' LIMIT 1)
      AND from_date >= start_date 
      AND to_date <= end_date
    GROUP BY emp_id
  )
  SELECT json_agg(
    json_build_object(
      'emp_id', e.id,
      'email', e.email,
      'payable_hours', COALESCE(a.payable_hours, 0),
      'unpaid_leave_days', COALESCE(l.unpaid_leave_days, 0)
    )
  ) INTO result
  FROM employees e
  LEFT JOIN attendance_summary a ON a.emp_id = e.id
  LEFT JOIN leave_summary l ON l.emp_id = e.id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
