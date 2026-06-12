import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Validate HRMS Secret token
  const authHeader = req.headers.get("X-HRMS-Signature")
  if (authHeader !== Deno.env.get("HRMS_WEBHOOK_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  try {
    const payload = await req.json()
    const { eventType, employeeData } = payload

    if (!eventType || !employeeData) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 })
    }

    if (eventType === 'employee.created' || eventType === 'employee.updated') {
      // Map HRMS fields to LAMS fields
      const lamsEmployee = {
        name: employeeData.fullName,
        email: employeeData.workEmail,
        department: employeeData.department,
        designation: employeeData.jobTitle,
        status: employeeData.status === 'Active' ? 'active' : 'inactive',
        // Set a default role if new, otherwise don't overwrite
        role: employeeData.role || 'employee' 
      }

      // Upsert by email
      const { error } = await supabase
        .from('employees')
        .upsert(lamsEmployee, { onConflict: 'email' })

      if (error) throw error

      return new Response(JSON.stringify({ success: true, message: "Employee synced" }), { status: 200 })
    }

    if (eventType === 'employee.terminated') {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('email', employeeData.workEmail)

      if (error) throw error
      
      return new Response(JSON.stringify({ success: true, message: "Employee terminated" }), { status: 200 })
    }

    return new Response(JSON.stringify({ message: "Event ignored" }), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
