import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gjhcqsfgztccmedonsyx.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTU4NzEsImV4cCI6MjA5NDczMTg3MX0.6epaEU0ePrefYLuYRfpyBbh8ccDI_eina3bDU2Z0W7c";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
