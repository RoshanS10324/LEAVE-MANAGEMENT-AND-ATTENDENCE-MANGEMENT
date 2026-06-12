import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { PageContainer, PageHeader, StatTile } from "@/components/lams/page";
import { Timer, CheckCircle2, Clock, Calendar, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/overtime")({
  head: () => ({ meta: [{ title: "Overtime — LAMS" }] }),
  component: OvertimePage,
});

function formatHours(decimalHours: number) {
  if (!decimalHours) return "0h 0m";
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h}h ${m}m`;
}

function timeToDecimal(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

function MyOvertimeTab({ employee }: { employee: any }) {
  const [stats, setStats] = useState({ monthOt: 0, pendingReqs: 0, compOffEarned: 0, yearOt: 0 });
  const [requests, setRequests] = useState<any[]>([]);
  const [shiftEnd, setShiftEnd] = useState("");
  const [formData, setFormData] = useState({
    date: "",
    actualEnd: "",
    reason: "",
    compType: "comp_off",
    compDate: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (employee?.id) {
      fetchStats();
      fetchRequests();
    }
  }, [employee]);

  const fetchStats = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // This Month OT
    const { data: monthAtt } = await supabase
      .from("attendance")
      .select("overtime_hours")
      .eq("emp_id", employee.id)
      .gt("overtime_hours", 0)
      .gte("date", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)
      .lte("date", `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`);
    
    const monthOt = monthAtt?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0;

    // OT This Year
    const { data: yearAtt } = await supabase
      .from("attendance")
      .select("overtime_hours")
      .eq("emp_id", employee.id)
      .gt("overtime_hours", 0)
      .gte("date", `${currentYear}-01-01`)
      .lte("date", `${currentYear}-12-31`);
      
    const yearOt = yearAtt?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0;

    // Pending Reqs
    const { count: pendingReqs } = await supabase
      .from("overtime_requests")
      .select("*", { count: "exact", head: true })
      .eq("emp_id", employee.id)
      .eq("status", "Pending");

    // Comp Off Earned
    const { count: compOffEarned } = await supabase
      .from("overtime_requests")
      .select("*", { count: "exact", head: true })
      .eq("emp_id", employee.id)
      .eq("status", "Approved")
      .eq("compensation_type", "comp_off");

    setStats({ monthOt, pendingReqs: pendingReqs || 0, compOffEarned: compOffEarned || 0, yearOt });
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("overtime_requests")
      .select("*")
      .eq("emp_id", employee.id)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  const handleDateChange = async (date: string) => {
    setFormData(f => ({ ...f, date }));
    if (!employee?.id) return;
    
    // Auto-fetch shift end time
    const { data: emp } = await supabase.from("employees").select("shift_id").eq("id", employee.id).single();
    if (emp?.shift_id) {
      const { data: shift } = await supabase.from("shifts").select("end_time").eq("id", emp.shift_id).single();
      if (shift) setShiftEnd(shift.end_time);
    }
  };

  const otHours = () => {
    if (!shiftEnd || !formData.actualEnd) return 0;
    const decShift = timeToDecimal(shiftEnd);
    const decActual = timeToDecimal(formData.actualEnd);
    return Math.max(0, decActual - decShift);
  };

  const submitRequest = async () => {
    if (!formData.date || !formData.actualEnd || !formData.reason) {
      showToast("Please fill all required fields", "error");
      return;
    }

    const calculatedHours = otHours();
    if (calculatedHours <= 0) {
      showToast("Actual end time must be after shift end time", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: empData } = await supabase.from("employees").select("manager_id").eq("id", employee.id).single();
      
      const { error } = await supabase.from("overtime_requests").insert({
        emp_id: employee.id,
        date: formData.date,
        shift_end_time: shiftEnd,
        actual_end_time: formData.actualEnd,
        overtime_hours: calculatedHours,
        reason: formData.reason,
        status: "Pending",
        manager_id: empData?.manager_id,
        compensation_type: formData.compType,
        comp_off_date: formData.compType === "comp_off" && formData.compDate ? formData.compDate : null,
      });
      if (error) throw error;

      if (empData?.manager_id) {
        await supabase.from("notifications").insert({
          user_id: empData.manager_id,
          message: `${employee.name} submitted an overtime request for ${formData.date}. OT hours: ${formatHours(calculatedHours)}`
        });
      }

      await supabase.from("audit_log").insert({
        action: "OVERTIME_SUBMITTED",
        user_id: employee.id,
        details: `Submitted overtime for ${formData.date} (${formatHours(calculatedHours)})`
      });

      showToast("Overtime request submitted. Awaiting manager approval.", "success");
      setFormData({ date: "", actualEnd: "", reason: "", compType: "comp_off", compDate: "" });
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRequest = async (id: string) => {
    await supabase.from("overtime_requests").update({ status: "Rejected" }).eq("id", id);
    fetchRequests();
    fetchStats();
    showToast("Request cancelled", "info");
  };

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="This Month OT" value={formatHours(stats.monthOt)} icon={Timer} tone="primary" />
        <StatTile label="OT Requests Pending" value={stats.pendingReqs.toString()} icon={Clock} tone="warning" />
        <StatTile label="Comp Off Earned" value={stats.compOffEarned.toString()} icon={CheckCircle2} tone="success" />
        <StatTile label="OT This Year" value={formatHours(stats.yearOt)} icon={Calendar} tone="teal" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SUBMIT FORM */}
        <Card className="p-6 bg-surface border-border/60">
          <h3 className="font-semibold mb-4 text-lg">Submit Request</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {shiftEnd && (
              <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Your shift ends at {shiftEnd}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Actual End Time *</label>
              <input 
                type="time" 
                value={formData.actualEnd} 
                onChange={(e) => setFormData({ ...formData, actualEnd: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {formData.actualEnd && shiftEnd && (
              <div className={`text-xs p-2 rounded border flex items-center gap-1.5 ${otHours() > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"}`}>
                {otHours() > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {otHours() > 0 ? `Overtime: ${formatHours(otHours())}` : "Actual end time must be after shift end time"}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Reason *</label>
              <textarea 
                value={formData.reason} 
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Why was overtime required?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Compensation Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={formData.compType === "comp_off"} onChange={() => setFormData({ ...formData, compType: "comp_off" })} />
                  Comp Off
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={formData.compType === "payment"} onChange={() => setFormData({ ...formData, compType: "payment" })} />
                  Payment
                </label>
              </div>
            </div>

            {formData.compType === "comp_off" && (
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Comp Off Date</label>
                <input 
                  type="date" 
                  value={formData.compDate} 
                  onChange={(e) => setFormData({ ...formData, compDate: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            <button 
              onClick={submitRequest}
              disabled={isSubmitting || otHours() <= 0 || !formData.date || !formData.reason}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium disabled:opacity-50 mt-2"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </Card>

        {/* MY REQUESTS TABLE */}
        <Card className="lg:col-span-2 p-6 bg-surface border-border/60">
          <h3 className="font-semibold mb-4 text-lg">My Overtime Requests</h3>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
              No overtime requests submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium rounded-tl-lg">Date</th>
                    <th className="p-3 font-medium">OT Hours</th>
                    <th className="p-3 font-medium">Compensation</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.map(r => (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">{r.date}</td>
                        <td className="p-3 font-semibold text-primary">{formatHours(r.overtime_hours)}</td>
                        <td className="p-3">
                          {r.compensation_type === "comp_off" ? "Comp Off" : "Payment"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                              r.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                              r.status === 'Manager_Approved' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'}`}>
                            {r.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3 flex gap-2">
                          <button 
                            onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            {expandedRow === r.id ? "Hide Flow" : "View Flow"}
                          </button>
                          {r.status === 'Pending' && (
                            <button 
                              onClick={() => cancelRequest(r.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedRow === r.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="p-4 border-l-4 border-indigo-400">
                            <div className="flex justify-between items-center max-w-2xl mx-auto relative">
                              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2"></div>
                              
                              <div className="flex flex-col items-center">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1"><CheckCircle2 className="w-4 h-4"/></div>
                                <span className="text-[10px] font-bold text-slate-700">Submitted</span>
                              </div>
                              
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 text-white ${["Manager_Approved", "Approved"].includes(r.status) ? "bg-emerald-500" : r.status === "Manager_Rejected" ? "bg-red-500" : "bg-slate-300"}`}>
                                  {r.status === "Manager_Rejected" ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                                </div>
                                <span className="text-[10px] font-bold text-slate-700">Manager Review</span>
                              </div>
                              
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 text-white ${r.status === "Approved" ? "bg-emerald-500" : r.status === "Rejected" && r.hr_comments ? "bg-red-500" : "bg-slate-300"}`}>
                                  {r.status === "Rejected" && r.hr_comments ? <AlertCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                                </div>
                                <span className="text-[10px] font-bold text-slate-700">HR Approval</span>
                              </div>

                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 text-white ${r.is_compensated ? "bg-emerald-500" : "bg-slate-300"}`}>
                                  <CheckCircle2 className="w-4 h-4"/>
                                </div>
                                <span className="text-[10px] font-bold text-slate-700">Compensated</span>
                              </div>
                            </div>
                            {r.reason && <p className="text-xs text-slate-600 mt-4"><strong>Reason:</strong> {r.reason}</p>}
                            {r.manager_comments && <p className="text-xs text-red-600 mt-1"><strong>Manager Note:</strong> {r.manager_comments}</p>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function TrendTab({ employee }: { employee: any }) {
  const [data, setData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (employee?.id) {
      fetchTrend();
    }
  }, [employee, selectedMonth, selectedYear]);

  const fetchTrend = async () => {
    // Construct start and end dates for the selected month/year
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-31`;

    const { data: att } = await supabase
      .from("attendance")
      .select("date, overtime_hours")
      .eq("emp_id", employee.id)
      .gt("overtime_hours", 0)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    setData(att || []);
  };

  const totalOt = data.reduce((s, a) => s + (a.overtime_hours || 0), 0);
  const daysCount = data.length;
  const avgOt = daysCount > 0 ? totalOt / daysCount : 0;
  
  // Calculate max for the CSS chart relative height
  const maxOt = Math.max(...data.map(d => d.overtime_hours || 0), 1); // min 1 to avoid div by 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border/60">
        <h3 className="font-semibold">Monthly Overtime Trend</h3>
        <div className="flex gap-4">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="p-6 bg-surface border-border/60">
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed rounded-xl">
            No overtime logged for this month.
          </div>
        ) : (
          <div className="flex items-end justify-between h-[200px] border-b border-border/50 pb-2 relative px-4 mt-8">
            {/* Y Axis markings */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground pb-2">
              <span>{Math.ceil(maxOt)}h</span>
              <span>{Math.ceil(maxOt / 2)}h</span>
              <span>0h</span>
            </div>
            
            {/* Bars */}
            <div className="w-full flex justify-around items-end h-full ml-8">
              {data.map((d, i) => {
                const heightPx = Math.max((d.overtime_hours / maxOt) * 160, 10); // 160px max height
                const dayNum = parseInt(d.date.split('-')[2]);
                return (
                  <div key={i} className="flex flex-col items-center group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {d.date}: {formatHours(d.overtime_hours)}
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-8 bg-indigo-500 rounded-t-sm hover:bg-indigo-400 transition-colors"
                      style={{ height: `${heightPx}px` }}
                    ></div>
                    {/* X Axis label */}
                    <span className="text-[10px] text-muted-foreground mt-2">{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4 mt-6 text-center divide-x divide-border/50">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total OT this month</div>
            <div className="text-xl font-bold text-primary">{formatHours(totalOt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Days with OT</div>
            <div className="text-xl font-bold text-primary">{daysCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Average OT per day</div>
            <div className="text-xl font-bold text-primary">{formatHours(avgOt)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ApprovalsTab({ employee }: { employee: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    if (employee?.id) {
      fetchRequests();
    }
  }, [employee]);

  const fetchRequests = async () => {
    let q = supabase
      .from("overtime_requests")
      .select("*, employees!emp_id(name, department, designation)")
      .order("created_at", { ascending: false });

    if (employee.role === "manager") {
      q = q.eq("manager_id", employee.id).eq("status", "Pending");
    } else if (["hr", "super_admin"].includes(employee.role)) {
      q = q.eq("status", "Manager_Approved");
    } else {
      setRequests([]);
      return;
    }

    const { data } = await q;
    setRequests(data || []);
  };

  const showToast = (msg: string, type: string = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleManagerApprove = async (r: any) => {
    await supabase.from("overtime_requests").update({ 
      status: "Manager_Approved", 
      manager_actioned_at: new Date().toISOString() 
    }).eq("id", r.id);

    // Notify HR
    const { data: hrUsers } = await supabase.from("employees").select("id").in("role", ["hr", "super_admin"]);
    if (hrUsers) {
      const hrNotifs = hrUsers.map(hr => ({
        user_id: hr.id,
        message: `${r.employees?.name} overtime request approved by manager. HR review required.`
      }));
      await supabase.from("notifications").insert(hrNotifs);
    }

    // Notify Employee
    await supabase.from("notifications").insert({
      user_id: r.emp_id,
      message: `Your overtime for ${r.date} approved by manager. Pending HR review.`
    });

    showToast("Overtime approved — sent to HR");
    fetchRequests();
  };

  const handleManagerReject = async (r: any) => {
    const comments = window.prompt("Reason for rejection:");
    if (comments === null) return;

    await supabase.from("overtime_requests").update({ 
      status: "Manager_Rejected", 
      manager_comments: comments 
    }).eq("id", r.id);

    await supabase.from("notifications").insert({
      user_id: r.emp_id,
      message: `Your overtime for ${r.date} was rejected by your manager. Reason: ${comments}`
    });

    showToast("Overtime request rejected", "info");
    fetchRequests();
  };

  const handleHRApprove = async (r: any) => {
    await supabase.from("overtime_requests").update({ 
      status: "Approved", 
      hr_actioned_at: new Date().toISOString(),
      is_compensated: true
    }).eq("id", r.id);

    if (r.compensation_type === "comp_off") {
      // Find Comp Off leave_type_id
      const { data: lt } = await supabase.from("leave_types").select("id").ilike("name", "%Comp Off%").single();
      if (lt) {
        const year = new Date().getFullYear();
        // Decrease 'used' by 1 (which effectively adds 1 day to balance)
        const { data: bal } = await supabase.from("leave_balances")
          .select("used").eq("emp_id", r.emp_id).eq("leave_type_id", lt.id).eq("year", year).single();
        
        if (bal) {
          await supabase.from("leave_balances")
            .update({ used: bal.used - 1 })
            .eq("emp_id", r.emp_id).eq("leave_type_id", lt.id).eq("year", year);
        }
      }
    }

    await supabase.from("notifications").insert({
      user_id: r.emp_id,
      message: `Your overtime for ${r.date} fully approved.${r.compensation_type === 'comp_off' ? ' Comp off added to your balance.' : ''}`
    });

    showToast("Overtime fully approved");
    fetchRequests();
  };

  const handleHRReject = async (r: any) => {
    const comments = window.prompt("Reason for rejection:");
    if (comments === null) return;

    await supabase.from("overtime_requests").update({ 
      status: "Rejected",
      hr_comments: comments
    }).eq("id", r.id);

    await supabase.from("notifications").insert({
      user_id: r.emp_id,
      message: `Your overtime for ${r.date} was rejected by HR. Reason: ${comments}`
    });

    showToast("Overtime request rejected", "info");
    fetchRequests();
  };

  if (!["manager", "hr", "super_admin"].includes(employee?.role)) {
    return <div className="text-center p-12 text-muted-foreground">You do not have permission to view approvals.</div>;
  }

  return (
    <Card className="p-6 bg-surface border-border/60">
      <h3 className="font-semibold mb-4 text-lg">Pending Overtime Approvals</h3>
      
      {requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
          No overtime requests awaiting your approval.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium rounded-tl-lg">Employee</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Shift End</th>
                <th className="p-3 font-medium">Actual End</th>
                <th className="p-3 font-medium">OT Hours</th>
                <th className="p-3 font-medium max-w-[200px]">Reason</th>
                <th className="p-3 font-medium">Compensation</th>
                <th className="p-3 font-medium rounded-tr-lg text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-primary">{r.employees?.name}</div>
                    <div className="text-xs text-muted-foreground">{r.employees?.department}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{r.date}</td>
                  <td className="p-3">{r.shift_end_time}</td>
                  <td className="p-3">{r.actual_end_time}</td>
                  <td className="p-3 font-semibold text-indigo-600">{formatHours(r.overtime_hours)}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                  <td className="p-3 text-xs">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {r.compensation_type === "comp_off" ? "Comp Off" : "Payment"}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {employee.role === "manager" ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleManagerReject(r)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-200">Reject</button>
                        <button onClick={() => handleManagerApprove(r)} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md">Approve</button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleHRReject(r)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-200">Reject</button>
                        <button onClick={() => handleHRApprove(r)} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md">Approve</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : toast.type === "info" ? "bg-slate-800 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </Card>
  );
}

function OvertimePage() {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<"my_overtime" | "trend" | "approvals">("my_overtime");

  return (
    <PageContainer>
      <PageHeader
        title="Overtime"
        subtitle="Manage and track overtime hours and compensation"
        breadcrumbs={[{ label: "Attendance" }, { label: "Overtime" }]}
      />
      
      <div className="flex gap-2 border-b border-border/50 mb-6 pb-2">
        <button 
          onClick={() => setActiveTab("my_overtime")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "my_overtime" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          My Overtime
        </button>
        <button 
          onClick={() => setActiveTab("trend")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "trend" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Overtime Trend
        </button>
        {employee && ["manager", "hr", "super_admin"].includes(employee.role) && (
          <button 
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "approvals" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Approvals
          </button>
        )}
      </div>

      {activeTab === "my_overtime" && <MyOvertimeTab employee={employee} />}
      {activeTab === "trend" && <TrendTab employee={employee} />}
      {activeTab === "approvals" && <ApprovalsTab employee={employee} />}
    </PageContainer>
  );
}
