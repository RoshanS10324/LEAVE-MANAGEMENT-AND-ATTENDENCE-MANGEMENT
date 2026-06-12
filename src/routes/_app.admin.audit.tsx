import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, ShieldCheck, AlertTriangle, Activity, Download } from "lucide-react";
import { PageContainer, PageHeader, FilterBar, StatTile } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BRDTag from "@/components/BRDTag";

export const Route = createFileRoute("/_app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — LAMS" }] }),
  component: AuditLogsPage,
});

const LOGS = [
  {
    time: "Jun 9, 11:42:18",
    actor: "Sarah Reyes",
    action: "Approved leave request",
    target: "LR-49281 · Arjun Mehta",
    ip: "10.42.1.18",
    sev: "info" as const,
  },
  {
    time: "Jun 9, 11:38:04",
    actor: "System",
    action: "Synced biometric records",
    target: "Zone-A · 1,240 entries",
    ip: "—",
    sev: "info" as const,
  },
  {
    time: "Jun 9, 11:24:51",
    actor: "Aisha Khan",
    action: "Updated leave policy",
    target: "Sick Leave · Threshold",
    ip: "10.42.1.42",
    sev: "warn" as const,
  },
  {
    time: "Jun 9, 10:58:33",
    actor: "Robert Vasquez",
    action: "Rejected regularization",
    target: "REG-30192 · Yusuf Khan",
    ip: "10.42.4.7",
    sev: "info" as const,
  },
  {
    time: "Jun 9, 10:42:18",
    actor: "System",
    action: "Failed integration sync",
    target: "Payroll · ADP",
    ip: "—",
    sev: "error" as const,
  },
  {
    time: "Jun 9, 10:30:00",
    actor: "Sarah Reyes",
    action: "Created user",
    target: "hannah.b@northwind.co",
    ip: "10.42.1.18",
    sev: "info" as const,
  },
  {
    time: "Jun 9, 09:48:22",
    actor: "Daniel Park",
    action: "Applied for leave",
    target: "LR-49283 · Casual Leave",
    ip: "10.42.2.91",
    sev: "info" as const,
  },
];

const sevMap: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warn: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

function AuditLogsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable activity trail across all LAMS modules"
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Logs" }]}
        badge={<BRDTag label="BRD FR-8: Audit Tracking" />}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Events (24h)" value="18,420" icon={Activity} tone="primary" />
        <StatTile label="Admin Actions (24h)" value="284" icon={ShieldCheck} tone="teal" />
        <StatTile label="Errors (24h)" value="12" icon={AlertTriangle} tone="destructive" />
        <StatTile label="Retention" value="7 years" icon={ScrollText} tone="success" />
      </div>
      <FilterBar
        placeholder="Search by actor, action, target…"
        filters={[
          { label: "Severity", value: "All" },
          { label: "Module" },
          { label: "Time", value: "24h" },
        ]}
      />
      <Card className="bg-surface border-border/60 overflow-hidden">
        <div className="divide-y divide-border">
          {LOGS.map((l, i) => (
            <div
              key={i}
              className="p-4 flex items-start gap-4 hover:bg-surface-muted/40 transition-colors"
            >
              <div className="font-mono text-[11px] text-muted-foreground w-32 flex-shrink-0 mt-0.5">
                {l.time}
              </div>
              <Badge className={`text-[10px] uppercase font-bold border ${sevMap[l.sev]}`}>
                {l.sev}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-semibold">{l.actor}</span>{" "}
                  <span className="text-muted-foreground">·</span> {l.action}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{l.target}</div>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">{l.ip}</div>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
