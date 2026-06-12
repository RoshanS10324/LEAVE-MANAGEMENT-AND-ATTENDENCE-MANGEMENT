import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjhcqsfgztccmedonsyx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function safeSeed() {
  console.log("=========================================");
  console.log("🌱 SEEDING NEW MASTER ACCOUNTS (SAFE MODE)...");
  
  const superAdminId = crypto.randomUUID();
  const hrId = crypto.randomUUID();

  // 1. Try to create superadmin@gmail.com
  const { error: saErr } = await adminClient.from('employees').insert({
    name: "System Administrator",
    email: "superadmin@gmail.com",
    password: "123",
    role: "super_admin",
    department: "System",
    designation: "Super Admin"
  });

  if (saErr && saErr.code !== '23505') { // 23505 is Unique Violation
    console.error("❌ Error creating superadmin:", saErr.message);
  } else if (saErr && saErr.code === '23505') {
    // If exists, force update the password
    await adminClient.from('employees').update({ password: '123' }).eq('email', 'superadmin@gmail.com');
    console.log("✅ Updated existing: superadmin@gmail.com (Pass: 123) [Role: Super Admin]");
  } else {
    console.log("✅ Created: superadmin@gmail.com (Pass: 123) [Role: Super Admin]");
  }

  // 2. Try to create HR@gmail.com
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
    console.log("✅ Updated existing: HR@gmail.com (Pass: 123) [Role: HR]");
  } else {
    console.log("✅ Created: HR@gmail.com (Pass: 123) [Role: HR]");
  }

  console.log("\n🎉 Database safely seeded! You can now log in with these new master credentials.");
}

safeSeed();
