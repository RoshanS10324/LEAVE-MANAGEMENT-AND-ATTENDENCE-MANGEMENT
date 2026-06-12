import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  CalendarOff,
  Home as HomeIcon,
  AlertCircle,
  Timer,
  ClipboardCheck,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Plane,
  Stethoscope,
  Plus,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Workforce Overview — LAMS" }] }),
  component: Dashboard,
});

// KPIs are now dynamic

const TREND = [
  { d: "Mon", present: 11200, leave: 420 },
  { d: "Tue", present: 11380, leave: 408 },
  { d: "Wed", present: 11540, leave: 380 },
  { d: "Thu", present: 11420, leave: 460 },
  { d: "Fri", present: 11280, leave: 510 },
  { d: "Sat", present: 6420, leave: 220 },
  { d: "Sun", present: 5860, leave: 180 },
];

const LEAVE_TREND = [
  { m: "Jul", casual: 320, sick: 180, earned: 240 },
  { m: "Aug", casual: 420, sick: 220, earned: 310 },
  { m: "Sep", casual: 380, sick: 260, earned: 290 },
  { m: "Oct", casual: 460, sick: 240, earned: 380 },
  { m: "Nov", casual: 510, sick: 280, earned: 420 },
  { m: "Dec", casual: 620, sick: 320, earned: 540 },
];

const DEPARTMENTS = [
  { name: "Engineering", attendance: 98.4, employees: 3420 },
  { name: "Operations", attendance: 97.1, employees: 2840 },
  { name: "Sales", attendance: 96.2, employees: 1980 },
  { name: "Customer Success", attendance: 99.1, employees: 1240 },
  { name: "Finance", attendance: 98.8, employees: 680 },
  { name: "Marketing", attendance: 95.8, employees: 540 },
];

function Dashboard() {
  const { employee } = useAuth();
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    if (employee) fetchStats();
  }, [employee]);

  const fetchStats = async () => {
    const isEmployeeOnly = employee.role === "employee";
    let newStats = [];

    if (isEmployeeOnly) {
      // 1. My Leave Balance
      const { data: bals } = await supabase.from("leave_balances").select("total, used").eq("emp_id", employee.id);
      let rem = 0;
      let used = 0;
      if (bals) {
        bals.forEach(b => {
          rem += (b.total - b.used);
          used += b.used;
        });
      }
      
      // 2. Overtime hours
      const { data: att } = await supabase.from("attendance").select("overtime_hours").eq("emp_id", employee.id);
      const ot = att?.reduce((s, a) => s + (a.overtime_hours || 0), 0) || 0;

      // 3. Pending requests
      const { count: pendingL } = await supabase.from("leave_applications").select("*", { count: "exact", head: true }).eq("emp_id", employee.id).eq("status", "Pending");
      const { count: pendingR } = await supabase.from("regularizations").select("*", { count: "exact", head: true }).eq("emp_id", employee.id).eq("status", "Pending");
      const { count: pendingO } = await supabase.from("overtime_requests").select("*", { count: "exact", head: true }).eq("emp_id", employee.id).eq("status", "Pending");
      const totalPending = (pendingL || 0) + (pendingR || 0) + (pendingO || 0);

      newStats = [
        { label: "My Leave Balance", value: rem.toString(), delta: "Days remaining", up: true, icon: CalendarOff, tone: "primary" },
        { label: "My Leaves Taken", value: used.toString(), delta: "Days taken", up: false, icon: UserCheck, tone: "warning" },
        { label: "Total Overtime", value: `${ot}h`, delta: "Recorded", up: true, icon: Timer, tone: "success" },
        { label: "My Pending Requests", value: totalPending.toString(), delta: "Awaiting approval", up: false, icon: AlertCircle, tone: "destructive" },
      ];
    } else {
      // Admin/Manager/HR view
      const today = new Date().toISOString().split("T")[0];
      
      const { count: totalEmp } = await supabase.from("employees").select("*", { count: "exact", head: true });
      const { count: present } = await supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today).eq("status", "Present");
      const { count: onLeave } = await supabase.from("leave_applications").select("*", { count: "exact", head: true }).lte("from_date", today).gte("to_date", today).eq("status", "Approved");
      
      let pendingApprovalsCount = 0;
      if (employee.role === "manager") {
        const { data: team } = await supabase.from("employees").select("id").eq("manager_id", employee.id);
        const teamIds = team?.map(t => t.id) || [];
        if (teamIds.length > 0) {
          const { count: pL } = await supabase.from("leave_applications").select("*", { count: "exact", head: true }).in("emp_id", teamIds).eq("status", "Pending");
          const { count: pR } = await supabase.from("regularizations").select("*", { count: "exact", head: true }).in("emp_id", teamIds).eq("status", "Pending");
          const { count: pO } = await supabase.from("overtime_requests").select("*", { count: "exact", head: true }).in("emp_id", teamIds).eq("status", "Pending");
          pendingApprovalsCount = (pL || 0) + (pR || 0) + (pO || 0);
        }
      } else {
        const { count: pL } = await supabase.from("leave_applications").select("*", { count: "exact", head: true }).eq("status", "Manager_Approved");
        const { count: pR } = await supabase.from("regularizations").select("*", { count: "exact", head: true }).eq("status", "Manager_Approved");
        const { count: pO } = await supabase.from("overtime_requests").select("*", { count: "exact", head: true }).eq("status", "Manager_Approved");
        pendingApprovalsCount = (pL || 0) + (pR || 0) + (pO || 0);
      }

      newStats = [
        { label: "Total Employees", value: totalEmp?.toString() || "0", delta: "Active", up: true, icon: Users, tone: "primary" },
        { label: "Present Today", value: present?.toString() || "0", delta: "Checked in", up: true, icon: UserCheck, tone: "success" },
        { label: "On Leave Today", value: onLeave?.toString() || "0", delta: "Approved", up: false, icon: CalendarOff, tone: "warning" },
        { label: "Pending Approvals", value: pendingApprovalsCount.toString(), delta: "Action required", up: false, icon: ClipboardCheck, tone: "destructive" },
      ];
    }
    setStats(newStats);
  };
  
  const baseCardClass = "bg-transparent";

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* The Greeting Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative SVG pattern */}
        <svg className="absolute right-0 top-0 h-full w-1/3 opacity-20 transform translate-x-1/4" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="0,100 100,0 100,100" fill="currentColor" />
        </svg>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back, {(employee?.name || '').split(' ')[0] || 'Team'}! 👋
            </h1>
            <p className="text-indigo-100 opacity-90 max-w-xl text-sm font-medium">
              Here is a quick overview of your {employee?.role === "employee" ? "attendance and leave statistics" : "workforce pending actions"}.
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-white text-indigo-600 hover:bg-slate-50 transition-colors shadow-sm" asChild>
              <Link to="/apply-leave">
                <Plus className="h-4 w-4 mr-2" /> New Request
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {stats.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${baseCardClass}`}>
          <ChartHeader title="Attendance Trend" subtitle="Last 7 days · Present vs On Leave" />
          <div className="h-72 mt-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ left: -10, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="d"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#gp)"
                />
                <Area
                  type="monotone"
                  dataKey="leave"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#gl)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={baseCardClass}>
          <ChartHeader title="Workforce Utilization" subtitle="By work mode" />
          <div className="mt-6 space-y-3">
            {[
              { label: "On-site", value: 78, color: "#4f46e5" },
              { label: "Remote / WFH", value: 14, color: "#8b5cf6" },
              { label: "Hybrid", value: 6, color: "#f59e0b" },
              { label: "Field", value: 2, color: "#10b981" },
            ].map((r) => (
              <div key={r.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">{r.label}</span>
                  <span className="font-bold text-slate-900">{r.value}%</span>
                </div>
                <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${r.value}%`, background: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200/60">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Overall Capacity</span>
              <span className="font-bold text-slate-900">87.2%</span>
            </div>
            <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-100 shadow-sm">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: "87%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Leave + Department row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${baseCardClass}`}>
          <ChartHeader title="Leave Trend" subtitle="Last 6 months by leave type" />
          <div className="h-72 mt-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={LEAVE_TREND}
                margin={{ left: -10, right: 4, top: 4 }}
                barGap={4}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="m"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                <Bar dataKey="casual" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sick" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="earned" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={baseCardClass}>
          <ChartHeader title="Department Attendance" subtitle="Heatmap · today" />
          <div className="mt-6 space-y-3">
            {DEPARTMENTS.map((d) => (
              <div key={d.name} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                <div className="w-32 text-sm font-medium text-slate-700 truncate">{d.name}</div>
                <div className="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden relative border border-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                    style={{
                      width: `${d.attendance}%`,
                      background:
                        d.attendance >= 98
                          ? "#10b981"
                          : d.attendance >= 96
                            ? "#4f46e5"
                            : "#f59e0b",
                      opacity: 0.9,
                    }}
                  />
                  <div className="relative h-full flex items-center px-3 text-[12px] font-bold text-white shadow-sm">
                    {d.attendance}%
                  </div>
                </div>
                <div className="w-12 text-right text-xs font-medium text-slate-500">
                  {(d.employees / 1000).toFixed(1)}k
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approval Center + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${baseCardClass}`}>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Approval Center</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Pending workforce actions across your scope
                </p>
              </div>
              <Button variant="outline" size="sm" className="bg-white text-slate-600 border-slate-200 shadow-sm rounded-xl">
                View all
              </Button>
            </div>
          </div>
          
          <div className="flex gap-6 text-sm font-medium text-slate-500 mb-4 border-b border-slate-200/60">
            <button className="text-indigo-600 border-b-2 border-indigo-600 pb-3 -mb-px px-1">
              Leave (28)
            </button>
            <button className="hover:text-slate-900 transition-colors pb-3 -mb-px px-1 border-b-2 border-transparent hover:border-slate-300">
              Regularization (14)
            </button>
            <button className="hover:text-slate-900 transition-colors pb-3 -mb-px px-1 border-b-2 border-transparent hover:border-slate-300">
              WFH (19)
            </button>
            <button className="hover:text-slate-900 transition-colors pb-3 -mb-px px-1 border-b-2 border-transparent hover:border-slate-300">
              Overtime (6)
            </button>
          </div>

          <div className="w-full space-y-3">
            {LEAVE_REQUESTS.map((r) => (
              <ApprovalRow key={r.id} {...r} />
            ))}
          </div>
        </div>

        <div className={baseCardClass}>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Recent Activity</h3>
          <p className="text-sm text-slate-500 mb-6">Across the organization</p>
          <div className="space-y-3">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${a.tone}`}>
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{a.who}</span> {a.action}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="w-full mt-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors">
            View full activity log <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, up, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Icon className="h-6 w-6" />
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold ${
            up ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
          }`}
        >
          {up ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}{" "}
          {delta}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-3xl font-bold text-slate-900 mt-2">{value}</div>
      </div>
    </div>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

const LEAVE_REQUESTS = [
  {
    id: 1,
    name: "Arjun Mehta",
    role: "Sr. Engineer · Engineering",
    type: "Earned Leave",
    days: "3 days",
    date: "Jun 12 – Jun 14",
    icon: Plane,
    status: "Pending",
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "Account Manager · Sales",
    type: "Sick Leave",
    days: "1 day",
    date: "Jun 9",
    icon: Stethoscope,
    status: "Pending",
  },
  {
    id: 3,
    name: "Daniel Park",
    role: "Designer · Marketing",
    type: "Casual Leave",
    days: "2 days",
    date: "Jun 16 – Jun 17",
    icon: Plane,
    status: "Pending",
  },
  {
    id: 4,
    name: "Lina Costa",
    role: "Ops Lead · Operations",
    type: "Earned Leave",
    days: "5 days",
    date: "Jun 22 – Jun 26",
    icon: Plane,
    status: "Pending",
  },
];

function ApprovalRow({ name, role, type, days, date }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-4 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 w-full sm:w-1/3">
        <Avatar className="h-10 w-10 border border-slate-200">
          <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-bold">
            {(name || 'U').split(" ").map((n: string) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-bold text-slate-900">{name}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">{role}</div>
        </div>
      </div>
      <div className="w-full sm:w-1/4">
        <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
          {type}
        </span>
      </div>
      <div className="w-full sm:w-1/4">
        <div className="text-sm font-bold text-slate-900">{days}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">{date}</div>
      </div>
      <div className="w-full sm:w-auto sm:text-right">
        <div className="flex sm:justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" className="h-8 px-4 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl">
            Decline
          </Button>
          <Button size="sm" className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl">
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

const ACTIVITY = [
  {
    who: "Arjun Mehta",
    action: "applied for 3 days earned leave",
    time: "2 minutes ago",
    icon: Plane,
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    who: "Sarah Reyes",
    action: "approved Priya Sharma's sick leave",
    time: "12 minutes ago",
    icon: ClipboardCheck,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    who: "System",
    action: "synced 1,240 biometric records from Zone-A",
    time: "32 minutes ago",
    icon: Activity,
    tone: "bg-purple-50 text-purple-600",
  },
  {
    who: "HR Admin",
    action: "updated WFH policy for Engineering",
    time: "1 hour ago",
    icon: ShieldCheck,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    who: "Daniel Park",
    action: "submitted attendance regularization",
    time: "2 hours ago",
    icon: Timer,
    tone: "bg-indigo-50 text-indigo-600",
  },
];
