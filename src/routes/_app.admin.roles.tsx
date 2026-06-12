import { createFileRoute } from "@tanstack/react-router";
import { Shield, Lock, CheckCircle2, MoreHorizontal } from "lucide-react";
import { PageContainer, PageHeader, StatTile, DefaultActions } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/admin/roles")({
  head: () => ({ meta: [{ title: "Admin Roles — LAMS" }] }),
  component: AdminRolesPage,
});

const PERM_GRID = [
  { module: "Dashboard", admin: true, hr: true, mgr: true, payroll: true, emp: true },
  { module: "Employees", admin: true, hr: true, mgr: "Team only", payroll: false, emp: false },
  {
    module: "Attendance",
    admin: true,
    hr: true,
    mgr: "Team only",
    payroll: true,
    emp: "Self only",
  },
  { module: "Leave", admin: true, hr: true, mgr: "Approve", payroll: false, emp: "Self only" },
  { module: "Policies", admin: true, hr: true, mgr: false, payroll: false, emp: false },
  { module: "Reports", admin: true, hr: true, mgr: "Team only", payroll: true, emp: false },
  { module: "Integrations", admin: true, hr: false, mgr: false, payroll: false, emp: false },
  { module: "Audit Logs", admin: true, hr: "Read only", mgr: false, payroll: false, emp: false },
];

function cell(v: boolean | string) {
  if (v === true) return <CheckCircle2 className="h-4 w-4 text-success mx-auto" />;
  if (v === false) return <span className="text-muted-foreground/40">—</span>;
  return <span className="text-[11px] font-semibold text-warning">{v}</span>;
}

function AdminRolesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Roles & Permissions"
        subtitle="RBAC matrix for LAMS modules"
        breadcrumbs={[{ label: "Administration" }, { label: "Roles" }]}
        actions={<DefaultActions />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Roles" value="6" icon={Shield} tone="primary" />
        <StatTile label="Permission Groups" value="34" icon={Lock} tone="teal" />
        <StatTile label="Custom Roles" value="2" icon={Shield} tone="warning" />
        <StatTile label="Compliance" value="100%" icon={CheckCircle2} tone="success" />
      </div>
      <Card className="bg-surface border-border/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-muted/40 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Permission Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Read / write / approve per role</p>
          </div>
          <Button variant="outline" size="sm">
            Edit matrix
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Module
                </th>
                {["System Admin", "HR Admin", "Manager", "Payroll", "Employee"].map((r) => (
                  <th
                    key={r}
                    className="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {r}
                  </th>
                ))}
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {PERM_GRID.map((p) => (
                <tr
                  key={p.module}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/40"
                >
                  <td className="px-4 py-3 font-semibold">{p.module}</td>
                  <td className="px-4 py-3 text-center">{cell(p.admin)}</td>
                  <td className="px-4 py-3 text-center">{cell(p.hr)}</td>
                  <td className="px-4 py-3 text-center">{cell(p.mgr)}</td>
                  <td className="px-4 py-3 text-center">{cell(p.payroll)}</td>
                  <td className="px-4 py-3 text-center">{cell(p.emp)}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
          Full access
        </Badge>
        <Badge variant="outline" className="text-[10px] text-warning">
          Conditional
        </Badge>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          No access
        </Badge>
      </div>
    </PageContainer>
  );
}
