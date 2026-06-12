import { createFileRoute } from "@tanstack/react-router";
import { Shield, Users, Lock, MoreHorizontal, CheckCircle2, Plus, X } from "lucide-react";
import { PageContainer, PageHeader, StatTile } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/roles")({
  head: () => ({ meta: [{ title: "Roles — LAMS" }] }),
  component: RolesPage,
});

function RolesPage() {
  const { employee } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  const isHR = employee?.role === "hr" || employee?.role === "super_admin";

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    
    // Fetch roles
    const { data: roleData } = await supabase.from("roles").select("*").order("name");
    
    // Fetch employee counts per role
    const { data: empData } = await supabase.from("employees").select("role");
    
    const empCountMap: Record<string, number> = {};
    (empData || []).forEach(e => {
      const r = e.role || "employee";
      empCountMap[r] = (empCountMap[r] || 0) + 1;
    });

    const enriched = (roleData || []).map(r => ({
      ...r,
      users: empCountMap[r.name] || 0,
      perms: r.description ? r.description.split(",").map((s: string) => s.trim()) : ["Standard access"]
    }));

    setRoles(enriched);
    setLoading(false);
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRole.name) return;

    // Convert to lowercase and underscore for system naming consistency
    const systemName = newRole.name.toLowerCase().replace(/ /g, '_');

    const { error } = await supabase.from("roles").insert([{
      name: systemName,
      description: newRole.description
    }]);

    if (!error) {
      setIsAdding(false);
      setNewRole({ name: "", description: "" });
      fetchRoles();
    } else {
      alert("Error adding role: " + error.message);
    }
  }

  const totalAssigned = roles.reduce((acc, r) => acc + r.users, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        subtitle="Permission-based access control across LAMS"
        breadcrumbs={[{ label: "Employee Management" }, { label: "Roles" }]}
        actions={
          isHR ? (
            <Button onClick={() => setIsAdding(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" /> Add Role
            </Button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile label="Total Roles" value={roles.length.toString()} icon={Shield} tone="primary" />
        <StatTile label="Assigned Users" value={totalAssigned.toLocaleString()} icon={Users} tone="success" />
        <StatTile label="Permission Groups" value="12" icon={Lock} tone="teal" />
        <StatTile label="RBAC Coverage" value="100%" icon={CheckCircle2} tone="success" />
      </div>

      {isAdding && (
        <div className="mb-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm relative">
          <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-gray-900">Add New System Role</h3>
          <form onSubmit={handleAddRole} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role Name</label>
              <input 
                type="text" 
                required
                value={newRole.name}
                onChange={e => setNewRole({...newRole, name: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-64"
                placeholder="e.g. Auditor"
              />
            </div>
            <div className="flex-1 min-w-[300px]">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Permissions (comma separated)</label>
              <input 
                type="text" 
                required
                value={newRole.description}
                onChange={e => setNewRole({...newRole, description: e.target.value})}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full"
                placeholder="e.g. View reports, Export data"
              />
            </div>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg h-[38px]">
              Save Role
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">Loading roles...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <Card
              key={r.id}
              className="p-5 bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all rounded-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">
                  <Shield className="h-5 w-5" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="mt-4 font-bold text-gray-900 capitalize">{r.name.replace(/_/g, ' ')}</h3>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">
                {r.users.toLocaleString()} users assigned
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Permissions & Capabilities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.perms.map((p: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
