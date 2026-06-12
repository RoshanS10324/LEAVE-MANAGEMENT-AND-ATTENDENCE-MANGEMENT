import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Briefcase, Plus, X, MoreHorizontal } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  StatTile,
  DataTable,
  StatusPill,
} from "@/components/lams/page";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/designations")({
  head: () => ({ meta: [{ title: "Designations — LAMS" }] }),
  component: DesignationsPage,
});

function DesignationsPage() {
  const { employee } = useAuth();
  const [designations, setDesignations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newDesig, setNewDesig] = useState({ title: "", department_id: "", level: "" });

  const isHR = employee?.role === "hr" || employee?.role === "super_admin";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Fetch departments for the dropdown
    const { data: deptData } = await supabase.from("departments").select("id, name").order("name");
    if (deptData) setDepartments(deptData);

    // Fetch designations
    const { data: desigData } = await supabase.from("designations").select(`
      *,
      dept:departments(name)
    `).order("title");
    
    // Fetch employee counts per designation (matching by title for now)
    const { data: empData } = await supabase.from("employees").select("designation");
    const empCountMap: Record<string, number> = {};
    (empData || []).forEach(e => {
      const d = e.designation || "Unassigned";
      empCountMap[d] = (empCountMap[d] || 0) + 1;
    });

    const enriched = (desigData || []).map(d => ({
      ...d,
      headcount: empCountMap[d.title] || 0,
    }));

    setDesignations(enriched);
    setLoading(false);
  }

  async function handleAddDesignation(e: React.FormEvent) {
    e.preventDefault();
    if (!newDesig.title || !newDesig.department_id) return;

    const { error } = await supabase.from("designations").insert([{
      title: newDesig.title,
      department_id: newDesig.department_id,
      level: newDesig.level || "L1"
    }]);

    if (!error) {
      setIsAdding(false);
      setNewDesig({ title: "", department_id: "", level: "" });
      fetchData();
    } else {
      alert("Error adding designation: " + error.message);
    }
  }

  const totalHeadcount = designations.reduce((acc, d) => acc + d.headcount, 0);
  const largestGroup = [...designations].sort((a, b) => b.headcount - a.headcount)[0];
  const uniqueLevels = new Set(designations.map(d => d.level)).size;

  return (
    <PageContainer>
      <PageHeader
        title="Designations"
        subtitle="Job titles, grades, and headcount distribution"
        breadcrumbs={[{ label: "Employee Management" }, { label: "Designations" }]}
        actions={
          isHR ? (
            <Button onClick={() => setIsAdding(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" /> Add Designation
            </Button>
          ) : undefined
        }
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile label="Designations" value={designations.length.toString()} icon={Briefcase} tone="primary" />
        <StatTile label="Levels / Grades" value={uniqueLevels.toString()} icon={BadgeCheck} tone="teal" />
        <StatTile
          label="Largest Group"
          value={largestGroup?.title || "N/A"}
          hint={`${largestGroup?.headcount || 0} employees`}
          tone="warning"
        />
        <StatTile label="Total Mapped" value={totalHeadcount.toString()} hint="Employees with titles" tone="success" />
      </div>

      {isAdding && (
        <div className="mb-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm relative">
          <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-gray-900">Add New Designation</h3>
          <form onSubmit={handleAddDesignation} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Title</label>
              <input 
                type="text" 
                required
                value={newDesig.title}
                onChange={e => setNewDesig({...newDesig, title: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-64"
                placeholder="e.g. Senior Engineer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
              <select 
                required
                value={newDesig.department_id}
                onChange={e => setNewDesig({...newDesig, department_id: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48 bg-white"
              >
                <option value="" disabled>Select Dept</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Level / Grade</label>
              <input 
                type="text" 
                required
                value={newDesig.level}
                onChange={e => setNewDesig({...newDesig, level: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32"
                placeholder="e.g. L5"
              />
            </div>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg h-[38px]">
              Save
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">Loading designations...</div>
      ) : designations.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No designations found. Add one to get started.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            columns={["Level", "Title", "Department", "Headcount", "Status", ""]}
            rows={designations.map((d) => [
              <span key="g" className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold">
                {d.level}
              </span>,
              <span key="t" className="font-semibold text-gray-900">
                {d.title}
              </span>,
              <span key="d" className="text-gray-500">
                {d.dept?.name || "—"}
              </span>,
              <span key="h" className="font-semibold text-gray-700">
                {d.headcount.toLocaleString()}
              </span>,
              <StatusPill key="s" status="Active" />,
              <Button key="a" variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>,
            ])}
          />
        </div>
      )}
    </PageContainer>
  );
}
