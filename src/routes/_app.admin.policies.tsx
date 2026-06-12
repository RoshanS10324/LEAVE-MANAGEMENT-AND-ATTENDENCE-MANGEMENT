import { createFileRoute } from "@tanstack/react-router";
import { FileText, Settings2, Shield, Workflow, MoreHorizontal } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  FilterBar,
  StatTile,
  DefaultActions,
} from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/admin/policies")({
  head: () => ({ meta: [{ title: "Policies — LAMS Administration" }] }),
  component: AdminPoliciesPage,
});

const POLICIES = [
  {
    name: "Attendance Grace Period",
    category: "Attendance",
    desc: "Allow 10 minutes after shift start without late mark",
    scope: "All employees",
    on: true,
  },
  {
    name: "Late Mark After Grace",
    category: "Attendance",
    desc: "Auto mark Late if check-in > grace window",
    scope: "All employees",
    on: true,
  },
  {
    name: "Half-day Threshold",
    category: "Attendance",
    desc: "Mark half-day if hours worked < 4h",
    scope: "All employees",
    on: true,
  },
  {
    name: "Auto-approve Sick Leave",
    category: "Leave",
    desc: "Auto-approve sick leave ≤ 1 day with doctor's note",
    scope: "All employees",
    on: false,
  },
  {
    name: "Escalate Approval",
    category: "Workflow",
    desc: "Escalate to L2 manager after 48h pending",
    scope: "All approvers",
    on: true,
  },
  {
    name: "Carry Forward Cap",
    category: "Leave",
    desc: "Earned Leave carry forward limited to 30 days",
    scope: "All employees",
    on: true,
  },
  {
    name: "Negative Balance Prevention",
    category: "Leave",
    desc: "Block leave applications exceeding balance",
    scope: "All employees",
    on: true,
  },
  {
    name: "Weekend OT Auto-approval",
    category: "Overtime",
    desc: "Auto-approve weekend OT ≤ 4h",
    scope: "Engineering",
    on: false,
  },
];

function AdminPoliciesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Policies"
        subtitle="Workforce rules, automation, and policy configuration"
        breadcrumbs={[{ label: "Administration" }, { label: "Policies" }]}
        actions={<DefaultActions />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Active Policies" value="42" icon={FileText} tone="primary" />
        <StatTile label="Automation Rules" value="18" icon={Workflow} tone="teal" />
        <StatTile label="Approval Chains" value="12" icon={Shield} tone="warning" />
        <StatTile label="Modified (30d)" value="6" icon={Settings2} tone="success" />
      </div>
      <FilterBar
        placeholder="Search policies…"
        filters={[{ label: "Category" }, { label: "Status", value: "All" }, { label: "Scope" }]}
      />
      <Card className="bg-surface border-border/60 divide-y divide-border">
        {POLICIES.map((p) => (
          <div
            key={p.name}
            className="p-5 flex items-start gap-4 hover:bg-surface-muted/40 transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-accent grid place-items-center text-primary-deep">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{p.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {p.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <div className="text-[11px] text-muted-foreground mt-2">
                Scope: <span className="font-semibold text-foreground">{p.scope}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch defaultChecked={p.on} />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </PageContainer>
  );
}
