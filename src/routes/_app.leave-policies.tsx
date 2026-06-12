import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { PageContainer, PageHeader } from "@/components/lams/page";
import {
  FileText,
  Settings2,
  CalendarCheck,
  Plane,
  Save,
  Pencil,
  X,
  Check,
  Briefcase,
  Plus,
  Trash2,
  CalendarDays,
  Calendar as CalendarIcon,
  Ban,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_app/leave-policies")({
  head: () => ({ meta: [{ title: "Leave Policies — LAMS" }] }),
  component: LeavePoliciesPage,
});

function LeavePoliciesPage() {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<"types" | "docs" | "holidays" | "blackout">("types");

  return (
    <PageContainer>
      <PageHeader
        title="Leave Policies"
        subtitle="Manage leave types, holiday calendar, and global policies"
        breadcrumbs={[{ label: "Leave Management" }, { label: "Leave Policies" }]}
      />
      
      <div className="flex gap-2 border-b border-gray-200 pb-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === "types" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Leave Types & Quotas
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === "docs" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Policy Documents
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === "holidays" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Holiday Calendar
        </button>
        {employee?.role !== "employee" && (
          <button
            onClick={() => setActiveTab("blackout")}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === "blackout" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Blackout Dates
          </button>
        )}
      </div>

      {activeTab === "types" && <LeaveTypesTab />}
      {activeTab === "docs" && <PolicyDocumentsTab />}
      {activeTab === "holidays" && <HolidayCalendarTab />}
      {activeTab === "blackout" && <BlackoutDatesTab />}

    </PageContainer>
  );
}

function BlackoutDatesTab() {
  const { employee: currentEmployee } = useAuth();
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [form, setForm] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    department: "ALL",
    auto_reject: true,
  });

  useEffect(() => {
    fetchBlackouts();
  }, []);

  async function fetchBlackouts() {
    const { data } = await supabase.from("leave_blackout_dates").select("*").order("from_date", { ascending: true });
    if (data) setBlackouts(data);
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAdd() {
    if (!form.from_date || !form.to_date || !form.reason) return;
    if (new Date(form.to_date) < new Date(form.from_date)) {
      showToast("To date cannot be before From date", "error");
      return;
    }

    const { error } = await supabase.from("leave_blackout_dates").insert({
      ...form,
      created_by: currentEmployee?.id,
    });
    
    if (error) { showToast(error.message, "error"); return; }
    showToast("Blackout period added");
    setForm({ from_date: "", to_date: "", reason: "", department: "ALL", auto_reject: true });
    fetchBlackouts();
  }

  async function handleRemove(b: any) {
    if (!window.confirm(`Remove blackout date for "${b.reason}"?`)) return;
    await supabase.from("leave_blackout_dates").delete().eq("id", b.id);
    showToast("Blackout period removed");
    fetchBlackouts();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <Ban className="h-4 w-4 text-red-500" /> Blackout Dates
        </h3>

        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 mb-8">
          <Info className="h-5 w-5 text-red-600 shrink-0" />
          <div className="text-sm text-red-800">
            Blackout dates are restricted periods when leave applications can be automatically rejected or blocked.
            Use this for month-end processing, audit periods, or peak operational seasons.
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h4 className="text-sm font-bold text-gray-900">Add Blackout Period</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date *</label>
                <input
                  type="date"
                  value={form.from_date}
                  onChange={e => setForm({...form, from_date: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date *</label>
                <input
                  type="date"
                  value={form.to_date}
                  onChange={e => setForm({...form, to_date: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Financial Audit"
                  value={form.reason}
                  onChange={e => setForm({...form, reason: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
                <select
                  value={form.department}
                  onChange={e => setForm({...form, department: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Finance">Finance</option>
                  <option value="HR">HR</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={form.auto_reject}
                  onChange={e => setForm({...form, auto_reject: e.target.checked})}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                  id="autoReject"
                />
                <label htmlFor="autoReject" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Auto-reject new applications
                </label>
              </div>
              <button
                onClick={handleAdd}
                disabled={!form.from_date || !form.to_date || !form.reason}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg mt-2 flex justify-center items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Period
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-gray-900 mb-4">Active Blackout Periods</h4>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Date Range</th>
                    <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Reason</th>
                    <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Dept</th>
                    <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Auto Reject</th>
                    <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blackouts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">No blackout dates configured</td>
                    </tr>
                  ) : (
                    blackouts.map(b => {
                      const d1 = new Date(b.from_date);
                      const d2 = new Date(b.to_date);
                      const diffTime = Math.abs(d2.getTime() - d1.getTime());
                      const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      
                      return (
                        <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-900">{b.from_date} <span className="text-gray-400 font-normal">to</span> {b.to_date}</div>
                            <div className="text-[10px] text-gray-500">{duration} days</div>
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-700">{b.reason}</td>
                          <td className="px-3 py-3 text-gray-500">{b.department}</td>
                          <td className="px-3 py-3">
                            {b.auto_reject ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Yes</span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <button onClick={() => handleRemove(b)} className="text-gray-400 hover:text-red-500 p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function HolidayCalendarTab() {
  const { employee: currentEmployee } = useAuth();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // Add form
  const [form, setForm] = useState({ date: "", name: "", type: "Festival", department: "All" });

  const isHR = currentEmployee?.role === "hr" || currentEmployee?.role === "super_admin";

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  async function fetchHolidays() {
    const { data } = await supabase.from("holidays").select("*").gte("date", `${year}-01-01`).lte("date", `${year}-12-31`).order("date", { ascending: true });
    if (data) setHolidays(data);
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAdd() {
    if (!form.date || !form.name) return;
    const { error } = await supabase.from("holidays").insert({
      date: form.date,
      name: form.name,
      type: form.type,
    });
    if (error) { showToast(error.message, "error"); return; }
    showToast("Holiday added");
    setForm({ date: "", name: "", type: "Festival", department: "All" });
    fetchHolidays();
  }

  async function handleRemove(h: any) {
    if (!window.confirm(`Remove ${h.name} from holiday calendar?`)) return;
    await supabase.from("holidays").delete().eq("id", h.id);
    showToast("Holiday removed");
    fetchHolidays();
  }

  const stats = {
    total: holidays.length,
    national: holidays.filter(h => h.type === "National").length,
    festival: holidays.filter(h => h.type === "Festival").length,
    optional: holidays.filter(h => h.type === "Optional").length,
  };

  // Calendar visual generator
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-500" /> Holiday Calendar
          </h3>
          <p className="text-sm text-gray-500 mt-1">Company-wide public and optional holidays</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold"
        >
          {[year - 1, year, year + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Holidays", val: stats.total, color: "text-blue-600 bg-blue-50" },
          { label: "National", val: stats.national, color: "text-rose-600 bg-rose-50" },
          { label: "Festival", val: stats.festival, color: "text-emerald-600 bg-emerald-50" },
          { label: "Optional", val: stats.optional, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold ${s.color}`}>
              {s.val}
            </div>
            <div className="text-sm font-medium text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {isHR && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Add Holiday</h4>
              <div className="space-y-3">
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Holiday Name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
                <select
                  value={form.type}
                  onChange={e => setForm({...form, type: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="National">National</option>
                  <option value="Festival">Festival</option>
                  <option value="Optional">Optional</option>
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!form.date || !form.name}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg mt-2 flex justify-center items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Holiday
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-sm text-gray-700">
              List View
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {holidays.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No holidays found for {year}</div>
              ) : (
                <div className="space-y-1">
                  {holidays.map(h => {
                    const d = new Date(h.date);
                    const isPassed = d < new Date();
                    return (
                      <div key={h.id} className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 ${isPassed ? 'opacity-50' : ''}`}>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{h.name}</div>
                          <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                            <span>{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span>{d.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            h.type === 'National' ? 'bg-rose-50 text-rose-600' :
                            h.type === 'Festival' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {h.type}
                          </span>
                          {isHR && (
                            <button onClick={() => handleRemove(h)} className="text-gray-300 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 text-gray-900 font-semibold">
            <CalendarIcon className="h-4 w-4 text-indigo-500" /> Calendar View ({year})
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {months.map(m => {
              const monthName = m.toLocaleString('default', { month: 'long' });
              const daysInMonth = new Date(year, m.getMonth() + 1, 0).getDate();
              const firstDayOfWeek = new Date(year, m.getMonth(), 1).getDay(); // 0 is Sunday
              
              const blanks = Array.from({ length: firstDayOfWeek });
              const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

              return (
                <div key={monthName} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-indigo-50 text-indigo-700 text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                    {monthName}
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {['S','M','T','W','T','F','S'].map((day, i) => (
                        <div key={i} className="text-[9px] font-bold text-gray-400">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {blanks.map((_, i) => <div key={`blank-${i}`} className="h-6"></div>)}
                      {days.map(day => {
                        const dateStr = `${year}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hol = holidays.find(h => h.date === dateStr);
                        
                        return (
                          <div 
                            key={day} 
                            title={hol ? hol.name : undefined}
                            className={`h-6 flex items-center justify-center text-[10px] rounded-md cursor-default ${
                              hol ? 'bg-amber-300 text-amber-900 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function PolicyDocumentsTab() {
  const { employee: currentEmployee } = useAuth();
  const [policies, setPolicies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    applies_to: "all",
    effective_from: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  const isHR = currentEmployee?.role === "hr" || currentEmployee?.role === "super_admin";

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    let q = supabase.from("leave_policies").select("*").order("created_at", { ascending: false });
    if (!isHR) {
      q = q.eq("is_active", true);
    }
    const { data } = await q;
    if (data) setPolicies(data);
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function openModal(p?: any) {
    if (p) {
      setEditingPolicy(p.id);
      setForm({
        title: p.title,
        description: p.description || "",
        applies_to: p.applies_to || "all",
        effective_from: p.effective_from || new Date().toISOString().split("T")[0],
        is_active: p.is_active,
      });
    } else {
      setEditingPolicy(null);
      setForm({
        title: "",
        description: "",
        applies_to: "all",
        effective_from: new Date().toISOString().split("T")[0],
        is_active: true,
      });
    }
    setShowModal(true);
  }

  async function savePolicy() {
    if (!form.title) return;

    if (editingPolicy) {
      const { error } = await supabase.from("leave_policies").update({
        ...form,
        updated_at: new Date().toISOString(),
      }).eq("id", editingPolicy);
      if (error) { showToast(error.message, "error"); return; }
      showToast("Policy updated");
    } else {
      const { error } = await supabase.from("leave_policies").insert({
        ...form,
        created_by: currentEmployee?.id,
      });
      if (error) { showToast(error.message, "error"); return; }
      showToast("Policy added");
    }
    setShowModal(false);
    fetchPolicies();
  }

  async function toggleActive(p: any) {
    await supabase.from("leave_policies").update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq("id", p.id);
    fetchPolicies();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" /> Policy Documents
          </h3>
          <p className="text-sm text-gray-500 mt-1">Official guidelines and leave documentation</p>
        </div>
        {isHR && (
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Policy
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {policies.map((p) => {
          const appliesToYou = !isHR && (p.applies_to === "all" || p.applies_to === currentEmployee?.role);
          
          return (
            <div key={p.id} className={`bg-white rounded-2xl border ${p.is_active ? 'border-gray-100' : 'border-gray-200 opacity-70'} p-6 shadow-sm`}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-900 text-lg">{p.title}</h4>
                {isHR && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => openModal(p)} className="h-6 w-6 text-gray-400 hover:bg-gray-50 rounded flex items-center justify-center">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{p.description}</p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md font-medium border border-gray-200">
                  Applies to: <span className="capitalize">{p.applies_to}</span>
                </span>
                <span className="text-xs text-gray-400">
                  Effective: {p.effective_from}
                </span>
                {appliesToYou && (
                  <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-full ml-auto">
                    Applies to you
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">{editingPolicy ? "Edit Policy" : "Add Policy Document"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Annual Leave Policy"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter policy details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Applies To</label>
                  <select
                    value={form.applies_to}
                    onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="all">All Staff</option>
                    <option value="employee">Employees only</option>
                    <option value="manager">Managers only</option>
                    <option value="hr">HR only</option>
                    <option value="contract">Contractors</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    value={form.effective_from}
                    onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  id="active-toggle"
                />
                <label htmlFor="active-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Policy is active immediately
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={savePolicy}
                disabled={!form.title}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function LeaveTypesTab() {
  const { employee: currentEmployee } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  
  // Settings
  const [settings, setSettings] = useState<any>({});
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const isHR = currentEmployee?.role === "hr" || currentEmployee?.role === "super_admin";

  useEffect(() => {
    fetchData();
  }, [currentEmployee]);

  async function fetchData() {
    const { data: types } = await supabase.from("leave_types").select("*").order("name");
    if (types) setLeaveTypes(types);

    if (currentEmployee) {
      if (isHR) {
        // HR sees average utilization across all employees
        const { data: bals } = await supabase.from("leave_balances").select("*");
        setBalances(bals || []);
        
        // Fetch global settings
        const { data: sets } = await supabase.from("settings").select("*");
        const sObj: any = {};
        sets?.forEach(s => { sObj[s.key] = s.value; });
        setSettings({
          auto_approve_days: sObj.auto_approve_days || "3",
          min_notice_days: sObj.min_notice_days || "7"
        });
      } else {
        // Employee sees own utilization
        const { data: bals } = await supabase.from("leave_balances").select("*").eq("emp_id", currentEmployee.id);
        setBalances(bals || []);
      }
    }
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function startEdit(lt: any) {
    setEditingId(lt.id);
    setEditValues({
      max_days: lt.max_days,
      carry_forward: lt.carry_forward,
      is_paid: lt.is_paid,
    });
  }

  async function saveEdit(id: string, name: string) {
    const { error } = await supabase.from("leave_types").update({
      max_days: editValues.max_days,
      carry_forward: editValues.carry_forward,
      is_paid: editValues.is_paid,
    }).eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    await supabase.from("audit_log").insert({
      action: "LEAVE_TYPE_UPDATED",
      user_id: currentEmployee?.id,
      details: `Updated leave type ${name}`
    });

    showToast(`${name} policy updated`);
    setEditingId(null);
    fetchData();
  }

  async function saveSettings() {
    await supabase.from("settings").upsert({ key: "auto_approve_days", value: settings.auto_approve_days });
    await supabase.from("settings").upsert({ key: "min_notice_days", value: settings.min_notice_days });
    showToast("Global settings saved");
  }

  // Helper for computing stats
  function getStats(ltId: string) {
    const relBalances = balances.filter(b => b.leave_type_id === ltId);
    if (relBalances.length === 0) return null;

    if (isHR) {
      // average utilization
      let totalPrc = 0;
      let validCount = 0;
      relBalances.forEach(b => {
        if (b.total > 0) {
          totalPrc += (b.used / b.total) * 100;
          validCount++;
        }
      });
      const avg = validCount ? Math.round(totalPrc / validCount) : 0;
      return { type: "hr", avg };
    } else {
      // personal utilization
      const b = relBalances[0];
      const prc = b.total > 0 ? (b.used / b.total) * 100 : 0;
      return { type: "emp", used: b.used, total: b.total, prc };
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaveTypes.map((lt) => {
          const isEditing = editingId === lt.id;
          const stats = getStats(lt.id);

          return (
            <div key={lt.id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{lt.name}</h3>
                    {isEditing ? (
                      <select 
                        value={editValues.is_paid ? "true" : "false"}
                        onChange={(e) => setEditValues({...editValues, is_paid: e.target.value === "true"})}
                        className="text-xs border rounded px-1 py-0.5 mt-1"
                      >
                        <option value="true">Paid</option>
                        <option value="false">Unpaid</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lt.is_paid ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                        {lt.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    )}
                  </div>
                </div>
                {isHR && (
                  isEditing ? (
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(lt.id, lt.name)} className="h-7 w-7 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center hover:bg-emerald-100"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditingId(null)} className="h-7 w-7 bg-red-50 text-red-500 rounded flex items-center justify-center hover:bg-red-100"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(lt)} className="h-8 w-8 text-gray-400 hover:bg-gray-50 rounded-lg flex items-center justify-center">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>

              <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Max days / year</span>
                  {isEditing ? (
                    <input type="number" value={editValues.max_days} onChange={(e) => setEditValues({...editValues, max_days: Number(e.target.value)})} className="w-16 border rounded px-2 py-1 text-right" />
                  ) : (
                    <span className="font-semibold text-gray-900">{lt.max_days} days</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Carry forward</span>
                  {isEditing ? (
                    <input type="number" value={editValues.carry_forward} onChange={(e) => setEditValues({...editValues, carry_forward: Number(e.target.value)})} className="w-16 border rounded px-2 py-1 text-right" />
                  ) : (
                    <span className="font-semibold text-gray-900">{lt.carry_forward > 0 ? `${lt.carry_forward} days` : "None"}</span>
                  )}
                </div>
              </div>

              {stats && (
                <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {stats.type === "hr" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Avg Utilization</span>
                      <span className="text-sm font-bold text-indigo-600">{stats.avg}%</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                        <span className="text-gray-500">Your Usage</span>
                        <span className="text-gray-900">{stats.used} / {stats.total} days</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, stats.prc)}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isHR && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 mt-8 max-w-3xl">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
            <Settings2 className="h-4 w-4 text-indigo-500" /> Auto-Approval Settings
          </h3>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600 w-64">Auto-approve after (no manager response)</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={settings.auto_approve_days} 
                  onChange={(e) => setSettings({...settings, auto_approve_days: e.target.value})}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600 w-64">Minimum notice period</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={settings.min_notice_days} 
                  onChange={(e) => setSettings({...settings, min_notice_days: e.target.value})}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
                <span className="text-sm text-gray-500">days before leave start</span>
              </div>
            </div>
            <div className="pt-2">
              <button 
                onClick={saveSettings}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
