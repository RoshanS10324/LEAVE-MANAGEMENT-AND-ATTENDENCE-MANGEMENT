import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Clock, CheckCircle2, AlertCircle, Plane, Stethoscope } from "lucide-react";
import { PageContainer, PageHeader, FilterBar, StatTile } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLeaveStore } from "../store/useLeaveStore";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/leave-approvals")({
  head: () => ({ meta: [{ title: "Leave Approvals — LAMS" }] }),
  component: LeaveApprovalsPage,
});

function LeaveApprovalsPage() {
  const { pendingLeaves, approveLeave, rejectLeave } = useLeaveStore();

  return (
    <PageContainer>
      <PageHeader
        title="Leave Approvals"
        subtitle="Pending leave requests awaiting your decision"
        breadcrumbs={[{ label: "Approvals" }, { label: "Leave Approvals" }]}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Pending"
          value={pendingLeaves.length.toString()}
          icon={Clock}
          tone="warning"
        />
        <StatTile label="Urgent" value="0" icon={AlertCircle} tone="destructive" />
        <StatTile label="Approved Today" value="0" icon={CheckCircle2} tone="success" />
        <StatTile label="Avg TAT" value="3.2h" icon={ClipboardCheck} tone="primary" />
      </div>
      <FilterBar
        placeholder="Search pending approvals…"
        filters={[{ label: "Team", value: "All" }, { label: "Type" }, { label: "Period" }]}
      />

      <div className="space-y-3">
        {pendingLeaves.map((p) => {
          return (
            <Card
              key={p.id}
              className="p-5 bg-surface border-border/60 hover:shadow-card transition-shadow"
            >
              <div className="flex flex-wrap items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-brand text-white font-semibold">
                    {p.employees?.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.employees?.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.employees?.designation} · {p.employees?.department}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-accent text-primary-deep text-xs font-semibold">
                      <Plane className="h-3.5 w-3.5" /> {p.leave_types?.name || "Leave"}
                    </span>
                    <span className="text-sm font-bold">
                      {p.days} {p.days === 1 ? "day" : "days"}
                    </span>
                    <span className="text-sm text-muted-foreground">·</span>
                    <span className="text-sm font-medium">
                      {p.from_date} to {p.to_date}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Reason: <span className="text-foreground">{p.reason}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => rejectLeave(p.id)}>
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success text-success-foreground hover:opacity-90"
                    onClick={() => approveLeave(p.id, p.days, p.leave_type_id, p.emp_id)}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
