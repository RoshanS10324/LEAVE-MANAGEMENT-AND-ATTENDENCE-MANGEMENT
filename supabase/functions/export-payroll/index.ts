import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Check auth
  const authHeader = req.headers.get("Authorization")
  if (authHeader !== `Bearer ${Deno.env.get("LAMS_API_KEY")}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  try {
    const { start_date, end_date } = await req.json()

    if (!start_date || !end_date) {
      return new Response(JSON.stringify({ error: "start_date and end_date required" }), { status: 400 })
    }

    // 1. Call the Postgres RPC to aggregate data
    const { data: payrollData, error: rpcError } = await supabase
      .rpc('calculate_payroll_cycle', { start_date, end_date })

    if (rpcError) throw rpcError

    if (!payrollData || payrollData.length === 0) {
      return new Response(JSON.stringify({ message: "No data to sync for this period" }), { status: 200 })
    }

    // 2. Map data to Payroll Provider schema (e.g., Gusto, RazorpayX)
    const providerPayload = {
      pay_period: { start_date, end_date },
      employees: payrollData.map((emp: any) => ({
        external_id: emp.emp_id,
        email: emp.email,
        regular_hours: emp.payable_hours,
        unpaid_time_off: emp.unpaid_leave_days * 8 // assuming 8hr days
      }))
    }

    // 3. Push to Payroll API (Mocked here)
    const PAYROLL_API_URL = Deno.env.get("PAYROLL_API_URL") || "https://api.payroll-provider.com/v1/sync"
    const PAYROLL_API_KEY = Deno.env.get("PAYROLL_API_KEY")

    console.log(`Sending payload to ${PAYROLL_API_URL}`, providerPayload)
    
    // const response = await fetch(PAYROLL_API_URL, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${PAYROLL_API_KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify(providerPayload)
    // })
    
    // if (!response.ok) throw new Error("Payroll API rejected payload")

    // 4. Log the audit event
    await supabase.from('audit_log').insert({
      action: 'PAYROLL_BATCH_SYNC',
      entity: 'payroll',
      new_value: { start_date, end_date, employees_synced: payrollData.length, status: 'Success' }
    })

    return new Response(JSON.stringify({ success: true, employees_synced: payrollData.length }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
