import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gjhcqsfgztccmedonsyx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

async function main() {
  const year = new Date().getFullYear();
  console.log("Fetching employees...");
  
  // Fetch all employees except super_admin
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, name, role")
    .neq("role", "super_admin");
    
  if (empErr) return console.error("Employee fetch error:", empErr);
  
  const empIds = employees.map(e => e.id);
  
  console.log(`Updating leave balances for ${empIds.length} employees to have 10 days...`);
  
  // Update all existing balances to have a total of 10
  const { data, error } = await supabase
    .from("leave_balances")
    .update({ total: 10 })
    .in("emp_id", empIds)
    .eq("year", year)
    .select();
    
  if (error) {
    console.error("Error updating:", error.message);
  } else {
    console.log(`✅ Successfully updated ${data.length} leave balances to 10 days!`);
  }
}

main();
