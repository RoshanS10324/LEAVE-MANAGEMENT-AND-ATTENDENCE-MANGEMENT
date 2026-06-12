import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import FaceCheckin from "../../components/FaceCheckin";
import BRDTag from "../../components/BRDTag";
import { formatHours, isWeekendDay } from "../../utils/attendanceCalculator";
import {
  UserCheck,
  Home,
  AlertTriangle,
  Clock,
  CalendarOff,
  Timer,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AttendanceLog() {
  const { employee } = useAuth();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const [attendance, setAttendance] = useState<any[]>([]);
  const [shift, setShift] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [weekendPolicy, setWeekendPolicy] = useState<any>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);

  const monthStart = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const monthEndDate = new Date(viewYear, viewMonth, 0);
  const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

  async function fetchAll() {
    if (!employee?.id) return;

    const { data: att } = await supabase
      .from("attendance")
      .select("*")
      .eq("emp_id", employee.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true });

    const { data: sh } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", employee.shift_id)
      .maybeSingle();

    const { data: hol } = await supabase
      .from("holidays")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const { data: leaves } = await supabase
      .from("leave_applications")
      .select("*")
      .eq("emp_id", employee.id)
      .eq("status", "Approved")
      .lte("from_date", monthEnd)
      .gte("to_date", monthStart);

    const { data: wp } = await supabase
      .from("weekend_policy")
      .select("*")
      .maybeSingle();

    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: upHol } = await supabase
      .from("holidays")
      .select("*")
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .limit(5);

    if (att) setAttendance(att);
    if (sh) setShift(sh);
    if (hol) setHolidays(hol);
    if (leaves) setApprovedLeaves(leaves);
    if (wp) setWeekendPolicy(wp);
    if (upHol) setUpcomingHolidays(upHol);
  }

  useEffect(() => {
    fetchAll();
  }, [employee?.id, viewMonth, viewYear]);

  function handleAttendanceUpdate() {
    fetchAll();
  }

  function today() {
    setViewMonth(now.getMonth() + 1);
    setViewYear(now.getFullYear());
  }

  const todayStr = now.toISOString().slice(0, 10);

  const stats = {
    present: attendance.filter((a) => a.status === "Present" && !a.is_late).length,
    wfh: attendance.filter((a) => a.status === "WFH").length,
    late: attendance.filter((a) => a.is_late).length,
    earlyLeave: attendance.filter((a) => a.early_leave).length,
    absent: attendance.filter((a) => a.status === "Absent").length,
    totalOt: attendance.reduce((s, a) => s + (a.overtime_hours || 0), 0),
  };

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = monthEndDate.getDate();
  const pad = firstDay === 0 ? 6 : firstDay - 1;

  const todayDate = now.getDate();
  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  function getCellData(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isFuture = dateStr > todayStr;
    const isWeekend = isWeekendDay(dateStr, weekendPolicy);
    const holiday = holidays.find((h) => h.date === dateStr);
    const onLeave = approvedLeaves.some(
      (l) => dateStr >= l.from_date && dateStr <= l.to_date,
    );
    const attRecord = attendance.find((a) => a.date === dateStr);
    const isToday = dateStr === todayStr;

    let type = "none";
    let label = "";
    let color = "";

    if (isFuture) { type = "future"; label = ""; color = "bg-white text-gray-400"; }
    else if (isWeekend) { type = "weekend"; label = "WE"; color = "bg-gray-100 text-gray-400"; }
    else if (holiday) { type = "holiday"; label = holiday.name.slice(0, 6); color = "bg-yellow-100 text-yellow-700"; }
    else if (onLeave) { type = "leave"; label = "LV"; color = "bg-green-100 text-green-700"; }
    else if (attRecord?.status === "WFH") { type = "wfh"; label = "W"; color = "bg-purple-100 text-purple-700"; }
    else if (attRecord?.is_late) { type = "late"; label = "L"; color = "bg-orange-100 text-orange-700"; }
    else if (attRecord?.early_leave) { type = "early"; label = "E"; color = "bg-amber-100 text-amber-700"; }
    else if (attRecord?.status === "Present") { type = "present"; label = "P"; color = "bg-blue-100 text-blue-700"; }
    else if (attRecord?.status === "Absent") { type = "absent"; label = "A"; color = "bg-red-100 text-red-700"; }
    else { type = "absent"; label = "?"; color = "bg-red-50 text-red-400"; }

    return { dateStr, isToday, attRecord, holiday, type, label, color };
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-end -mb-4">
        <BRDTag label="BRD FR-3: Attendance" />
      </div>
      {/* FaceCheckin */}
      {employee && (
        <FaceCheckin employee={employee} onAttendanceUpdate={handleAttendanceUpdate} />
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={UserCheck} label="Present" value={stats.present} color="blue" />
        <StatCard icon={Home} label="WFH" value={stats.wfh} color="purple" />
        <StatCard icon={AlertTriangle} label="Late" value={stats.late} color="orange" />
        <StatCard icon={Clock} label="Early Leave" value={stats.earlyLeave} color="amber" />
        <StatCard icon={CalendarOff} label="Absent" value={stats.absent} color="red" />
        <StatCard icon={Timer} label="Total OT" value={formatHours(stats.totalOt)} color="teal" />
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 tracking-tight">Attendance Calendar</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {MONTHS[viewMonth - 1]} {viewYear}
            </span>
            <button
              onClick={() => { if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }}
              className="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={today}
              className="ml-2 text-xs font-medium text-blue-600 hover:underline"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: pad }).map((_, i) => (
            <div key={`pad-${i}`} className="h-11" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const cd = getCellData(day);
            return (
              <div
                key={day}
                className={`relative h-11 rounded-lg flex flex-col items-center justify-center cursor-pointer text-xs transition-colors ${cd.color} ${cd.isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""} group`}
                title={cd.attRecord ? `${cd.dateStr} · ${cd.attRecord.status}` : cd.dateStr}
              >
                <span className={`text-xs ${cd.isToday ? "font-bold" : "font-medium"}`}>{day}</span>
                {cd.label && <span className="text-[9px] leading-tight">{cd.label}</span>}
                {cd.attRecord && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {cd.dateStr}<br />
                      Status: {cd.attRecord.status}<br />
                      In: {cd.attRecord.check_in || "—"} Out: {cd.attRecord.check_out || "—"}
                      {cd.attRecord.total_hours ? ` · ${formatHours(cd.attRecord.total_hours)}` : ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100 text-[11px]">
          {[
            { color: "bg-blue-100", label: "Present" },
            { color: "bg-purple-100", label: "WFH" },
            { color: "bg-orange-100", label: "Late" },
            { color: "bg-amber-100", label: "Early" },
            { color: "bg-red-100", label: "Absent" },
            { color: "bg-green-100", label: "Leave" },
            { color: "bg-yellow-100", label: "Holiday" },
            { color: "bg-gray-100", label: "Weekend" },
            { color: "bg-red-50", label: "No Record" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${l.color}`} />
              <span className="text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Holidays */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
        <h3 className="font-bold text-slate-900 tracking-tight mb-5">Upcoming Holidays</h3>
        {upcomingHolidays.length === 0 ? (
          <p className="text-sm text-gray-400">No upcoming holidays in the next 30 days</p>
        ) : (
          <div className="space-y-2">
            {upcomingHolidays.map((h) => (
              <div key={h.id} className="flex items-center gap-4 text-sm">
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded font-semibold min-w-[70px] text-center">
                  {new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </span>
                <span className="flex-1 font-medium">{h.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    h.type === "National"
                      ? "bg-blue-50 text-blue-600"
                      : h.type === "Festival"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {h.type || "General"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 tracking-tight">Detailed Records</h3>
          <div className="flex items-center gap-3">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {attendance.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No attendance records for this period</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Table Header Equivalent */}
            <div className="hidden md:flex items-center px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="w-24">Date</div>
              <div className="w-16">Day</div>
              <div className="flex-1 min-w-[80px]">Check-in</div>
              <div className="flex-1 min-w-[80px]">Check-out</div>
              <div className="w-24">Hours</div>
              <div className="w-20">OT</div>
              <div className="w-24">Status</div>
              <div className="w-16">Face ID</div>
              <div className="w-20">Source</div>
            </div>

            {/* List Rows */}
            {attendance.map((a) => {
              const rawIn = a.check_in;
              const rawOut = a.check_out;
              const displayIn = rawIn ? formatTimeDisplay(rawIn) : "—";
              const displayOut = rawOut ? formatTimeDisplay(rawOut) : "—";
              const hrs = a.total_hours || (rawIn && rawOut ? calcHours(rawIn, rawOut) : 0);

              let rowStyle = "";
              if (a.is_late) rowStyle = "border-l-4 border-l-amber-500";
              else if (a.status === "Absent") rowStyle = "bg-rose-50/50";
              else if (a.status === "WFH") rowStyle = "bg-indigo-50/30";

              return (
                <div key={a.id} className={`flex flex-col md:flex-row md:items-center px-4 py-4 rounded-xl hover:bg-slate-50/70 transition-colors ${rowStyle} gap-3 md:gap-0`}>
                  <div className="w-24 font-bold text-slate-900 text-sm">
                    {new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </div>
                  <div className="w-16 text-slate-500 font-medium text-sm">
                    {new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                  </div>
                  <div className="flex-1 min-w-[80px] font-mono font-medium text-slate-700 text-sm">{displayIn}</div>
                  <div className="flex-1 min-w-[80px] font-mono font-medium text-slate-700 text-sm">
                    <span className="flex items-center gap-1.5">
                      {displayOut}
                      {a.early_leave && (
                        <span className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-semibold">Early</span>
                      )}
                    </span>
                  </div>
                  <div className="w-24 font-bold text-slate-900 text-sm">
                    <span className="flex items-center gap-1.5">
                      {hrs > 0 ? formatHours(hrs) : "—"}
                    </span>
                  </div>
                  <div className="w-20 text-sm">
                    {a.overtime_hours > 0 ? (
                      <span className="bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 text-[10px] font-semibold">+{formatHours(a.overtime_hours)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </div>
                  <div className="w-24">
                    <StatusBadge status={a.is_late ? "Late" : a.status || "Present"} />
                  </div>
                  <div className="w-16 flex items-center">
                    {a.face_verified ? (
                      <span title="Face ID verified" className="text-emerald-500 bg-emerald-50 p-1 rounded-md">
                        <UserCheck className="h-4 w-4" />
                      </span>
                    ) : (
                      <span title="No face verification" className="text-slate-300 bg-slate-50 p-1 rounded-md">
                        <UserCheck className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="w-20">
                    <SourcePill source={a.source} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${colors[color] || colors.blue}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3">
        <div className="text-lg font-bold">{typeof value === "number" ? value : value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Present: "bg-emerald-50 text-emerald-700",
    Late: "bg-amber-50 text-amber-700",
    Absent: "bg-rose-50 text-rose-700",
    WFH: "bg-indigo-50 text-indigo-700",
    Holiday: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${colors[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function SourcePill({ source }: { source?: string }) {
  const styles: Record<string, string> = {
    face_id: "bg-blue-50 text-blue-600",
    manual: "bg-gray-100 text-gray-500",
    self: "bg-purple-50 text-purple-600",
    regularized: "bg-emerald-50 text-emerald-600",
  };
  const labels: Record<string, string> = {
    face_id: "Face ID",
    manual: "Manual",
    self: "WFH",
    regularized: "Regularized",
  };
  const s = source || "manual";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[s] || styles.manual}`}>
      {labels[s] || s}
    </span>
  );
}

function formatTimeDisplay(timeStr: string | null) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function calcHours(inStr: string, outStr: string) {
  const [ih, im] = inStr.split(":").map(Number);
  const [oh, om] = outStr.split(":").map(Number);
  return Math.max(0, ((oh * 60 + om) - (ih * 60 + im)) / 60);
}
