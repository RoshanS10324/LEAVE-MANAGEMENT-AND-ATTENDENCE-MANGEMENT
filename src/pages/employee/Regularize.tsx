import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Send,
  CalendarDays,
  Search,
} from "lucide-react";
import { emailRegularizationSubmitted } from "../../utils/emailService";

export default function Regularize() {
  const { employee } = useAuth();

  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [correction, setCorrection] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  function showToast(msg: string, type: string = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (!employee?.id) return;
    fetchRequests();
  }, [employee?.id]);

  async function fetchRequests() {
    if (!employee?.id) return;
    const { data } = await supabase
      .from("regularization_requests")
      .select("*")
      .eq("emp_id", employee.id)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
  }

  async function handleDateChange(dateStr: string) {
    setSelectedDate(dateStr);
    if (!dateStr || !employee?.id) {
      setCurrentRecord(null);
      return;
    }
    setRecordLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("emp_id", employee.id)
      .eq("date", dateStr)
      .maybeSingle();
    setCurrentRecord(data || null);
    setRecordLoading(false);
  }

  async function handleSubmit() {
    if (!selectedDate || !reason || !employee?.id) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("regularization_requests").insert({
        emp_id: employee.id,
        date: selectedDate,
        reason,
        correction: correction || null,
        status: "Pending",
      }).select().single();
      
      if (error) throw error;

      // Notify Manager
      const { data: empData } = await supabase
        .from("employees")
        .select("*, manager:employees!manager_id(id, name, email)")
        .eq("id", employee.id)
        .single();

      if (empData?.manager) {
        // In-app notification
        await supabase.from("notifications").insert({
          user_id: empData.manager.id,
          message: `${empData.name} submitted an attendance regularization request for ${selectedDate}. Reason: ${reason}. Action required.`,
        });

        // Email notification
        await emailRegularizationSubmitted({
          date: selectedDate,
          req_in: correction ? correction.split(" ")[0] : "N/A",
          req_out: correction ? correction.split(" ")[1] || "N/A" : "N/A",
          reason: reason
        }, empData, empData.manager);
      }

      showToast("Regularization request submitted & manager notified");
      setReason("");
      setCorrection("");
      setSelectedDate("");
      setCurrentRecord(null);
      fetchRequests();
    } catch (err: any) {
      showToast(err.message || "Failed to submit", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Regularization</h1>
        <p className="text-sm text-gray-500 mt-1">Submit and track attendance correction requests</p>
      </div>

      {/* Submit Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-5">Submit New Request</h3>
        <div className="grid md:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              {recordLoading && (
                <div className="mt-2 text-xs text-blue-500 animate-pulse">Checking records...</div>
              )}
              {selectedDate && !recordLoading && (
                <div
                  className={`mt-2 px-3 py-2 rounded-lg text-xs ${
                    currentRecord
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "bg-gray-50 text-gray-400 border border-gray-100"
                  }`}
                >
                  {currentRecord ? (
                    <>
                      <strong>Current record:</strong> Check-in: {currentRecord.check_in || "—"} · Check-out:{" "}
                      {currentRecord.check_out || "—"} · Status:{" "}
                      <span className="font-semibold">{currentRecord.status}</span>
                    </>
                  ) : (
                    "No attendance record found for this date"
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why correction is needed…"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Correction Details <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <input
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="e.g. Mark check-in at 09:30"
                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedDate || !reason}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Submit Request
                </>
              )}
            </Button>
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Guidelines</h4>
            <ul className="space-y-2 text-xs text-gray-500">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Corrections are reviewed by your manager and HR
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                You can only regularize attendance within the last 7 days
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Provide a valid reason for the correction
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                Frequent regularization may trigger a compliance review
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Previous Requests */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-5">Previous Requests</h3>

        {requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No regularization requests yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(r.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                      <span className="font-medium">
                        {r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </span>
                      <span className="text-gray-600 col-span-2 truncate">{r.reason}</span>
                      <StatusBadge status={r.status} />
                      <span className="text-gray-400 text-xs">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                          : "—"}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-4">
                      <StatusTimeline
                        submittedAt={r.created_at}
                        status={r.status}
                        approver={r.approver_name}
                        approvedAt={r.approved_at}
                        rejectionReason={r.rejection_reason}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-600 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Rejected: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border text-center inline-block ${
        colors[status] || "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

function StatusTimeline({
  submittedAt,
  status,
  approver,
  approvedAt,
  rejectionReason,
}: {
  submittedAt: string;
  status: string;
  approver?: string;
  approvedAt?: string;
  rejectionReason?: string;
}) {
  const steps = [
    {
      label: "Submitted",
      icon: Clock,
      date: submittedAt,
      done: true,
      color: "text-emerald-500 bg-emerald-50",
    },
    {
      label: "Under Review",
      icon: Search,
      date: submittedAt,
      done: status === "Pending",
      color: status === "Pending" ? "text-blue-500 bg-blue-50" : "text-gray-300 bg-gray-50",
    },
    {
      label: status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Resolved",
      icon: status === "Approved" ? CheckCircle2 : XCircle,
      date: approvedAt || "",
      done: status !== "Pending",
      color:
        status === "Approved"
          ? "text-emerald-500 bg-emerald-50"
          : status === "Rejected"
            ? "text-red-500 bg-red-50"
            : "text-gray-300 bg-gray-50",
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={s.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-8 w-8 rounded-full grid place-items-center ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            {i < steps.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="pb-6">
            <div className="text-sm font-semibold text-gray-900">{s.label}</div>
            <div className="text-xs text-gray-500">
              {s.date
                ? new Date(s.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
            {s.label === "Approved" && approver && (
              <div className="text-xs text-gray-400 mt-0.5">by {approver}</div>
            )}
            {s.label === "Rejected" && rejectionReason && (
              <div className="text-xs text-red-400 mt-0.5">Reason: {rejectionReason}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
