ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('employee','manager','hr','super_admin'));

CREATE TABLE IF NOT EXISTS biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  location text NOT NULL,
  model text NOT NULL,
  ip_address text,
  port int DEFAULT 4370,
  total_users int DEFAULT 0,
  last_sync timestamptz,
  status text DEFAULT 'online' CHECK (status IN ('online','offline','syncing','error')),
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biometric_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text REFERENCES biometric_devices(device_id),
  emp_id uuid REFERENCES employees(id),
  punch_time timestamptz NOT NULL,
  punch_type text CHECK (punch_type IN ('in','out','break','return')),
  raw_data jsonb,
  processed bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biometric_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text REFERENCES biometric_devices(device_id),
  synced_at timestamptz DEFAULT now(),
  punches_pulled int DEFAULT 0,
  status text DEFAULT 'success',
  error_message text
);

INSERT INTO biometric_devices (device_id, location, model, ip_address, total_users, last_sync, status) VALUES
('BIO-A-01','Bengaluru · Zone A · Main Entrance','ZKTeco MB360','192.168.1.101',1240,now()-interval '2 minutes','online'),
('BIO-A-02','Bengaluru · Zone A · Cafeteria','ZKTeco MB360','192.168.1.102',980,now()-interval '4 minutes','online'),
('BIO-B-01','Mumbai · HQ · Entrance','Suprema BioStation 3','192.168.2.101',1680,now()-interval '1 minute','online'),
('BIO-C-01','Singapore · Office','Hikvision DS-K1T804','192.168.3.101',420,now()-interval '8 minutes','online'),
('BIO-D-01','Austin HQ','ZKTeco MB360','192.168.4.101',560,now()-interval '3 hours','error')
ON CONFLICT DO NOTHING;

ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON biometric_devices;
DROP POLICY IF EXISTS "allow_all" ON biometric_punches;
DROP POLICY IF EXISTS "allow_all" ON biometric_sync_logs;
CREATE POLICY "allow_all" ON biometric_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON biometric_punches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON biometric_sync_logs FOR ALL USING (true) WITH CHECK (true);