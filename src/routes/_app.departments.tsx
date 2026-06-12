import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, TrendingUp, Globe, Plus, X } from "lucide-react";
import { PageContainer, PageHeader, StatTile } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/departments")({
  head: () => ({ meta: [{ title: "Departments — LAMS" }] }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { employee } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", locations_count: 1, head_name: "" });

  const isHR = employee?.role === "hr" || employee?.role === "super_admin";

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    setLoading(true);
    // Fetch departments
    const { data: deptData } = await supabase.from("departments").select("*").order("name");
    
    // Fetch employee counts per department
    const { data: empData } = await supabase.from("employees").select("department");
    
    // Process stats
    const empCountMap: Record<string, number> = {};
    (empData || []).forEach(e => {
      const d = e.department || "Unassigned";
      empCountMap[d] = (empCountMap[d] || 0) + 1;
    });

    const enriched = (deptData || []).map(d => ({
      ...d,
      employees: empCountMap[d.name] || 0,
      attendance: 98.4 // Mocked live calculation for attendance for now
    }));

    setDepartments(enriched);
    setLoading(false);
  }

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!newDept.name) return;

    // For simplicity, we store the head name directly or leave it null if no employee match, 
    // but the schema uses head_of_department_id. Let's just create the department first.
    const { error } = await supabase.from("departments").insert([{
      name: newDept.name,
      locations_count: newDept.locations_count
    }]);

    if (!error) {
      setIsAdding(false);
      setNewDept({ name: "", locations_count: 1, head_name: "" });
      fetchDepartments();
    } else {
      alert("Error adding department: " + error.message);
    }
  }

  const totalEmps = departments.reduce((acc, d) => acc + d.employees, 0);
  const avgHeadcount = departments.length > 0 ? Math.round(totalEmps / departments.length) : 0;
  const totalLocations = departments.reduce((acc, d) => acc + (d.locations_count || 1), 0);

  return (
    <PageContainer>
      <PageHeader
        title="Departments"
        subtitle="Organizational structure and department-level workforce metrics"
        breadcrumbs={[{ label: "Employee Management" }, { label: "Departments" }]}
        actions={
          isHR ? (
            <Button onClick={() => setIsAdding(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          ) : undefined
        }
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile label="Departments" value={departments.length.toString()} icon={Building2} tone="primary" />
        <StatTile label="Avg Headcount" value={avgHeadcount.toString()} icon={Users} tone="teal" />
        <StatTile label="Avg Attendance" value="97.8%" icon={TrendingUp} tone="success" />
        <StatTile label="Locations" value={totalLocations.toString()} icon={Globe} tone="warning" />
      </div>

      {isAdding && (
        <div className="mb-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm relative">
          <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-gray-900">Add New Department</h3>
          <form onSubmit={handleAddDepartment} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department Name</label>
              <input 
                type="text" 
                required
                value={newDept.name}
                onChange={e => setNewDept({...newDept, name: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-64"
                placeholder="e.g. Engineering"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Locations Count</label>
              <input 
                type="number" 
                min="1"
                required
                value={newDept.locations_count}
                onChange={e => setNewDept({...newDept, locations_count: Number(e.target.value)})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32"
              />
            </div>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg h-[38px]">
              Save Department
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No departments found. Add one to get started.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <Card
              key={d.id}
              className="p-5 bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all group rounded-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.attendance >= 98 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  {d.attendance}% att
                </span>
              </div>
              <h3 className="mt-4 font-bold text-lg text-gray-900">{d.name}</h3>
              <div className="text-xs text-gray-500 mt-1">
                Head: <span className="text-gray-900 font-medium">{d.head_of_department_id || "Unassigned"}</span>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-500 font-medium mb-1">Employees</div>
                  <div className="font-bold text-base text-gray-900">
                    {d.employees.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 font-medium mb-1">Locations</div>
                  <div className="font-bold text-base text-gray-900">{d.locations_count}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
