import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjhcqsfgztccmedonsyx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testLogin() {
  console.log("🔍 Simulating login for superadmin@gmail.com...");
  
  const { data: user, error } = await adminClient
    .from("employees")
    .select("*")
    .eq("email", "superadmin@gmail.com")
    .eq("password", "123")
    .maybeSingle();

  if (error) {
    console.error("❌ Database Error:", error.message);
  } else if (!user) {
    console.error("❌ Login Failed: Invalid email or password! User not found in DB.");
  } else {
    console.log("✅ Login Success! User found:");
    console.log(user);
  }
}

testLogin();
