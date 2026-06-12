import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Download, FileSpreadsheet, FileText } from "lucide-react";
import { PageContainer, PageHeader, FilterBar, StatTile } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_app/reports/leave")({
  head: () => ({ meta: [{ title: "Leave Reports — LAMS" }] }),
  component: LeaveReportsPage,
});

const PIE = [
  { name: "Earned", value: 1420, fill: "var(--color-primary)" },
  { name: "Casual", value: 620, fill: "var(--color-teal)" },
  { name: "Sick", value: 480, fill: "var(--color-warning)" },
  { name: "Comp Off", value: 180, fill: "var(--color-success)" },
];

function LeaveReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Leave Reports"
        subtitle="Leave utilization, encashment, and balance reports"
        breadcrumbs={[{ label: "Reports" }, { label: "Leave" }]}
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
        <StatTile label="Leaves Taken (Mo)" value="2,184" tone="primary" />
        <StatTile label="Utilization" value="67%" hint="Target 75%" tone="teal" />
        <StatTile label="Encashment Eligible" value="842" hint="Employees" tone="warning" />
        <StatTile label="LOP Days" value="62" tone="destructive" />
      </div>

      <FilterBar
        placeholder="Search reports…"
        filters={[
          { label: "Period", value: "Jun 2026" },
          { label: "Type" },
          { label: "Department" },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 bg-surface border-border/60">
          <h3 className="font-semibold">Leave Mix · This Month</h3>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {PIE.map((p) => (
                    <Cell key={p.name} fill={p.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-border/60">
          <h3 className="font-semibold mb-4">Standard Reports</h3>
          <div className="space-y-2">
            {[
              "Leave Balance Statement",
              "Leave Encashment Report",
              "Carry Forward Report",
              "Department Leave Utilization",
              "Loss of Pay (LOP) Report",
              "Leave Application Audit Trail",
            ].map((r) => (
              <div
                key={r}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-muted transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center text-primary-deep">
                    <FileBarChart className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{r}</span>
                </div>
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
