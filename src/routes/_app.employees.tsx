import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, UserCheck, Building2, MoreHorizontal, Mail, Plus, X } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  StatTile,
  DataTable,
  StatusPill,
} from "@/components/lams/page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/employees")({
  head: () => ({ meta: [{ title: "Employees — LAMS" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { employee } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For the Add form
  const [isAdding, setIsAdding] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    shift_id: "",
    role: "employee",
  });

  const isHR = employee?.role === "hr" || employee?.role === "super_admin";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    const { data } = await supabase.from("employees").select("*, shifts(name)").order("created_at", { ascending: false });
    if (data) setEmployees(data);

    // Fetch dropdowns for the Add form
    const { data: deptData } = await supabase.from("departments").select("name").order("name");
    const { data: desigData } = await supabase.from("designations").select("title").order("title");
    const { data: shiftData } = await supabase.from("shifts").select("id, name").order("name");

    if (deptData) setDepartments(deptData);
    if (desigData) setDesignations(desigData);
    if (shiftData) setShifts(shiftData);

    setLoading(false);
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    
    // In a real production system, this would also involve inviting via Supabase Auth.
    // For now, we create the employee profile record directly.
    const { error } = await supabase.from("employees").insert([{
      name: newEmp.name,
      email: newEmp.email,
      department: newEmp.department,
      designation: newEmp.designation,
      shift_id: newEmp.shift_id || null,
      role: newEmp.role,
      status: "Active"
    }]);

    if (!error) {
      setIsAdding(false);
      setNewEmp({ name: "", email: "", department: "", designation: "", shift_id: "", role: "employee" });
      fetchData();
    } else {
      alert("Error adding employee: " + error.message);
    }
  }

  // Calculate live stats
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const uniqueDepts = new Set(employees.map(e => e.department).filter(Boolean)).size;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newThisMonth = employees.filter(e => {
    const d = new Date(e.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <PageContainer>
      <PageHeader
        title="Employees"
        subtitle="Manage your organization's workforce directory"
        breadcrumbs={[{ label: "Employee Management" }, { label: "Employees" }]}
        actions={
          isHR ? (
            <Button onClick={() => setIsAdding(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Total Employees"
          value={employees.length.toString()}
          hint="Total workforce"
          icon={Users}
          tone="primary"
        />
        <StatTile
          label="Active"
          value={activeCount.toString()}
          hint="Currently active"
          icon={UserCheck}
          tone="success"
        />
        <StatTile
          label="New This Month"
          value={newThisMonth.toString()}
          hint="Recently onboarded"
          icon={UserPlus}
          tone="teal"
        />
        <StatTile
          label="Departments"
          value={uniqueDepts.toString()}
          hint="Unique divisions"
          icon={Building2}
          tone="warning"
        />
      </div>

      {isAdding && (
        <div className="mb-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm relative">
          <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-gray-900">Add New Employee</h3>
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
              <input 
                type="text" required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input 
                type="email" required value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
              <select required value={newEmp.department} onChange={e => setNewEmp({...newEmp, department: e.target.value})} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full bg-white">
                <option value="" disabled>Select Dept</option>
                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Designation</label>
              <select required value={newEmp.designation} onChange={e => setNewEmp({...newEmp, designation: e.target.value})} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full bg-white">
                <option value="" disabled>Select Designation</option>
                {designations.map(d => <option key={d.title} value={d.title}>{d.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">System Role</label>
              <select required value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full bg-white">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Shift Schedule</label>
              <select value={newEmp.shift_id} onChange={e => setNewEmp({...newEmp, shift_id: e.target.value})} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full bg-white">
                <option value="">No Shift (Default)</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg h-[38px]">
                Create Employee Profile
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No employees found.</div>
        ) : (
          <DataTable
            columns={["Employee", "Department", "Designation", "Shift", "Status", ""]}
            rows={employees.map((e) => [
              <div key="n" className="flex items-center gap-3 py-1">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                    {e.name.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-gray-900">{e.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 font-medium mt-0.5">
                    <Mail className="h-3 w-3" /> {e.email}
                  </div>
                </div>
              </div>,
              <span key="d" className="text-sm font-medium text-gray-700">
                {e.department || "—"}
              </span>,
              <span key="r" className="text-sm text-gray-600">
                {e.designation || "—"}
              </span>,
              <span key="sh" className="text-sm text-gray-500">
                {e.shifts?.name || "Default"}
              </span>,
              <StatusPill key="s" status={e.status as any} />,
              <Button key="a" variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>,
            ])}
          />
        )}
      </div>
    </PageContainer>
  );
}
