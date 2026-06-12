import { createFileRoute } from "@tanstack/react-router";
import { Plane, CalendarCheck, Stethoscope, FileText, ArrowRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLeaveStore } from "../store/useLeaveStore";
import { supabase } from "../lib/supabaseClient";
import BRDTag from "@/components/BRDTag";

export const Route = createFileRoute("/_app/apply-leave")({
  head: () => ({ meta: [{ title: "Apply Leave — LAMS" }] }),
  component: ApplyLeavePage,
});

const DEFAULT_ICONS: Record<string, any> = {
  Annual: Plane,
  Casual: CalendarCheck,
  Sick: Stethoscope,
  "Comp Off": FileText,
};

const DEFAULT_COLORS: Record<string, string> = {
  Annual: "primary",
  Casual: "teal",
  Sick: "warning",
  "Comp Off": "success",
};

function calculateWorkingDays(from: string, to: string) {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  let days = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  return days;
}

function ApplyLeavePage() {
  const { employee } = useAuth();
  const { balances, applyLeave } = useLeaveStore();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [dayType, setDayType] = useState<"Full day" | "First half" | "Second half">("Full day");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [overlappingBlackout, setOverlappingBlackout] = useState<any>(null);

  useEffect(() => {
    if (employee) {
      supabase.from("leave_blackout_dates")
        .select("*")
        .or(`department.eq.ALL,department.eq.${employee.department || ''}`)
        .then(({ data }) => {
          if (data) setBlackouts(data);
        });
    }
  }, [employee]);

  useEffect(() => {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const overlap = blackouts.find(b => {
        const bStart = new Date(b.from_date);
        const bEnd = new Date(b.to_date);
        return start <= bEnd && end >= bStart;
      });
      setOverlappingBlackout(overlap || null);
    } else {
      setOverlappingBlackout(null);
    }
  }, [fromDate, toDate, blackouts]);

  const handleSubmit = async () => {
    if (!selectedType || !fromDate || !toDate || !reason || !employee) return;
    setIsSubmitting(true);

    const days = calculateWorkingDays(fromDate, toDate);

    try {
      await applyLeave({
        emp_id: employee.id,
        leave_type_id: selectedType,
        from_date: fromDate,
        to_date: toDate,
        days,
        reason,
        half_day: dayType !== "Full day",
        status: "Pending",
      });
      setFromDate("");
      setToDate("");
      setReason("");
      setSelectedType(null);
      setDayType("Full day");
      setEmergencyContact("");
    } catch (e: any) {
      console.error(e);
      alert("Failed to submit request: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBalance = balances.find((b) => b.leave_type_id === selectedType);
  const daysDiff = calculateWorkingDays(fromDate, toDate);

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const cardClass = "bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8";
  const btnClass = "bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-5 py-2.5 transition-all shadow-sm";

  return (
    <PageContainer>
      <PageHeader
        title="Apply Leave"
        subtitle="Submit a new leave request for approval"
        breadcrumbs={[{ label: "Leave Management" }, { label: "Apply Leave" }]}
        badge={<BRDTag label="BRD FR-2: Leave Workflows" />}
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className={cardClass}>
          <div>
            <Label className={labelClass}>
              Select Leave Type
            </Label>
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {balances.map((b) => {
                const name = b.leave_types?.name || "Leave";
                const Icon = DEFAULT_ICONS[name] || FileText;
                const remaining = b.total - b.used;

                return (
                  <button
                    key={b.leave_type_id}
                    onClick={() => setSelectedType(b.leave_type_id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${selectedType === b.leave_type_id ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 border-slate-200 hover:border-indigo-200"}`}
                  >
                    <div className="bg-white text-indigo-600 p-2 rounded-xl inline-flex mb-3 shadow-sm border border-slate-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{remaining} days available</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-7">
            <div>
              <Label htmlFor="from" className={labelClass}>From Date</Label>
              <Input
                id="from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="to" className={labelClass}>To Date</Label>
              <Input
                id="to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {overlappingBlackout && overlappingBlackout.auto_reject && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800">
              <strong>Action Restricted:</strong> Leave cannot be applied during {overlappingBlackout.reason} ({overlappingBlackout.from_date} to {overlappingBlackout.to_date}). This period is restricted.
            </div>
          )}

          <div className="mt-6">
            <Label className={labelClass}>Day Type</Label>
            <div className="flex gap-2">
              {(["Full day", "First half", "Second half"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDayType(d)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${dayType === d ? "bg-white text-indigo-700 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Label htmlFor="reason" className={labelClass}>Reason</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a brief reason for your leave request…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="mt-6">
            <Label htmlFor="contact" className={labelClass}>Emergency Contact (optional)</Label>
            <Input
              id="contact"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Phone number or email"
              className={inputClass}
            />
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" className="rounded-xl px-5 py-2.5 font-medium border-slate-200 hover:bg-slate-50 text-slate-700">Save as draft</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedType || !fromDate || !toDate || (overlappingBlackout?.auto_reject)}
              className={btnClass}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6">
            <h3 className="font-bold text-slate-900 tracking-tight">Request Preview</h3>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Type</span>
                <span className="font-semibold text-slate-900">{selectedBalance?.leave_types?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Days</span>
                <span className="font-semibold text-slate-900">{daysDiff} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Period</span>
                <span className="font-semibold text-slate-900 text-right">
                  {fromDate || "—"} {fromDate || toDate ? "–" : ""} {toDate}
                </span>
              </div>
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Balance after</span>
                <span className="font-bold text-emerald-600">
                  {selectedBalance ? selectedBalance.total - selectedBalance.used - daysDiff : 0}{" "}
                  days
                </span>
              </div>
            </div>
          </Card>
          <Card className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6">
            <h3 className="font-bold text-slate-900 tracking-tight mb-4">Approval Flow</h3>
            <div className="space-y-3 text-sm">
              {[
                { who: "Reporting Manager", role: "Manager", state: "Next" },
                { who: "HR Administrator", role: "HR", state: "Pending" },
              ].map((s) => (
                <div
                  key={s.who}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-700 text-xs grid place-items-center font-bold">
                    {s.who
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{s.who}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{s.role}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${s.state === "Next" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {s.state}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
