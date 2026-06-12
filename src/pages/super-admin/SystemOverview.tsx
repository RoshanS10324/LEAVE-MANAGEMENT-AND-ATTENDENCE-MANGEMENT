import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Clock,
  CalendarCheck,
  Fingerprint,
  Bell,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SystemOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    pendingLeaves: 0,
    devicesOnline: 0,
    unreadNotifications: 0,
    auditEventsToday: 0,
  });
  const [attendanceTrend, setAttendanceTrend] = useState<
    { date: string; present: number }[]
  >([]);
  const [leaveStatus, setLeaveStatus] = useState<
    { status: string; count: number }[]
  >([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [
        { count: totalUsers },
        { count: activeToday },
        { count: pendingLeaves },
        { count: devicesOnline },
        { count: unreadNotifications },
        { count: auditEventsToday },
      ] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("date", today),
        supabase
          .from("leave_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending"),
        supabase
          .from("biometric_devices")
          .select("*", { count: "exact", head: true })
          .eq("status", "online"),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("read", false),
        supabase
          .from("audit_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        pendingLeaves: pendingLeaves || 0,
        devicesOnline: devicesOnline || 0,
        unreadNotifications: unreadNotifications || 0,
        auditEventsToday: auditEventsToday || 0,
      });

      // Attendance trend — last 7 days
      const trend: { date: string; present: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const { count } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("date", dateStr);
        trend.push({ date: dateStr, present: count || 0 });
      }
      setAttendanceTrend(trend);

      // Leave status breakdown
      const { data: leaveData } = await supabase
        .from("leave_applications")
        .select("status");
      if (leaveData) {
        const counts: Record<string, number> = {};
        leaveData.forEach((l) => {
          counts[l.status] = (counts[l.status] || 0) + 1;
        });
        setLeaveStatus(
          Object.entries(counts).map(([status, count]) => ({ status, count })),
        );
      }

      // Recent audit logs
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("*, employees(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (logs) setRecentLogs(logs);
    }
    load();
  }, []);

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Active Today", value: stats.activeToday, icon: Clock, color: "bg-success/10 text-success" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: CalendarCheck, color: "bg-warning/15 text-warning" },
    { label: "Devices Online", value: stats.devicesOnline, icon: Fingerprint, color: "bg-teal/15 text-teal" },
    { label: "Unread Notifications", value: stats.unreadNotifications, icon: Bell, color: "bg-destructive/10 text-destructive" },
    { label: "Audit Events Today", value: stats.auditEventsToday, icon: ScrollText, color: "bg-primary/10 text-primary" },
  ];

  const maxPresent = Math.max(...attendanceTrend.map((d) => d.present), 1);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-level metrics across the entire platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5 bg-surface border-border/60">
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className={`h-9 w-9 rounded-lg grid place-items-center ${s.color}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{s.value.toLocaleString()}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Attendance trend */}
        <Card className="p-6 bg-surface border-border/60">
          <h3 className="font-semibold mb-4">Attendance Trend (7 days)</h3>
          <div className="flex items-end gap-3 h-32">
            {attendanceTrend.map((d) => {
              const pct = maxPresent > 0 ? (d.present / maxPresent) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{d.present}</span>
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-blue-400 to-blue-300 transition-all"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "short",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Leave status */}
        <Card className="p-6 bg-surface border-border/60">
          <h3 className="font-semibold mb-4">Leave Requests (This Month)</h3>
          <div className="space-y-3">
            {leaveStatus.map((l) => {
              const total = leaveStatus.reduce((a, b) => a + b.count, 0);
              const pct = total > 0 ? (l.count / total) * 100 : 0;
              const colorMap: Record<string, string> = {
                Pending: "bg-amber-400",
                Approved: "bg-emerald-400",
                Rejected: "bg-red-400",
                Cancelled: "bg-gray-400",
              };
              return (
                <div key={l.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{l.status}</span>
                    <span className="text-muted-foreground">{l.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${colorMap[l.status] || "bg-blue-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {leaveStatus.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No leave requests this month
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent audit logs */}
      <Card className="bg-surface border-border/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Recent Audit Logs</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/audit">
              View All Logs <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted border-b border-border">
                {["Time", "User", "Action", "Entity", "Details"].map((c) => (
                  <th
                    key={c}
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium">
                    {l.employees?.name || l.user_id?.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{l.action}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {l.entity || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                    {l.new_value || l.old_value || "—"}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No audit logs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
