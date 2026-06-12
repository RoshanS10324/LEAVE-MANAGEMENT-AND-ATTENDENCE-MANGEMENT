import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjhcqsfgztccmedonsyx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function forceWipeAndSeed() {
  console.log("=========================================");
  console.log("🧨 INITIATING FORCE WIPE SEQUENCE...");
  
  // 1. Wipe dependent tables first to break Foreign Key locks
  console.log("🧹 Wiping leave_approvals...");
  await adminClient.from('leave_approvals').delete().neq('id', 'impossible_uuid');

  console.log("🧹 Wiping leave_requests...");
  await adminClient.from('leave_requests').delete().neq('id', 'impossible_uuid');

  console.log("🧹 Wiping leave_balances...");
  await adminClient.from('leave_balances').delete().neq('id', 'impossible_uuid');

  console.log("🧹 Wiping attendance_logs...");
  await adminClient.from('attendance_logs').delete().neq('id', 'impossible_uuid');

  // 2. Now wipe the employees table
  console.log("🧹 Wiping employees...");
  const { error: deleteErr } = await adminClient.from('employees').delete().neq('email', 'superadmin@gmail.com').neq('email', 'HR@gmail.com');
  
  if (deleteErr) {
    console.error("❌ Error wiping employees:", deleteErr.message);
    return;
  }
  console.log("✅ All old employees deleted!");

  console.log("\n🌱 SEEDING MASTER ACCOUNTS...");
  
  // 3. Upsert superadmin@gmail.com
  const { error: saErr } = await adminClient.from('employees').insert({
    name: "System Administrator",
    email: "superadmin@gmail.com",
    password: "123",
    role: "super_admin",
    department: "System",
    designation: "Super Admin"
  });

  if (saErr && saErr.code !== '23505') {
    console.error("❌ Error creating superadmin:", saErr.message);
  } else if (saErr && saErr.code === '23505') {
    await adminClient.from('employees').update({ password: '123' }).eq('email', 'superadmin@gmail.com');
  }
  console.log("✅ Master Account: superadmin@gmail.com (Pass: 123) [Role: Super Admin]");

  // 4. Upsert HR@gmail.com
  const { error: hrErr } = await adminClient.from('employees').insert({
    name: "HR Manager",
    email: "HR@gmail.com",
    password: "123",
    role: "hr",
    department: "Human Resources",
    designation: "HR Director"
  });

  if (hrErr && hrErr.code !== '23505') {
    console.error("❌ Error creating HR:", hrErr.message);
  } else if (hrErr && hrErr.code === '23505') {
    await adminClient.from('employees').update({ password: '123' }).eq('email', 'HR@gmail.com');
  }
  console.log("✅ Master Account: HR@gmail.com (Pass: 123) [Role: HR]");

  console.log("\n🎉 Database fully wiped and seeded!");
}

forceWipeAndSeed();
