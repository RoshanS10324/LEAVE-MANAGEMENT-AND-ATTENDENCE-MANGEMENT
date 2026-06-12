import { createClient } from "@supabase/supabase-js";

// LAMS Supabase details
const supabaseUrl = "https://gjhcqsfgztccmedonsyx.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateEmails() {
  console.log("Updating manager emails to roshankumar100324@gmail.com to bypass Resend free-tier restrictions...");

  // Update all employees with role 'manager' to use the verified email
  const { data, error } = await supabase
    .from("employees")
    .update({ email: "roshankumar100324@gmail.com" })
    .eq("role", "manager")
    .select("name, email");

  if (error) {
    console.error("Failed to update employees:", error.message);
  } else {
    console.log("Successfully updated the following managers:");
    console.log(data);
    console.log("\n✅ Now, any email sent to these managers will correctly reach your Gmail inbox!");
  }
}

updateEmails();
