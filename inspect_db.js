import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjhcqsfgztccmedonsyx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function inspect() {
  console.log("=========================================");
  console.log("🔍 INSPECTING SUPABASE AUTH USERS TABLE");
  console.log("=========================================");
  const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers();
  if (authErr) {
    console.error("Error fetching auth users:", authErr.message);
  } else {
    authData.users.forEach(u => {
      console.log(`Email: ${u.email}`);
      console.log(`  - Auth ID: ${u.id}`);
      console.log(`  - Confirmed?: ${u.email_confirmed_at ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Created At: ${new Date(u.created_at).toLocaleString()}`);
      console.log('-----------------------------------------');
    });
    console.log(`Total Auth Users: ${authData.users.length}\n`);
  }

  console.log("=========================================");
  console.log("🔍 INSPECTING PUBLIC EMPLOYEES TABLE");
  console.log("=========================================");
  const { data: empData, error: empErr } = await adminClient.from('employees').select('*').order('created_at', { ascending: false });
  if (empErr) {
    console.error("Error fetching employees:", empErr.message);
  } else {
    empData.forEach(e => {
      console.log(`Name: ${e.name} | Email: ${e.email}`);
      console.log(`  - Auth ID: ${e.auth_id}`);
      console.log(`  - Role: ${e.role}`);
      console.log(`  - DB Status: ${e.status} | Is Active: ${e.is_active}`);
      console.log('-----------------------------------------');
    });
    console.log(`Total Employee Records: ${empData.length}\n`);
  }
}

inspect();
