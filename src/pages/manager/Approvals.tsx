import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { calculateCheckout } from "../../utils/attendanceCalculator";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  emailManagerApproved,
  emailManagerRejected,
  emailRegularizationApproved,
} from "../../utils/emailService";

type Tab = "leave" | "regularization";

export default function Approvals() {
  const { employee } = useAuth();
  const [tab, setTab] = useState<Tab>("leave");
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    fetchLeaveRequests();
    fetchRegRequests();
  }, [employee?.id]);

  async function fetchLeaveRequests() {
    const { data } = await supabase
      .from("leave_applications")
      .select("*, employees(name, department), leave_types(name)")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });
    if (data) setLeaveRequests(data);
  }

  async function fetchRegRequests() {
    const { data } = await supabase
      .from("regularization_requests")
      .select("*, employees(name, department)")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });
    if (data) setRegRequests(data);
  }

  // Leave approve / reject
  async function approveLeave(id: string) {
    const req = leaveRequests.find((r) => r.id === id);
    await supabase.from("leave_applications").update({ status: "Approved" }).eq("id", id);
    
    if (req) {
      await supabase.from("notifications").insert({
        emp_id: req.emp_id,
        message: `Your leave request for ${req.days} day(s) was approved by Manager.`,
        type: "leave",
      });
      const { data: empData } = await supabase.from("employees").select("email, name").eq("id", req.emp_id).maybeSingle();
      if (empData) {
        await emailManagerApproved({
          leave_type_name: req.leave_types?.name,
          from_date: req.from_date,
          to_date: req.to_date,
          days: req.days
        }, empData, employee);
      }
    }

    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    showToast("Leave approved & email notification sent");
  }

  async function rejectLeave(id: string) {
    const req = leaveRequests.find((r) => r.id === id);
    await supabase.from("leave_applications").update({ status: "Rejected" }).eq("id", id);
    
    if (req) {
      await supabase.from("notifications").insert({
        emp_id: req.emp_id,
        message: `Your leave request for ${req.days} day(s) was rejected by Manager.`,
        type: "leave",
      });
      const { data: empData } = await supabase.from("employees").select("email, name").eq("id", req.emp_id).maybeSingle();
      if (empData) {
        await emailManagerRejected({
          leave_type_name: req.leave_types?.name,
          from_date: req.from_date,
          to_date: req.to_date,
          days: req.days
        }, empData, employee, "Rejected by Manager via Dashboard");
      }
    }

    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    showToast("Leave rejected & email notification sent", "warning");
  }

  // Regularization approve / reject
  async function approveReg(reg: any) {
    await supabase.from("regularization_requests").update({ status: "Approved" }).eq("id", reg.id);
    setRegRequests((prev) => prev.filter((r) => r.id !== reg.id));

    // Parse correction as JSON to extract req_in / req_out
    let reqIn: string | null = null;
    let reqOut: string | null = null;
    try {
      const parsed = JSON.parse(reg.correction || "{}");
      reqIn = parsed.in || null;
      reqOut = parsed.out || null;
    } catch {
      // If correction is free text, try to extract times
      const timeMatch = reg.correction?.match(/(\d{1,2}:\d{2})/g);
      if (timeMatch) {
        reqIn = timeMatch[0] || null;
        reqOut = timeMatch[1] || null;
      }
    }

    if (reg.emp_id && reg.date && reqIn) {
      const shift = await fetchEmployeeShift(reg.emp_id);
      const totalHours = reqIn && reqOut
        ? calculateCheckout(reqIn, reqOut, shift).totalHours
        : 0;

      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("emp_id", reg.emp_id)
        .eq("date", reg.date)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("attendance")
          .update({
            check_in: reqIn,
            check_out: reqOut,
            total_hours: totalHours || null,
            status: "Present",
            is_late: false,
            early_leave: false,
            source: "regularized",
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("attendance").insert({
          emp_id: reg.emp_id,
          date: reg.date,
          check_in: reqIn,
          check_out: reqOut,
          total_hours: totalHours || null,
          status: "Present",
          is_late: false,
          source: "regularized",
        });
      }
      await supabase.from("notifications").insert({
        emp_id: reg.emp_id,
        message: `Your regularization request for ${reg.date} was approved by Manager.`,
        type: "attendance",
      });

      const { data: empData } = await supabase.from("employees").select("email, name").eq("id", reg.emp_id).maybeSingle();
      if (empData) {
        await emailRegularizationApproved({
          date: reg.date,
          req_in: reqIn,
          req_out: reqOut
        }, empData);
      }
    }

    showToast("Regularization approved & email notification sent");
  }

  async function rejectReg(reg: any) {
    await supabase.from("regularization_requests").update({ status: "Rejected" }).eq("id", reg.id);
    setRegRequests((prev) => prev.filter((r) => r.id !== reg.id));
    
    await supabase.from("notifications").insert({
      emp_id: reg.emp_id,
      message: `Your regularization request for ${reg.date} was rejected by Manager.`,
      type: "attendance",
    });

    showToast("Regularization rejected & notification sent", "warning");
  }

  async function fetchEmployeeShift(empId: string) {
    const { data } = await supabase
      .from("employees")
      .select("shift_id")
      .eq("id", empId)
      .single();
    if (!data?.shift_id) return null;
    const { data: shift } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", data.shift_id)
      .single();
    return shift;
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and act on pending requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: "leave" as Tab, label: "Leave Approvals", count: leaveRequests.length },
          { key: "regularization" as Tab, label: "Regularizations", count: regRequests.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
              tab === t.key ? "bg-blue-50 text-blue-600" : "bg-gray-200 text-gray-500"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Leave Approvals */}
      {tab === "leave" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs grid place-items-center font-bold">
                    {(r.employees?.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{r.employees?.name}</div>
                    <div className="text-xs text-gray-500">
                      {r.leave_types?.name} · {r.days} day(s) · {r.from_date} → {r.to_date}
                    </div>
                    {r.reason && <div className="text-xs text-gray-400 mt-0.5 truncate">{r.reason}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rejectLeave(r.id)}
                      className="h-8 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => approveLeave(r.id)}
                      className="h-8 px-3 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regularizations */}
      {tab === "regularization" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {regRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No pending regularization requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {regRequests.map((r) => {
                let reqIn: string | null = null;
                let reqOut: string | null = null;
                try {
                  const parsed = JSON.parse(r.correction || "{}");
                  reqIn = parsed.in || null;
                  reqOut = parsed.out || null;
                } catch {
                  const timeMatch = r.correction?.match(/(\d{1,2}:\d{2})/g);
                  if (timeMatch) { reqIn = timeMatch[0]; reqOut = timeMatch[1] || null; }
                }

                return (
                  <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs grid place-items-center font-bold">
                      {(r.employees?.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{r.employees?.name}</div>
                      <div className="text-xs text-gray-500">
                        {r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        {reqIn && ` · ${reqIn}`}{reqOut && ` → ${reqOut}`}
                      </div>
                      {r.reason && <div className="text-xs text-gray-400 mt-0.5 truncate">{r.reason}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejectReg(r)}
                        className="h-8 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => approveReg(r)}
                        className="h-8 px-3 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
