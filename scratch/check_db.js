import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjhcqsfgztccmedonsyx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('--- Auth Users ---');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error listing auth users:', authError);
  } else {
    users.forEach(u => console.log(`Email: ${u.email}, ID: ${u.id}`));
  }

  console.log('\n--- Employees ---');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, email, role, auth_id');
  if (empError) {
    console.error('Error fetching employees:', empError);
  } else {
    employees.forEach(e => console.log(`Name: ${e.name}, Email: ${e.email}, Role: ${e.role}, Auth ID: ${e.auth_id}`));
  }
}

run();
