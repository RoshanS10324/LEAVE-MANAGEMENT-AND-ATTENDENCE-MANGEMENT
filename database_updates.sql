-- Update leave_applications status values
ALTER TABLE leave_applications
  DROP CONSTRAINT IF EXISTS leave_applications_status_check;
ALTER TABLE leave_applications
  ADD CONSTRAINT leave_applications_status_check
  CHECK (status IN (
    'Pending',
    'Manager_Approved',
    'Manager_Rejected',
    'Approved',
    'Rejected',
    'Cancelled'
  ));

-- Add manager_actioned_at and hr_actioned_at columns
ALTER TABLE leave_applications
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS manager_actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_comments text,
  ADD COLUMN IF NOT EXISTS hr_actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS hr_comments text,
  ADD COLUMN IF NOT EXISTS balance_updated bool DEFAULT false;

-- Update regularizations status values
ALTER TABLE regularizations
  DROP CONSTRAINT IF EXISTS regularizations_status_check;
ALTER TABLE regularizations
  ADD CONSTRAINT regularizations_status_check
  CHECK (status IN (
    'Pending',
    'Manager_Approved',
    'Manager_Rejected',
    'Approved',
    'Rejected'
  ));

-- Add payroll sync to regularizations
ALTER TABLE regularizations
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS manager_actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_comments text,
  ADD COLUMN IF NOT EXISTS hr_actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS hr_comments text,
  ADD COLUMN IF NOT EXISTS attendance_updated bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_synced bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_synced_at timestamptz;

-- Migrate existing data
UPDATE leave_applications
  SET status = 'Approved'
  WHERE status NOT IN (
    'Pending','Manager_Approved','Manager_Rejected',
    'Approved','Rejected','Cancelled'
  );

UPDATE regularizations
  SET status = 'Pending'
  WHERE status NOT IN (
    'Pending','Manager_Approved','Manager_Rejected',
    'Approved','Rejected'
  );
