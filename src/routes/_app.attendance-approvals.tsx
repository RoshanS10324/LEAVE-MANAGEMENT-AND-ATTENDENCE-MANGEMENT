import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Clock, CheckCircle2, Timer, Home, Edit3 } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  FilterBar,
  StatTile,
  DataTable,
  StatusPill,
} from "@/components/lams/page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRegularizationStore } from "../store/useRegularizationStore";

export const Route = createFileRoute("/_app/attendance-approvals")({
  head: () => ({ meta: [{ title: "Attendance Approvals — LAMS" }] }),
  component: AttendanceApprovalsPage,
});

function AttendanceApprovalsPage() {
  const { employee } = useAuth();
  const { pendingRegularizations, hydrate, approveRegularization, rejectRegularization } = useRegularizationStore();

  useEffect(() => {
    if (employee) {
      hydrate(employee.role, employee.id);
    }
  }, [employee, hydrate]);

  const handleAction = (id: string, status: "Approved" | "Rejected") => {
    if (status === "Approved") {
      approveRegularization(id);
    } else {
      rejectRegularization(id);
    }
  };

  const regularizationCount = pendingRegularizations.length;

  return (
    <PageContainer>
      <PageHeader
        title="Attendance Approvals"
        subtitle="Regularization, overtime, and WFH requests awaiting approval"
        breadcrumbs={[{ label: "Approvals" }, { label: "Attendance Approvals" }]}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Pending" value={regularizationCount.toString()} icon={Clock} tone="warning" />
        <StatTile
          label="Regularization"
          value={regularizationCount.toString()}
          icon={Edit3}
          tone="primary"
        />
        <StatTile label="Overtime" value="0" icon={Timer} tone="warning" />
        <StatTile label="WFH" value="0" icon={Home} tone="teal" />
      </div>
      <FilterBar
        placeholder="Search pending requests…"
        filters={[{ label: "Type", value: "All" }, { label: "Team" }]}
      />
      <DataTable
        columns={["Employee", "Type", "Details", "Date", "Status", "Actions"]}
        rows={pendingRegularizations.map((p) => {
          const empName = p.employees?.name || "Unknown";
          return [
            <div key="n" className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-brand text-white text-[10px]">
                  {empName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{empName}</span>
            </div>,
            <span
              key="t"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent text-primary-deep text-xs font-semibold"
            >
              <Edit3 className="h-3.5 w-3.5" /> Regularization
            </span>,
            <span key="d" className="text-sm">
              {p.reason} · {p.req_in} → {p.req_out}
            </span>,
            <span key="dt" className="text-xs text-muted-foreground">
              {p.date}
            </span>,
            <StatusPill key="s" status={p.status} />,
            (p.status === "Pending" || p.status === "Manager_Approved") ? (
              <div key="a" className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                  onClick={() => handleAction(p.id, "Rejected")}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-success text-success-foreground hover:opacity-90"
                  onClick={() => handleAction(p.id, "Approved")}
                >
                  Approve
                </Button>
              </div>
            ) : (
              <span key="a" className="text-xs text-muted-foreground">
                —
              </span>
            ),
          ];
        })}
      />
    </PageContainer>
  );
}
