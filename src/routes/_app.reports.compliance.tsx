import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, AlertTriangle, FileText, Download, CheckCircle2 } from "lucide-react";
import { PageContainer, PageHeader, FilterBar, StatTile, DataTable } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/reports/compliance")({
  head: () => ({ meta: [{ title: "Compliance Reports — LAMS" }] }),
  component: ComplianceReportsPage,
});

const CHECKS = [
  { area: "Working Hours Limit", status: "Compliant", coverage: "100%", findings: 0 },
  { area: "Minimum Break Compliance", status: "Compliant", coverage: "98%", findings: 12 },
  { area: "Overtime Approval Trail", status: "Compliant", coverage: "100%", findings: 0 },
  { area: "Leave Policy Adherence", status: "Attention", coverage: "94%", findings: 24 },
  { area: "Night Shift Allowances", status: "Compliant", coverage: "100%", findings: 0 },
  { area: "Holiday Calendar Sync", status: "Compliant", coverage: "100%", findings: 0 },
];

function ComplianceReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Compliance Reports"
        subtitle="Workforce compliance posture and audit-ready reporting"
        breadcrumbs={[{ label: "Reports" }, { label: "Compliance" }]}
        actions={
          <>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1.5" /> Audit Pack
            </Button>
            <Button size="sm" className="bg-gradient-brand text-white">
              <Download className="h-4 w-4 mr-1" /> Export All
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Compliance Score"
          value="A+"
          hint="98.6 / 100"
          icon={ShieldCheck}
          tone="success"
        />
        <StatTile
          label="Violations (30d)"
          value="36"
          hint="Trending down"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatTile label="Open Findings" value="6" icon={AlertTriangle} tone="destructive" />
        <StatTile
          label="Last Audit"
          value="May 28, 2026"
          hint="Passed"
          icon={CheckCircle2}
          tone="primary"
        />
      </div>

      <FilterBar
        placeholder="Search compliance areas…"
        filters={[
          { label: "Status", value: "All" },
          { label: "Period", value: "Last 30d" },
        ]}
      />

      <Card className="p-6 bg-surface border-border/60">
        <h3 className="font-semibold mb-4">Compliance Posture</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Policies", value: 12, comp: 12 },
            { label: "Audit Trails", value: 42, comp: 42 },
            { label: "Active Controls", value: 28, comp: 26 },
          ].map((c) => (
            <div key={c.label} className="p-4 rounded-xl border border-border bg-surface-muted">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-2xl font-bold mt-1">
                {c.comp}
                <span className="text-base text-muted-foreground">/{c.value}</span>
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success"
                  style={{ width: `${(c.comp / c.value) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <DataTable
        columns={["Compliance Area", "Status", "Coverage", "Findings", "Last Reviewed", "Report"]}
        rows={CHECKS.map((c) => [
          <span key="a" className="font-semibold">
            {c.area}
          </span>,
          <Badge
            key="s"
            className={`text-[10px] ${c.status === "Compliant" ? "bg-success/10 text-success border-success/20" : "bg-warning/15 text-warning border-warning/30"}`}
          >
            {c.status}
          </Badge>,
          <span key="c" className="font-mono font-semibold">
            {c.coverage}
          </span>,
          <span
            key="f"
            className={c.findings > 0 ? "text-warning font-semibold" : "text-muted-foreground"}
          >
            {c.findings}
          </span>,
          <span key="r" className="text-xs text-muted-foreground">
            Jun 7, 2026
          </span>,
          <Button key="b" variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>,
        ])}
      />
    </PageContainer>
  );
}
