import { createFileRoute } from "@tanstack/react-router";
import { Plane, Stethoscope, CalendarCheck, FileText, MoreHorizontal } from "lucide-react";
import { PageContainer, PageHeader, FilterBar, DataTable } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLeaveStore } from "../store/useLeaveStore";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/_app/leave-balances")({
  head: () => ({ meta: [{ title: "Leave Balances — LAMS" }] }),
  component: LeaveBalancesPage,
});

const ICON_MAP: Record<string, any> = {
  Annual: Plane,
  Casual: CalendarCheck,
  Sick: Stethoscope,
  "Comp Off": FileText,
};

function LeaveBalancesPage() {
  const { balances } = useLeaveStore();
  const [orgBalances, setOrgBalances] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("leave_balances")
      .select("*, employees(name, department), leave_types(name)")
      .eq("year", new Date().getFullYear())
      .then(({ data }) => {
        if (data) setOrgBalances(data);
      });
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Leave Balances"
        subtitle="Your balance plus organization-wide leave utilization"
        breadcrumbs={[{ label: "Leave Management" }, { label: "Leave Balances" }]}
      />

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Your Balances · {new Date().getFullYear()}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((m: any) => {
            const pct = m.total > 0 ? (m.used / m.total) * 100 : 0;
            const Icon = ICON_MAP[m.leave_types?.name] || Plane;
            return (
              <Card key={m.leave_type_id} className="p-5 bg-surface border-border/60">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-10 w-10 rounded-lg grid place-items-center bg-primary/10 text-primary`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Available</div>
                    <div className="text-2xl font-bold">{m.total - m.used}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold">{m.leave_types?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.used} used · {m.total} total
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-brand rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <FilterBar
        placeholder="Search employees…"
        filters={[
          { label: "Department" },
          { label: "Year", value: new Date().getFullYear().toString() },
        ]}
      />
      <DataTable
        columns={["Employee", "Department", "Leave Type", "Total", "Used", "Available", ""]}
        rows={orgBalances.map((b: any) => [
          <div key="n" className="flex items-center gap-3 min-w-[180px]">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-brand text-white text-[10px] font-semibold">
                {(b.employees?.name || "U")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm">{b.employees?.name || "Unknown"}</div>
            </div>
          </div>,
          <span key="dept" className="text-xs">
            {b.employees?.department || "—"}
          </span>,
          <span key="lt" className="text-sm">
            {b.leave_types?.name || "Leave"}
          </span>,
          <span key="tot" className="font-semibold">
            {b.total}
          </span>,
          <span key="used" className="text-sm">
            {b.used}
          </span>,
          <span key="avail" className="font-bold text-success">
            {b.total - b.used}
          </span>,
          <Button key="a" variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>,
        ])}
      />
    </PageContainer>
  );
}
