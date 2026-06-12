import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Plus,
  X,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "../../actions/email";

// Admin service role client to manage auth without logging the current HR user out
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8";
const adminClient = createClient("https://gjhcqsfgztccmedonsyx.supabase.co", serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  designation: string | null;
  status: string;
  is_active: boolean | null;
  manager_id?: string | null;
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "#fdf4ff", text: "#7e22ce" },
  hr: { bg: "#f0fdf4", text: "#166534" },
  manager: { bg: "#eff6ff", text: "#1e40af" },
  employee: { bg: "#f8fafc", text: "#475569" },
};

export default function UserManagement() {
  const { isSuperAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("*, manager:employees!manager_id(name)")
      .order("name");
    if (data) setEmployees(data);
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function changeRole(empId: string, newRole: string) {
    if (newRole === "super_admin") {
      const ok = window.confirm(
        "Are you sure? Super Admin has full system access.",
      );
      if (!ok) return;
    }
    await supabase.from("employees").update({ role: newRole }).eq("id", empId);
    await fetchEmployees();
    showToast("Role updated");
  }

  async function toggleActive(empId: string, current: boolean | null) {
    await supabase.from("employees").update({ is_active: !current }).eq("id", empId);
    await fetchEmployees();
    showToast(`User ${current ? "deactivated" : "activated"}`);
  }

  async function resetFaceId(empId: string, name: string) {
    const ok = window.confirm(`Reset Face ID for ${name}? They will be required to register their face again.`);
    if (!ok) return;
    
    const { error } = await supabase
      .from("face_descriptors")
      .delete()
      .eq("emp_id", empId);
      
    if (error) {
      showToast("Failed to reset Face ID", "error");
    } else {
      showToast(`Face ID reset for ${name}`);
    }
  }

  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || e.role === roleFilter;
    const matchStatus =
      !statusFilter ||
      (statusFilter === "active" && e.is_active !== false) ||
      (statusFilter === "inactive" && e.is_active === false);
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, edit, and manage all system users</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-surface border-border/60 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-surface-muted"
          />
        </div>
        <select
          className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="hr">HR</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select
          className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Card>

      {/* Table */}
      <Card className="bg-surface border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted border-b border-border">
                {["Name", "Email", "Role", "Manager", "Department", "Status", "Actions"].map(
                  (c) => (
                    <th
                      key={c}
                      className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {c}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const badge = ROLE_BADGE[e.role] || ROLE_BADGE.employee;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-0 hover:bg-surface-muted/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">{e.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{(e as any).manager?.name || "—"}</td>
                    <td className="px-4 py-3">{e.department || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          e.is_active !== false ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            e.is_active !== false ? "bg-emerald-500" : "bg-red-400"
                          }`}
                        />
                        {e.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => setEditEmployee(e)}
                        >
                          Edit
                        </button>
                        <select
                          className="text-xs border border-border rounded px-1.5 py-1"
                          value={e.role}
                          onChange={(v) => changeRole(e.id, v.target.value)}
                        >
                          <option value="employee">employee</option>
                          <option value="manager">manager</option>
                          <option value="hr">hr</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                        <button
                          className={`text-xs hover:underline ${
                            e.is_active !== false ? "text-red-500" : "text-emerald-600"
                          }`}
                          onClick={() => toggleActive(e.id, e.is_active)}
                        >
                          {e.is_active !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="text-xs text-amber-600 hover:underline"
                          onClick={() => resetFaceId(e.id, e.name)}
                          title="Delete Face ID to allow re-registration"
                        >
                          Reset Face ID
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {showCreateModal && (
        <UserFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchEmployees();
            showToast("User created successfully");
          }}
          showToast={showToast}
        />
      )}

      {/* Edit User Modal */}
      {editEmployee && (
        <UserFormModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={() => {
            setEditEmployee(null);
            fetchEmployees();
            showToast("User updated successfully");
          }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export function UserFormModal({
  employee,
  onClose,
  onSaved,
  showToast,
}: {
  employee?: Employee | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type?: string) => void;
}) {
  const [form, setForm] = useState({
    name: employee?.name || "",
    email: employee?.email || "",
    password: "",
    role: employee?.role || "employee",
    department: employee?.department || "",
    designation: employee?.designation || "",
    manager_id: employee?.manager_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    async function fetchManagers() {
      const { data } = await supabase.from("employees").select("id, name").in("role", ["manager", "super_admin", "hr"]).order("name");
      if (data) setManagers(data);
    }
    fetchManagers();
  }, []);

  async function handleSubmit() {
    setSaving(true);
    try {
      if (employee) {
        await supabase
          .from("employees")
          .update({
            name: form.name,
            email: form.email,
            role: form.role,
            department: form.department || null,
            designation: form.designation || null,
            manager_id: form.manager_id || null,
          })
          .eq("id", employee.id);
        onSaved();
      } else {
        if (!form.password) {
          showToast("Password is required", "error");
          setSaving(false);
          return;
        }
        // Custom Codebase Auth: Bypassing Supabase Auth
        const customAuthId = crypto.randomUUID(); // Pseudo-ID for database linking

        // We do not pass auth_id here, as that triggers a foreign key violation since we bypassed Supabase Auth!
        const { data: newEmployee, error: empError } = await adminClient.from("employees").insert({
          name: form.name,
          email: form.email,
          password: form.password, // Custom plain-text password auth
          role: form.role,
          department: form.department || null,
          designation: form.designation || null,
          manager_id: form.manager_id || null,
        }).select("id").single();
        if (empError) throw new Error("Failed to insert employee record: " + empError.message);

        // 2. Initialize leave balances
        const { data: leaveTypes } = await adminClient.from("leave_types").select("id");
        if (leaveTypes && newEmployee) {
          const balances = leaveTypes.map((lt) => ({
            emp_id: newEmployee.id,
            leave_type_id: lt.id,
            total: 0,
            used: 0,
          }));
          await adminClient.from("leave_balances").insert(balances);
        }

        // Trigger the secure backend email sender
        try {
          await sendWelcomeEmail({ data: { email: form.email, name: form.name, tempPass: form.password } });
        } catch (emailErr: any) {
          console.error("Email failed:", emailErr);
          showToast("User created, but email failed to send.", "warning");
        }

        onSaved();
      }
    } catch (err: any) {
      showToast(err.message || "Error saving user", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{employee ? "Edit User" : "Create User"}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {!employee && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Temporary Password</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reporting Manager</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
              value={form.manager_id}
              onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
            >
              <option value="">None</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Designation</label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? "Saving..." : employee ? "Update User" : "Create User"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
