import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  Clock,
  Plus,
  Save,
  X,
  Save,
  X,
  Pencil,
  Check,
  Power,
  Users,
  History,
  Filter,
  CalendarDays,
  Info,
} from "lucide-react";

export default function ShiftScheduling() {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<"master" | "assign" | "history" | "policy">("master");

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Scheduling</h1>
        <p className="text-sm text-gray-500 mt-1">Manage shifts, assign employees, configure policies</p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("master")}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "master" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Shift Master
        </button>
        <button
          onClick={() => setActiveTab("assign")}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "assign" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Assign Shifts
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "history" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Assignment History
        </button>
        <button
          onClick={() => setActiveTab("policy")}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === "policy" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Weekend Policy
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "master" && <ShiftMasterTab />}
      {activeTab === "assign" && <AssignShiftsTab />}
      {activeTab === "history" && <AssignmentHistoryTab />}
      {activeTab === "policy" && <WeekendPolicyTab />}
    </div>
  );
}

function WeekendPolicyTab() {
  const { employee: currentEmployee } = useAuth();
  const [policy, setPolicy] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  async function fetchPolicy() {
    const { data } = await supabase.from("weekend_policy").select("*").eq("department", "ALL").maybeSingle();
    if (data) {
      setPolicy(data);
    } else {
      setPolicy({ saturday: "working", alternate_saturday: null });
    }
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function savePolicy() {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("weekend_policy")
      .upsert({
        department: "ALL",
        saturday: policy.saturday,
        sunday: "off",
        alternate_saturday: policy.saturday === "alternate" ? policy.alternate_saturday : null,
      }, { onConflict: "department" });
      
    if (error) {
      showToast(error.message, "error");
      setIsSubmitting(false);
      return;
    }

    // Audit Log
    await supabase.from("audit_log").insert({
      action: "WEEKEND_POLICY_UPDATED",
      user_id: currentEmployee?.id,
      details: `Updated global weekend policy: Saturday = ${policy.saturday}`
    });

    showToast("Weekend policy saved successfully");
    setIsSubmitting(false);
    fetchPolicy();
  }

  // Format policy string for info box
  let satStr = policy?.saturday;
  if (satStr === "alternate") satStr = `Alternate (${policy?.alternate_saturday === "odd" ? "Odd" : "Even"} weeks off)`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <CalendarDays className="h-4 w-4 text-amber-500" /> Global Weekend Policy
      </h3>

      <div className="max-w-2xl space-y-8">
        {/* Info Box */}
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Current policy:</strong> Saturday is {satStr || "working"} and Sunday is always off. 
            This policy applies globally to all departments and affects attendance calculations, regularization, and leave eligibility.
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Saturday */}
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
            <span className="text-sm font-semibold text-gray-700 w-32 pt-1">Saturday</span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-6">
                {["working", "off", "alternate"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:text-gray-900">
                    <input
                      type="radio"
                      name="saturday"
                      checked={policy?.saturday === opt || (!policy?.saturday && opt === "working")}
                      onChange={() => setPolicy({ ...policy, saturday: opt })}
                      className="accent-blue-600 w-4 h-4"
                    />
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </label>
                ))}
              </div>
              
              {/* Alternate Sub-options */}
              {policy?.saturday === "alternate" && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100 flex gap-6">
                  {["odd", "even"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="alternate_saturday"
                        checked={policy?.alternate_saturday === opt}
                        onChange={() => setPolicy({ ...policy, alternate_saturday: opt })}
                        className="accent-blue-600 w-4 h-4"
                      />
                      {opt === "odd" ? "Odd weeks off" : "Even weeks off"}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Sunday */}
          <div className="flex items-center gap-8">
            <span className="text-sm font-semibold text-gray-700 w-32">Sunday</span>
            <span className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-md">
              Off (Fixed)
            </span>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={savePolicy}
            disabled={isSubmitting || (policy?.saturday === "alternate" && !policy?.alternate_saturday)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Save className="h-4 w-4" /> Save Policy
          </button>
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

function AssignmentHistoryTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Filters
  const [empFilter, setEmpFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchHistory();
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const { data } = await supabase.from("employees").select("id, name").order("name");
    if (data) setEmployees(data);
  }

  async function fetchHistory() {
    let q = supabase
      .from("shift_assignments")
      .select(`
        *,
        emp:employees!emp_id(name, department),
        shift:shifts!shift_id(name, start_time, end_time),
        assigned:employees!assigned_by(name)
      `)
      .order("created_at", { ascending: false });

    const { data } = await q;
    setHistory(data || []);
  }

  const filteredHistory = history.filter((h) => {
    if (empFilter !== "All" && h.emp_id !== empFilter) return false;
    if (dateFrom && new Date(h.effective_from) < new Date(dateFrom)) return false;
    if (dateTo && new Date(h.effective_from) > new Date(dateTo)) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-500" /> Assignment History
        </h3>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={empFilter}
            onChange={(e) => setEmpFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm max-w-[200px] truncate"
          >
            <option value="All">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white shadow-sm"
              title="Effective From (Start)"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white shadow-sm"
              title="Effective From (End)"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3 rounded-tl-lg">Date Assigned</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Employee</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Assigned Shift</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Effective From</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3 rounded-tr-lg">Assigned By</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500">No assignment history found.</td>
              </tr>
            ) : (
              filteredHistory.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3 text-gray-500 text-xs">
                    {new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-gray-900">{h.emp?.name}</div>
                    <div className="text-[11px] text-gray-500">{h.emp?.department}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {h.shift?.name}
                    </span>
                    <div className="text-[10px] text-gray-500 mt-1 font-mono">
                      {h.shift?.start_time?.slice(0, 5)} - {h.shift?.end_time?.slice(0, 5)}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {h.effective_from}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {h.assigned?.name || "System"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignShiftsTab() {
  const { employee: currentEmployee } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState("All");
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
  
  // Single assign state
  const [editingEmp, setEditingEmp] = useState<string | null>(null);
  const [singleShiftId, setSingleShiftId] = useState("");
  const [singleDate, setSingleDate] = useState("");

  // Bulk assign state
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkDate, setBulkDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [eRes, sRes] = await Promise.all([
      supabase.from("employees").select("*, shifts(name, start_time, end_time)").eq("employment_status", "active").order("name"),
      supabase.from("shifts").select("*").eq("is_active", true).order("name"),
    ]);
    if (eRes.data) setEmployees(eRes.data);
    if (sRes.data) setShifts(sRes.data);
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];
  const filteredEmps = deptFilter === "All" ? employees : employees.filter((e) => e.department === deptFilter);

  function toggleSelectAll() {
    if (selectedEmps.size === filteredEmps.length) setSelectedEmps(new Set());
    else setSelectedEmps(new Set(filteredEmps.map((e) => e.id)));
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedEmps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmps(next);
  }

  async function applySingleAssign(emp: any) {
    if (!singleShiftId || !singleDate) return;
    setIsSubmitting(true);
    const shift = shifts.find(s => s.id === singleShiftId);
    
    // Update employee
    await supabase.from("employees").update({ shift_id: singleShiftId }).eq("id", emp.id);
    
    // Insert assignment history
    await supabase.from("shift_assignments").insert({
      emp_id: emp.id,
      shift_id: singleShiftId,
      effective_from: singleDate,
      assigned_by: currentEmployee?.id,
    });

    // Notify
    await supabase.from("notifications").insert({
      user_id: emp.id,
      message: `Your shift has been changed to ${shift?.name} effective from ${singleDate}.`
    });

    // Audit Log
    await supabase.from("audit_log").insert({
      action: "SHIFT_ASSIGNED",
      user_id: currentEmployee?.id,
      details: `Assigned ${emp.name} to ${shift?.name}`
    });

    showToast(`${emp.name} assigned to ${shift?.name}`);
    setEditingEmp(null);
    setSingleShiftId("");
    setSingleDate("");
    setIsSubmitting(false);
    fetchData();
  }

  async function applyBulkAssign() {
    if (!bulkShiftId || !bulkDate || selectedEmps.size === 0) return;
    setIsSubmitting(true);
    const ids = Array.from(selectedEmps);
    const shift = shifts.find(s => s.id === bulkShiftId);

    // Update employees
    await supabase.from("employees").update({ shift_id: bulkShiftId }).in("id", ids);

    // Insert history
    const assignments = ids.map(id => ({
      emp_id: id,
      shift_id: bulkShiftId,
      effective_from: bulkDate,
      assigned_by: currentEmployee?.id,
    }));
    await supabase.from("shift_assignments").insert(assignments);

    // Notify
    const notifications = ids.map(id => ({
      user_id: id,
      message: `Your shift has been changed to ${shift?.name} effective from ${bulkDate}.`
    }));
    await supabase.from("notifications").insert(notifications);

    // Audit Log
    await supabase.from("audit_log").insert({
      action: "SHIFT_ASSIGNED",
      user_id: currentEmployee?.id,
      details: `Bulk assigned ${ids.length} employees to ${shift?.name}`
    });

    showToast(`${ids.length} employees assigned to ${shift?.name}`);
    setSelectedEmps(new Set());
    setBulkShiftId("");
    setBulkDate("");
    setIsSubmitting(false);
    fetchData();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" /> Assign Shifts to Employees
        </h3>
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setSelectedEmps(new Set()); setEditingEmp(null); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm"
        >
          <option value="All">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto pb-24">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-10 px-3 py-3 rounded-tl-lg">
                <input
                  type="checkbox"
                  checked={filteredEmps.length > 0 && selectedEmps.size === filteredEmps.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Employee</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Department</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Current Shift</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Shift Time</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">Change Shift</th>
              <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3 rounded-tr-lg">Effective From</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp) => {
              const isEditing = editingEmp === emp.id;
              return (
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEmps.has(emp.id)}
                      onChange={() => toggleSelect(emp.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {(emp.name || 'U').split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-semibold text-gray-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{emp.department || "—"}</td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {emp.shifts?.name || "Unassigned"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 font-mono text-xs">
                    {emp.shifts ? `${emp.shifts.start_time?.slice(0, 5)} - ${emp.shifts.end_time?.slice(0, 5)}` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={isEditing ? singleShiftId : ""}
                      onChange={(e) => {
                        setEditingEmp(emp.id);
                        setSingleShiftId(e.target.value);
                      }}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white shadow-sm max-w-[140px]"
                    >
                      <option value="">Select shift...</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 min-w-[150px]">
                    {isEditing && singleShiftId && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          value={singleDate} 
                          onChange={(e) => setSingleDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white w-32"
                        />
                        <button 
                          onClick={() => applySingleAssign(emp)}
                          disabled={!singleDate || isSubmitting}
                          className="h-8 w-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg flex items-center justify-center shrink-0"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* BULK ASSIGN BAR */}
      {selectedEmps.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 rounded-2xl shadow-xl px-6 py-4 flex items-center gap-6 z-10 text-white w-max">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedEmps.size}
            </div>
            <span className="text-sm font-medium">Selected</span>
          </div>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex items-center gap-3">
            <select
              value={bulkShiftId}
              onChange={(e) => setBulkShiftId(e.target.value)}
              className="text-sm border-0 rounded-lg px-3 py-2 bg-gray-800 text-white min-w-[160px] focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select shift...</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input 
              type="date" 
              value={bulkDate} 
              onChange={(e) => setBulkDate(e.target.value)}
              className="text-sm border-0 rounded-lg px-3 py-2 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 color-scheme-dark"
            />
            <button
              onClick={applyBulkAssign}
              disabled={!bulkShiftId || !bulkDate || isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-200 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Apply to All
            </button>
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

function ShiftMasterTab() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    start_time: "09:00",
    end_time: "18:00",
    late_threshold_mins: 10,
    early_leave_threshold_mins: 30,
    working_hours: 9,
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  async function fetchShifts() {
    const { data } = await supabase.from("shifts").select("*").order("name");
    if (data) setShifts(data);
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAddShift() {
    if (!addForm.name || !addForm.start_time || !addForm.end_time) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const { error } = await supabase.from("shifts").insert({
      name: addForm.name,
      start_time: addForm.start_time,
      end_time: addForm.end_time,
      late_threshold_mins: addForm.late_threshold_mins,
      early_leave_threshold_mins: addForm.early_leave_threshold_mins,
      working_hours: addForm.working_hours,
      is_active: true,
    });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(`Shift created successfully`);
    setShowAddForm(false);
    setAddForm({ name: "", start_time: "09:00", end_time: "18:00", late_threshold_mins: 10, early_leave_threshold_mins: 30, working_hours: 9 });
    fetchShifts();
  }

  function startEdit(shift: any) {
    setEditingShift(shift.id);
    setEditValues({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      late_threshold_mins: shift.late_threshold_mins ?? 10,
      early_leave_threshold_mins: shift.early_leave_threshold_mins ?? 30,
      working_hours: shift.working_hours ?? 9,
    });
  }

  async function saveEdit(shiftId: string) {
    const { error } = await supabase
      .from("shifts")
      .update(editValues)
      .eq("id", shiftId);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Shift updated successfully");
    setEditingShift(null);
    fetchShifts();
  }

  async function toggleActive(shift: any) {
    const { error } = await supabase
      .from("shifts")
      .update({ is_active: !shift.is_active })
      .eq("id", shift.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    fetchShifts();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" /> Shift Master
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Shift"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-5 p-4 bg-blue-50 rounded-xl border border-blue-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
              placeholder="e.g. Morning"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Start Time *</label>
            <input
              type="time"
              value={addForm.start_time}
              onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
              className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">End Time *</label>
            <input
              type="time"
              value={addForm.end_time}
              onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
              className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Late Thresh (mins)</label>
            <input
              type="number"
              value={addForm.late_threshold_mins}
              onChange={(e) => setAddForm({ ...addForm, late_threshold_mins: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Early Thresh (mins)</label>
            <input
              type="number"
              value={addForm.early_leave_threshold_mins}
              onChange={(e) => setAddForm({ ...addForm, early_leave_threshold_mins: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Working Hours (hrs)</label>
            <input
              type="number"
              step="0.5"
              value={addForm.working_hours}
              onChange={(e) => setAddForm({ ...addForm, working_hours: Number(e.target.value) })}
              className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <button
              onClick={handleAddShift}
              disabled={!addForm.name || !addForm.start_time || !addForm.end_time}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Name", "Start", "End", "Late Threshold", "Early Threshold", "Hours", "Active", "Actions"].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-3 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const isEditing = editingShift === s.id;
              return (
                <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!s.is_active ? "opacity-50" : ""}`}>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        value={editValues.name}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        className="w-28 h-8 px-2 rounded border border-gray-200 text-sm"
                      />
                    ) : (
                      <span className="font-semibold text-gray-900">{s.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input type="time" value={editValues.start_time} onChange={(e) => setEditValues({ ...editValues, start_time: e.target.value })} className="w-24 h-8 px-2 rounded border border-gray-200 text-sm" />
                    ) : (
                      <span className="font-mono text-gray-600">{s.start_time?.slice(0, 5)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input type="time" value={editValues.end_time} onChange={(e) => setEditValues({ ...editValues, end_time: e.target.value })} className="w-24 h-8 px-2 rounded border border-gray-200 text-sm" />
                    ) : (
                      <span className="font-mono text-gray-600">{s.end_time?.slice(0, 5)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input type="number" value={editValues.late_threshold_mins} onChange={(e) => setEditValues({ ...editValues, late_threshold_mins: Number(e.target.value) })} className="w-16 h-8 px-2 rounded border border-gray-200 text-sm" />
                    ) : (
                      <span className="text-gray-600">{s.late_threshold_mins ?? 10} mins</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input type="number" value={editValues.early_leave_threshold_mins} onChange={(e) => setEditValues({ ...editValues, early_leave_threshold_mins: Number(e.target.value) })} className="w-16 h-8 px-2 rounded border border-gray-200 text-sm" />
                    ) : (
                      <span className="text-gray-600">{s.early_leave_threshold_mins ?? 30} mins</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input type="number" step="0.5" value={editValues.working_hours} onChange={(e) => setEditValues({ ...editValues, working_hours: Number(e.target.value) })} className="w-16 h-8 px-2 rounded border border-gray-200 text-sm" />
                    ) : (
                      <span className="font-semibold text-gray-700">{s.working_hours ?? 9} hrs</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                        s.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      {s.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(s.id)} className="h-7 w-7 grid place-items-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingShift(null)} className="h-7 w-7 grid place-items-center rounded bg-red-50 text-red-500 hover:bg-red-100"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(s)} className="h-7 w-7 grid place-items-center rounded hover:bg-gray-100 text-gray-500">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
