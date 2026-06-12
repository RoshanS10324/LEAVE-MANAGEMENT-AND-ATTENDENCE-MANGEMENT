import { createFileRoute } from "@tanstack/react-router";
import {
  FileBarChart,
  Download,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { PageContainer, PageHeader, FilterBar, StatTile } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import BRDTag from "@/components/BRDTag";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_app/reports/attendance")({
  head: () => ({ meta: [{ title: "Attendance Reports — LAMS" }] }),
  component: AttendanceReportsPage,
});

const DATA = [
  { d: "Eng", present: 3360, late: 38, absent: 22 },
  { d: "Ops", present: 2790, late: 32, absent: 18 },
  { d: "Sales", present: 1920, late: 42, absent: 18 },
  { d: "CS", present: 1228, late: 8, absent: 4 },
  { d: "Finance", present: 672, late: 4, absent: 4 },
  { d: "Marketing", present: 522, late: 12, absent: 6 },
];

function AttendanceReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Attendance Reports"
        subtitle="Generate, schedule, and export attendance reports"
        breadcrumbs={[{ label: "Reports" }, { label: "Attendance" }]}
        badge={<BRDTag label="BRD FR-5: Reporting" />}
        actions={
          <>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1.5" /> PDF
            </Button>
            <Button size="sm" className="bg-gradient-brand text-white">
              <Download className="h-4 w-4 mr-1" /> Generate
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Reports Available" value="24" icon={FileBarChart} tone="primary" />
        <StatTile label="Scheduled" value="6" icon={Calendar} tone="teal" />
        <StatTile label="Coverage" value="All depts" icon={Building2} tone="success" />
        <StatTile label="Avg Attendance" value="97.8%" icon={FileBarChart} tone="warning" />
      </div>

      <FilterBar
        placeholder="Search reports…"
        filters={[
          { label: "Period", value: "Jun 2026" },
          { label: "Department" },
          { label: "Format" },
        ]}
      />

      <Card className="p-6 bg-surface border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Department Attendance Breakdown</h3>
            <p className="text-xs text-muted-foreground">June 2026 · Present / Late / Absent</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DATA} margin={{ left: -10, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="d"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="present"
                stackId="a"
                fill="var(--color-success)"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="late" stackId="a" fill="var(--color-warning)" />
              <Bar
                dataKey="absent"
                stackId="a"
                fill="var(--color-destructive)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            name: "Daily Attendance Summary",
            desc: "Headcount, late, absent by day",
            count: "Last run today",
          },
          {
            name: "Monthly Attendance Detail",
            desc: "Per-employee daily attendance log",
            count: "Scheduled · Monthly",
          },
          {
            name: "Department Wise Report",
            desc: "Aggregated by department & location",
            count: "Last run 2d ago",
          },
          {
            name: "Late Arrivals Report",
            desc: "Employees crossing tolerance grace",
            count: "Scheduled · Weekly",
          },
          {
            name: "Overtime Summary",
            desc: "OT hours, cost, and approvals",
            count: "Last run today",
          },
          {
            name: "WFH Utilization",
            desc: "Remote work patterns by team",
            count: "Last run yesterday",
          },
        ].map((r) => (
          <Card
            key={r.name}
            className="p-5 bg-surface border-border/60 hover:shadow-card transition-shadow"
          >
            <div className="h-10 w-10 rounded-lg bg-accent grid place-items-center text-primary-deep">
              <FileBarChart className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{r.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{r.count}</span>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-3.5 w-3.5 mr-1" /> Export
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
