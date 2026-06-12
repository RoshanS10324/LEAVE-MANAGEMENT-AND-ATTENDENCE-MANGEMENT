-- HRMS Integration: creates tables and adds columns to employees
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS hrms_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT false,
  provider text DEFAULT 'Custom CSV',
  api_endpoint text,
  api_key_hint text,
  webhook_secret text DEFAULT gen_random_uuid()::text,
  field_mappings jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hrms_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text DEFAULT 'manual',
  source text DEFAULT 'csv',
  total_records int DEFAULT 0,
  created_count int DEFAULT 0,
  updated_count int DEFAULT 0,
  skipped_count int DEFAULT 0,
  error_count int DEFAULT 0,
  status text DEFAULT 'success',
  error_details jsonb DEFAULT '[]',
  synced_by uuid REFERENCES employees(id),
  synced_at timestamptz DEFAULT now()
);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS hrms_id text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hrms_source text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hrms_synced_at timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES employees(id);

INSERT INTO hrms_config (is_active, provider)
VALUES (true, 'Custom CSV')
ON CONFLICT DO NOTHING;
