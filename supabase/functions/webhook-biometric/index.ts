import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Simple API Key validation for security
  const authHeader = req.headers.get("Authorization")
  if (authHeader !== `Bearer ${Deno.env.get("LAMS_API_KEY")}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  try {
    const { punches } = await req.json()
    
    if (!punches || !Array.isArray(punches)) {
      return new Response(JSON.stringify({ error: "Invalid payload format" }), { status: 400 })
    }

    let processed = 0

    for (const punch of punches) {
      // Find employee by biometric device ID (assuming we added device_emp_id to employees table)
      // Alternatively, we match it to some identifier
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('device_emp_id', punch.device_emp_id)
        .maybeSingle()

      if (!emp) continue

      const punchDate = new Date(punch.timestamp).toISOString().split('T')[0]
      const punchTime = new Date(punch.timestamp).toTimeString().split(' ')[0]

      // Determine if this is a check-in or check-out (simplified logic)
      // Real logic would look at existing records for that day
      const { data: existingAtt } = await supabase
        .from('attendance')
        .select('*')
        .eq('emp_id', emp.id)
        .eq('date', punchDate)
        .maybeSingle()

      if (existingAtt) {
        // Update check_out
        await supabase
          .from('attendance')
          .update({ 
            check_out: punchTime,
            // You would calculate total_hours here based on check_in and punchTime
            source: 'biometric'
          })
          .eq('id', existingAtt.id)
      } else {
        // Insert new check_in
        await supabase
          .from('attendance')
          .insert({
            emp_id: emp.id,
            date: punchDate,
            check_in: punchTime,
            status: 'Present',
            source: 'biometric'
          })
      }
      processed++
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
