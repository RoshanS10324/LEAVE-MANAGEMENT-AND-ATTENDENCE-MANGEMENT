import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Clock, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  FilterBar,
  StatTile,
  DataTable,
  StatusPill,
  DefaultActions,
} from "@/components/lams/page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLeaveStore } from "../store/useLeaveStore";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/_app/leave-requests")({
  head: () => ({ meta: [{ title: "Leave Requests — LAMS" }] }),
  component: LeaveRequestsPage,
});

function LeaveRequestsPage() {
  const { myLeaves, pendingLeaves, cancelLeave } = useLeaveStore();
  const { employee } = useAuth();

  // Show all leaves for the current user; HR/managers see pending from team
  const allLeaves = myLeaves;
  const approved = allLeaves.filter((l) => l.status === "Approved").length;
  const rejected = allLeaves.filter((l) => l.status === "Rejected").length;
  const totalDays = allLeaves.reduce((s, l) => s + (l.days || 0), 0);

  function safeDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Leave Requests"
        subtitle="All leave applications across your scope"
        breadcrumbs={[{ label: "Leave Management" }, { label: "Leave Requests" }]}
        actions={<DefaultActions />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Pending"
          value={pendingLeaves.length.toString()}
          icon={Clock}
          tone="warning"
        />
        <StatTile label="Approved" value={approved.toString()} icon={CheckCircle2} tone="success" />
        <StatTile label="Rejected" value={rejected.toString()} icon={XCircle} tone="destructive" />
        <StatTile
          label="Total Days"
          value={totalDays.toString()}
          icon={CalendarCheck}
          tone="primary"
        />
      </div>
      <FilterBar
        placeholder="Search by employee, type…"
        filters={[
          { label: "Status", value: "All" },
          { label: "Type" },
          { label: "Period", value: "Last 30d" },
          { label: "Department" },
        ]}
      />
      <DataTable
        columns={["Leave Type", "Days", "From", "To", "Applied On", "Status", "Actions"]}
        rows={allLeaves.map((r) => [
          <span
            key="t"
            className="inline-flex px-2 py-0.5 rounded bg-accent text-primary-deep text-xs font-semibold"
          >
            {r.leave_types?.name || "Leave"}
          </span>,
          <span key="d" className="font-bold">
            {r.days}
          </span>,
          <span key="f" className="text-sm">
            {r.from_date}
          </span>,
          <span key="to" className="text-sm">
            {r.to_date}
          </span>,
          <span key="a" className="text-xs text-muted-foreground">
            {safeDate(r.created_at)}
          </span>,
          <StatusPill key="s" status={r.status as any} />,
          <div key="x" className="flex gap-2">
            {r.status === "Pending" && employee && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelLeave(r.id, r.days, r.leave_type_id, r.status, employee.id)}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
              >
                Cancel
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>,
        ])}
      />
    </PageContainer>
  );
}
