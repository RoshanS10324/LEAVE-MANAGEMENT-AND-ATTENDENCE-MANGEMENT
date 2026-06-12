import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, ShieldCheck, KeyRound, MoreHorizontal, Plus, Download } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { UserFormModal } from "../pages/super-admin/UserManagement";
import type { Employee } from "../pages/super-admin/UserManagement";
import { supabase } from "../lib/supabaseClient";


export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — LAMS Administration" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
    if (data) setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function resetFaceId(empId: string, name: string) {
    const ok = window.confirm(`Reset Face ID for ${name}?`);
    if (!ok) return;
    const { error } = await supabase.from("face_descriptors").delete().eq("emp_id", empId);
    if (!error) alert(`Face ID reset for ${name}`);
  }

  const activeCount = employees.filter(e => e.is_active !== false).length;

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        subtitle="Administer LAMS user accounts and access"
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
            <Button size="sm" className="bg-gradient-brand text-white" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total Users" value={employees.length} icon={Users} tone="primary" />
        <StatTile label="Active" value={activeCount} icon={ShieldCheck} tone="success" />
        <StatTile label="With MFA" value="0%" icon={KeyRound} tone="teal" />
        <StatTile label="New (30d)" value={employees.length} icon={UserPlus} tone="warning" />
      </div>
      <FilterBar
        placeholder="Search users…"
        filters={[
          { label: "Role" },
          { label: "Status", value: "Active" },
          { label: "Auth Method" },
        ]}
      />
      <DataTable
        columns={["User", "Role", "Department", "Designation", "Status", ""]}
        rows={employees.map((u) => [
          <div key="n" className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-gradient-brand text-white text-xs font-semibold">
                {(u.name || "U").split(" ").map((n) => n[0]).join("").substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm">{u.name || "Unknown User"}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
          </div>,
          <Badge key="r" variant="secondary" className="text-[10px]">
            {u.role}
          </Badge>,
          <span key="a" className="text-xs font-mono">
            {u.department || "—"}
          </span>,
          <span key="l" className="text-xs text-muted-foreground">
            {u.designation || "—"}
          </span>,
          <StatusPill key="s" status={u.is_active !== false ? "Active" : "Inactive"} />,
          <div key="m" className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-primary border-primary/20 hover:bg-primary/10 h-8 text-xs"
              onClick={() => setEditEmployee(u)}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-amber-600 border-amber-200 hover:bg-amber-50 h-8 text-xs"
              onClick={() => resetFaceId(u.id, u.name)}
            >
              Reset Face ID
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>,
        ])}
      />

      {showCreateModal && (
        <UserFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchEmployees();
            alert("User created and email sent successfully!");
          }}
          showToast={(msg) => alert(msg)}
        />
      )}

      {editEmployee && (
        <UserFormModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={() => {
            setEditEmployee(null);
            fetchEmployees();
            alert("User updated successfully!");
          }}
          showToast={(msg) => alert(msg)}
        />
      )}
    </PageContainer>
  );
}
