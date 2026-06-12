import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { PageContainer, PageHeader } from "@/components/lams/page";
import { FileSpreadsheet, FileText, Download, FileBarChart, Calendar, Building2, DownloadCloud } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports & Compliance — LAMS" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "overtime" | "compliance" | "payroll">("attendance");

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Compliance"
        subtitle="Generate, schedule, and export compliance data"
        breadcrumbs={[{ label: "Reports" }, { label: "Overview" }]}
      />
      
      <div className="flex gap-2 border-b border-gray-200 pb-2 mb-6 overflow-x-auto">
        {[
          { id: "attendance", label: "Attendance Report" },
          { id: "leave", label: "Leave Report" },
          { id: "overtime", label: "Overtime Report" },
          { id: "compliance", label: "Compliance Report" },
          { id: "payroll", label: "Payroll Report" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === t.id ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "attendance" && <AttendanceReportTab />}
      {activeTab === "leave" && <LeaveReportTab />}
      {activeTab === "overtime" && <OvertimeReportTab />}
      {activeTab === "compliance" && <ComplianceReportTab />}
      {activeTab === "payroll" && <PayrollReportTab />}

    </PageContainer>
  );
}

function PayrollReportTab() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  async function fetchCycles() {
    const { data: cycleData } = await supabase
      .from("payroll_cycles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (cycleData && cycleData.length > 0) {
      setCycles(cycleData);
      setSelectedCycleId(cycleData[0].id);
    }
  }

  async function generateReport() {
    if (!selectedCycleId) return;
    setLoading(true);

    const selectedCycle = cycles.find(c => c.id === selectedCycleId);

    const { data: recordsData } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("cycle_id", selectedCycleId)
      .order("emp_name");

    const records = recordsData || [];
    const avgAtt = records.length > 0 
      ? records.reduce((sum, r) => sum + Number(r.attendance_percentage || 0), 0) / records.length
      : 0;

    setData({
      cycle: selectedCycle,
      records,
      avgAttendance: avgAtt
    });
    setLoading(false);
  }

  function formatHours(decimalHours: number) {
    if (!decimalHours) return "0h 0m";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  }

  function exportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const ws1 = XLSX.utils.json_to_sheet([
      { Metric: "Cycle Name", Value: data.cycle?.name },
      { Metric: "Status", Value: data.cycle?.status },
      { Metric: "Total Employees", Value: data.cycle?.total_employees },
      { Metric: "Total OT Hours", Value: formatHours(data.cycle?.total_overtime_hours) },
      { Metric: "Total LOP Days", Value: data.cycle?.total_lop_days },
      { Metric: "Avg Attendance %", Value: data.avgAttendance.toFixed(1) + "%" },
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Payroll Summary");

    // Sheet 2: Records
    const ws2 = XLSX.utils.json_to_sheet(data.records.map((r: any) => ({
      Employee: r.emp_name,
      Department: r.department,
      "Working Days": r.working_days,
      Present: r.present_days,
      Absent: r.absent_days,
      Leave: r.leave_days,
      WFH: r.wfh_days,
      Late: r.late_days,
      "OT Hours": r.overtime_hours,
      "LOP Days": r.lop_days,
      "Attendance %": Number(r.attendance_percentage),
      "Sync Status": r.sync_status
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "Payroll Records");

    XLSX.writeFile(wb, `payroll_report_${data.cycle?.name.replace(/ /g, "_")}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payroll Cycle</label>
          <select 
            value={selectedCycleId} 
            onChange={e => setSelectedCycleId(e.target.value)} 
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-64"
          >
            {cycles.length === 0 ? (
              <option value="">No cycles available</option>
            ) : (
              cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            )}
          </select>
        </div>
        <button onClick={generateReport} disabled={loading || !selectedCycleId} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg h-[38px] flex items-center">
          {loading ? "Generating..." : "Generate Report"}
        </button>
        {data && (
          <button onClick={exportExcel} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2 ml-auto">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
        )}
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Select a Payroll Cycle and click Generate Report to view data.
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Employees Processed</div>
              <div className="text-2xl font-bold text-gray-900">{data.cycle?.total_employees || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total OT Hours</div>
              <div className="text-2xl font-bold text-indigo-600">{formatHours(data.cycle?.total_overtime_hours)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total LOP Days</div>
              <div className="text-2xl font-bold text-red-600">{data.cycle?.total_lop_days || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Avg Attendance %</div>
              <div className="text-2xl font-bold text-emerald-600">{data.avgAttendance.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Payroll Export Records</h3>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${
                data.cycle?.status === 'Synced' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                data.cycle?.status === 'Draft' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}>
                Cycle Status: {data.cycle?.status || 'Unknown'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-3 px-4 font-semibold text-gray-500">Employee</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Department</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Working</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Present</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Absent</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Leave</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">WFH</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Late</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-right">OT Hours</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center text-red-600">LOP Days</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-right">Att %</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Sync Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-gray-500">No records found for this cycle</td>
                    </tr>
                  ) : (
                    data.records.map((r: any) => {
                      const isLowAtt = r.attendance_percentage < 75;
                      return (
                        <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isLowAtt ? 'bg-red-50/30' : ''}`}>
                          <td className="py-3 px-4 font-semibold text-gray-900">{r.emp_name}</td>
                          <td className="py-3 px-4 text-gray-500">{r.department}</td>
                          <td className="py-3 px-4 text-center text-gray-500">{r.working_days}</td>
                          <td className="py-3 px-4 text-center font-medium text-gray-700">{r.present_days}</td>
                          <td className="py-3 px-4 text-center text-red-600">{r.absent_days}</td>
                          <td className="py-3 px-4 text-center text-indigo-600">{r.leave_days}</td>
                          <td className="py-3 px-4 text-center text-blue-600">{r.wfh_days}</td>
                          <td className="py-3 px-4 text-center text-amber-600">{r.late_days}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-700">{formatHours(r.overtime_hours)}</td>
                          <td className="py-3 px-4 text-center font-bold text-red-600">{r.lop_days}</td>
                          <td className={`py-3 px-4 text-right font-bold ${isLowAtt ? 'text-red-600' : 'text-emerald-600'}`}>
                            {Number(r.attendance_percentage).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold text-gray-600">{r.sync_status}</span>
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
      )}
    </div>
  );
}

function ComplianceReportTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    // 1. Leave Compliance
    const { data: balsData } = await supabase
      .from("leave_balances")
      .select(`
        *,
        emp:employees!emp_id(id, name, department),
        type:leave_types!leave_type_id(name, carry_forward)
      `)
      .eq("year", year);

    const zeroAnnualLeave: any[] = [];
    const losingCarryForward: any[] = [];

    (balsData || []).forEach((b: any) => {
      if (b.type?.name === "Annual Leave" || b.type?.name === "Annual") {
        if (b.used === 0) zeroAnnualLeave.push(b);
      }
      const remaining = b.total - b.used;
      const maxCarry = b.type?.carry_forward || 0;
      if (remaining > maxCarry) {
        losingCarryForward.push({ ...b, loss: remaining - maxCarry });
      }
    });

    // 2. Attendance Compliance
    const { data: attData } = await supabase
      .from("attendance")
      .select(`
        *,
        emp:employees!emp_id(id, name, department)
      `)
      .gte("date", startOfYear)
      .lte("date", endOfYear);

    const empAttMap: any = {};
    (attData || []).forEach((a: any) => {
      const id = a.emp_id;
      if (!empAttMap[id]) empAttMap[id] = { name: a.emp?.name, dept: a.emp?.department, present: 0, wfh: 0, late: 0, absent: 0, early_leave: 0, total: 0 };
      empAttMap[id].total++;
      if (a.status === "Present") empAttMap[id].present++;
      if (a.status === "WFH") empAttMap[id].wfh++;
      if (a.status === "Late") empAttMap[id].late++;
      if (a.status === "Absent") empAttMap[id].absent++;
      if (a.early_leave) empAttMap[id].early_leave++;
    });

    const lowAttendance: any[] = [];
    const topLate: any[] = [];
    const topEarly: any[] = [];

    Object.values(empAttMap).forEach((e: any) => {
      const workingDays = e.total; // simplified assumption for calculation
      if (workingDays > 0) {
        const attPct = ((e.present + e.wfh + e.late) / workingDays) * 100;
        if (attPct < 75) lowAttendance.push({ ...e, pct: attPct });
        
        if (e.late > 0) topLate.push({ ...e, pct_late: (e.late / workingDays) * 100 });
        if (e.early_leave > 0) topEarly.push({ ...e, pct_early: (e.early_leave / workingDays) * 100 });
      }
    });

    lowAttendance.sort((a, b) => a.pct - b.pct);
    topLate.sort((a, b) => b.late - a.late);
    topEarly.sort((a, b) => b.early_leave - a.early_leave);

    // 3. Approval Compliance
    const { data: appsData } = await supabase
      .from("leave_applications")
      .select("created_at, manager_actioned_at, status")
      .gte("created_at", `${year}-01-01T00:00:00Z`)
      .lte("created_at", `${year}-12-31T23:59:59Z`);

    let totalWaitDays = 0;
    let actionedCount = 0;
    let slaBreaches = 0;

    const now = new Date();

    (appsData || []).forEach((a: any) => {
      const created = new Date(a.created_at);
      if (a.manager_actioned_at) {
        const actioned = new Date(a.manager_actioned_at);
        const waitDays = (actioned.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        totalWaitDays += waitDays;
        actionedCount++;
        if (waitDays > 3) slaBreaches++;
      } else if (a.status === "Pending") {
        const waitDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (waitDays > 3) slaBreaches++;
      }
    });

    const avgApprovalDays = actionedCount > 0 ? totalWaitDays / actionedCount : 0;

    // 4. Audit Summary
    const { data: auditData } = await supabase
      .from("audit_log")
      .select("action")
      .gte("created_at", `${year}-01-01T00:00:00Z`)
      .lte("created_at", `${year}-12-31T23:59:59Z`);

    const auditMap: any = {};
    const totalAudits = (auditData || []).length;
    (auditData || []).forEach((a: any) => {
      if (!auditMap[a.action]) auditMap[a.action] = 0;
      auditMap[a.action]++;
    });

    const auditSummary = Object.keys(auditMap).map(action => ({
      action,
      count: auditMap[action],
      pct: totalAudits > 0 ? (auditMap[action] / totalAudits) * 100 : 0
    })).sort((a,b) => b.count - a.count);

    setData({
      zeroAnnualLeave, losingCarryForward,
      lowAttendance, topLate: topLate.slice(0, 10), topEarly: topEarly.slice(0, 10),
      avgApprovalDays, slaBreaches,
      auditSummary, totalAudits
    });
    setLoading(false);
  }

  function getGaugeColor(avg: number) {
    if (avg <= 1) return "text-emerald-600";
    if (avg <= 3) return "text-amber-600";
    return "text-red-600";
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32">
            {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={generateReport} disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg h-[38px] flex items-center">
          {loading ? "Generating..." : "Generate Report"}
        </button>
        {data && (
          <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2 ml-auto">
            <DownloadCloud className="h-4 w-4" /> Print PDF
          </button>
        )}
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Select Year and click Generate Report to view compliance metrics.
        </div>
      )}

      {data && (
        <div className="grid lg:grid-cols-2 gap-6 print:block print:space-y-6">
          
          {/* SECTION C: Approval Compliance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
            <h3 className="font-bold text-gray-900 mb-6">Manager Approval Compliance</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 font-medium">Average Approval Time</div>
                  <div className={`text-3xl font-bold mt-1 ${getGaugeColor(data.avgApprovalDays)}`}>
                    {data.avgApprovalDays.toFixed(1)} <span className="text-base font-normal">days</span>
                  </div>
                </div>
                <div className="w-1/3 text-xs text-gray-500">
                  Target: &lt; 1 day<br/>
                  Amber: 1-3 days<br/>
                  Red: &gt; 3 days
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-red-100 bg-red-50">
                <div className="flex-1">
                  <div className="text-sm text-red-800 font-medium">SLA Breaches (&gt; 3 days)</div>
                  <div className="text-3xl font-bold mt-1 text-red-600">{data.slaBreaches}</div>
                </div>
                <div className="w-1/3 text-xs text-red-700">
                  Applications waiting or actioned after 3+ days
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: Leave Compliance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-amber-50">
              <h3 className="font-bold text-amber-900">Leave Utilization Risks</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto max-h-[300px]">
              <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">0% Annual Leave Used</h4>
                {data.zeroAnnualLeave.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No employees found.</div>
                ) : (
                  <div className="space-y-2">
                    {data.zeroAnnualLeave.map((b: any) => (
                      <div key={b.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{b.emp?.name}</span>
                        <span className="text-gray-500">{b.total} days untouched</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Losing Carry Forward</h4>
                {data.losingCarryForward.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No employees at risk.</div>
                ) : (
                  <div className="space-y-2">
                    {data.losingCarryForward.map((b: any) => (
                      <div key={b.id} className="flex justify-between items-center text-sm p-2 bg-red-50 text-red-800 rounded-lg">
                        <div>
                          <span className="font-bold block">{b.emp?.name}</span>
                          <span className="text-xs">{b.type?.name}</span>
                        </div>
                        <span className="font-bold bg-red-100 px-2 py-1 rounded">At risk: {b.loss} days</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION B: Attendance Compliance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-red-50">
              <h3 className="font-bold text-red-900">Attendance Risks (&lt; 75%)</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto max-h-[300px]">
              {data.lowAttendance.length === 0 ? (
                <div className="text-sm text-gray-500 italic text-center mt-8">No employees under 75% attendance.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Employee</th>
                      <th className="pb-2 font-medium">Dept</th>
                      <th className="pb-2 font-medium text-right">Att %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowAttendance.map((e: any) => (
                      <tr key={e.name} className="border-b border-gray-50">
                        <td className="py-2 font-semibold text-gray-900">{e.name}</td>
                        <td className="py-2 text-gray-500">{e.dept}</td>
                        <td className="py-2 text-right font-bold text-red-600">{e.pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SECTION B continued: Top Late / Early */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Top 10 Late Arrivals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="py-2 px-4 font-medium">Employee</th>
                    <th className="py-2 px-4 font-medium text-center">Late Days</th>
                    <th className="py-2 px-4 font-medium text-right">% Late</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLate.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-4 text-gray-500">No late records</td></tr>
                  ) : (
                    data.topLate.map((e: any) => (
                      <tr key={e.name} className="border-b border-gray-50">
                        <td className="py-2 px-4 font-medium text-gray-900">{e.name}</td>
                        <td className="py-2 px-4 text-center font-bold text-amber-600">{e.late}</td>
                        <td className="py-2 px-4 text-right text-gray-500">{e.pct_late.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Top 10 Early Leavers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="py-2 px-4 font-medium">Employee</th>
                    <th className="py-2 px-4 font-medium text-center">Early Days</th>
                    <th className="py-2 px-4 font-medium text-right">% Early</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topEarly.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-4 text-gray-500">No early leave records</td></tr>
                  ) : (
                    data.topEarly.map((e: any) => (
                      <tr key={e.name} className="border-b border-gray-50">
                        <td className="py-2 px-4 font-medium text-gray-900">{e.name}</td>
                        <td className="py-2 px-4 text-center font-bold text-orange-600">{e.early_leave}</td>
                        <td className="py-2 px-4 text-right text-gray-500">{e.pct_early.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION D: Audit Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">System Audit Summary</h3>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Total Events: {data.totalAudits}</span>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 sticky top-0">
                    <th className="py-3 px-4 font-semibold text-gray-500">Action Type</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-right">Event Count</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-right">% of Total</th>
                    <th className="py-3 px-4 w-1/3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditSummary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">No audit logs found for this year</td>
                    </tr>
                  ) : (
                    data.auditSummary.map((a: any) => (
                      <tr key={a.action} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-semibold text-gray-700">{a.action}</td>
                        <td className="py-3 px-4 text-right font-medium">{a.count}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{a.pct.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${a.pct}%` }}></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function OvertimeReportTab() {
  const { employee: currentEmployee } = useAuth();
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [deptFilter, setDeptFilter] = useState("All");
  const [empFilter, setEmpFilter] = useState("All");
  
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isManagerOrHR = currentEmployee?.role === "hr" || currentEmployee?.role === "manager" || currentEmployee?.role === "super_admin";

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    const { data: emps } = await supabase.from("employees").select("id, name, department").order("name");
    if (emps) {
      setEmployees(emps);
      const depts = [...new Set(emps.map(e => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    }
  }

  async function generateReport() {
    setLoading(true);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Attendance for OT
    let qAtt = supabase
      .from("attendance")
      .select(`
        *,
        emp:employees!emp_id(id, name, department)
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .gt("overtime_hours", 0);

    if (empFilter !== "All") qAtt = qAtt.eq("emp_id", empFilter);
    else if (!isManagerOrHR) qAtt = qAtt.eq("emp_id", currentEmployee?.id);

    const { data: attData } = await qAtt;
    let filteredAtt = attData || [];

    if (deptFilter !== "All") {
      filteredAtt = filteredAtt.filter(a => a.emp?.department === deptFilter);
    }

    // 2. OT Requests
    let qReq = supabase
      .from("overtime_requests")
      .select(`
        *,
        emp:employees!emp_id(id, name, department)
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("created_at", { ascending: false });

    if (empFilter !== "All") qReq = qReq.eq("emp_id", empFilter);
    else if (!isManagerOrHR) qReq = qReq.eq("emp_id", currentEmployee?.id);

    const { data: reqData } = await qReq;
    let filteredReq = reqData || [];

    if (deptFilter !== "All") {
      filteredReq = filteredReq.filter(r => r.emp?.department === deptFilter);
    }

    // Stats
    const totalOTHours = filteredAtt.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0);
    const empsWithOT = new Set(filteredAtt.map(a => a.emp_id)).size;
    const requestsApproved = filteredReq.filter(r => r.status === "Approved").length;
    const compOffGenerated = filteredReq.filter(r => r.status === "Approved" && r.compensation_type === "comp_off").length;

    // Trend Chart (daily OT)
    const trendMap: any = {};
    for (let d = 1; d <= lastDay; d++) {
      trendMap[`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = 0;
    }
    filteredAtt.forEach(a => {
      if (trendMap[a.date] !== undefined) {
        trendMap[a.date] += Number(a.overtime_hours);
      }
    });
    
    const maxDailyOT = Math.max(...Object.values(trendMap).map(Number), 1); // avoid /0
    const trendChart = Object.keys(trendMap).map(d => ({
      date: d,
      hours: trendMap[d],
      pct: (trendMap[d] / maxDailyOT) * 100
    })).sort((a,b) => a.date.localeCompare(b.date));

    // Top Employees
    const empOTMap: any = {};
    filteredAtt.forEach(a => {
      const id = a.emp_id;
      if (!empOTMap[id]) empOTMap[id] = { name: a.emp?.name, dept: a.emp?.department, total_ot: 0, ot_days: 0 };
      empOTMap[id].total_ot += Number(a.overtime_hours);
      empOTMap[id].ot_days += 1;
    });

    const topEmployees = Object.values(empOTMap).map((e: any) => ({
      ...e,
      avg_ot: e.total_ot / e.ot_days
    })).sort((a: any, b: any) => b.total_ot - a.total_ot);

    setData({
      stats: { totalOTHours, empsWithOT, requestsApproved, compOffGenerated },
      trendChart,
      topEmployees,
      requests: filteredReq
    });
    setLoading(false);
  }

  function formatHours(decimalHours: number) {
    if (!decimalHours) return "0h 0m";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  }

  function exportCSV() {
    if (!data) return;
    const headers = ["Employee", "Date", "OT Hours", "Reason", "Compensation", "Status"];
    const rows = data.requests.map((r: any) => [
      r.emp?.name, r.date, formatHours(r.hours), `"${r.reason || ''}"`, r.compensation_type, r.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `overtime_report_${year}_${month}.csv`;
    link.click();
  }

  function exportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const ws1 = XLSX.utils.json_to_sheet([
      { Metric: "Total OT Hours", Value: formatHours(data.stats.totalOTHours) },
      { Metric: "Employees with OT", Value: data.stats.empsWithOT },
      { Metric: "OT Requests Approved", Value: data.stats.requestsApproved },
      { Metric: "Comp Off Generated", Value: data.stats.compOffGenerated },
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary Stats");

    // Sheet 2: Top Employees
    const ws2 = XLSX.utils.json_to_sheet(data.topEmployees.map((e: any, i: number) => ({
      Rank: i + 1,
      Employee: e.name,
      Department: e.dept,
      "Total OT Hours": e.total_ot.toFixed(1),
      "OT Days": e.ot_days,
      "Avg OT/Day": e.avg_ot.toFixed(1)
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "Top Employees");

    // Sheet 3: Requests
    const ws3 = XLSX.utils.json_to_sheet(data.requests.map((r: any) => ({
      Employee: r.emp?.name,
      Department: r.emp?.department,
      Date: r.date,
      "OT Hours": r.hours,
      Reason: r.reason,
      Compensation: r.compensation_type,
      Status: r.status
    })));
    XLSX.utils.book_append_sheet(wb, ws3, "OT Requests");

    XLSX.writeFile(wb, `overtime_report_${year}_${month}.xlsx`);
  }

  function getStatusColor(status: string) {
    if (status === "Approved") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (status.includes("Rejected")) return "bg-red-50 text-red-600 border-red-100";
    return "bg-amber-50 text-amber-600 border-amber-100";
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32">
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', {month: 'long'})}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-24">
            {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {isManagerOrHR && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40">
                <option value="All">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Employee</label>
              <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48">
                <option value="All">All Employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </>
        )}
        <button onClick={generateReport} disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg h-[38px] flex items-center">
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Select filters and click Generate Report to view data.
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3 print:hidden">
            <button onClick={exportCSV} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <FileText className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportExcel} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <DownloadCloud className="h-4 w-4" /> PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total OT Hours</div>
              <div className="text-2xl font-bold text-gray-900">{formatHours(data.stats.totalOTHours)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Employees with OT</div>
              <div className="text-2xl font-bold text-indigo-600">{data.stats.empsWithOT}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">OT Requests Approved</div>
              <div className="text-2xl font-bold text-emerald-600">{data.stats.requestsApproved}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Comp Off Generated</div>
              <div className="text-2xl font-bold text-blue-600">{data.stats.compOffGenerated}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-6">Overtime Trend ({new Date(year, month-1).toLocaleString('default', {month: 'long'})})</h3>
            <div className="h-48 flex items-end gap-1 border-b border-gray-100 pb-2">
              {data.trendChart.map((d: any) => (
                <div key={d.date} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                  <div className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors" style={{ height: `${Math.max(d.pct, 1)}%` }}></div>
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                    {formatHours(d.hours)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>01</span>
              <span>{data.trendChart.length}</span>
            </div>
          </div>

          {isManagerOrHR && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Top Overtime Employees</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="py-3 px-4 font-semibold text-gray-500">Rank</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Employee</th>
                      <th className="py-3 px-4 font-semibold text-gray-500">Department</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 text-right">Total OT</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 text-center">OT Days</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 text-right">Avg OT/Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">No overtime recorded</td>
                      </tr>
                    ) : (
                      data.topEmployees.slice(0, 10).map((e: any, i: number) => (
                        <tr key={e.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-medium text-gray-500">#{i + 1}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{e.name}</td>
                          <td className="py-3 px-4 text-gray-500">{e.dept}</td>
                          <td className="py-3 px-4 text-right font-bold text-indigo-600">{formatHours(e.total_ot)}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{e.ot_days}</td>
                          <td className="py-3 px-4 text-right text-gray-600">{formatHours(e.avg_ot)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Overtime Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-3 px-4 font-semibold text-gray-500">Employee</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Date</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">OT Hours</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Reason</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Compensation</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">No requests match the filters</td>
                    </tr>
                  ) : (
                    data.requests.map((r: any) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{r.emp?.name}</div>
                          <div className="text-[10px] text-gray-500">{r.emp?.department}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{r.date}</td>
                        <td className="py-3 px-4 font-medium">{formatHours(r.hours)}</td>
                        <td className="py-3 px-4 text-gray-500 truncate max-w-[200px]" title={r.reason}>{r.reason}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-600 uppercase font-semibold">{r.compensation_type?.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaveReportTab() {
  const { employee: currentEmployee } = useAuth();
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isManagerOrHR = currentEmployee?.role === "hr" || currentEmployee?.role === "manager" || currentEmployee?.role === "super_admin";

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    const { data: types } = await supabase.from("leave_types").select("id, name");
    if (types) setLeaveTypes(types);

    const { data: emps } = await supabase.from("employees").select("id, name, department");
    if (emps) {
      setEmployees(emps);
      const depts = [...new Set(emps.map(e => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    }
  }

  async function generateReport() {
    setLoading(true);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Leave Applications
    let qApps = supabase
      .from("leave_applications")
      .select(`
        *,
        emp:employees!emp_id(id, name, department),
        type:leave_types!leave_type_id(id, name)
      `)
      .gte("from_date", startDate)
      .lte("from_date", endDate)
      .order("created_at", { ascending: false });

    if (statusFilter !== "All") qApps = qApps.eq("status", statusFilter);
    if (typeFilter !== "All") qApps = qApps.eq("leave_type_id", typeFilter);
    if (!isManagerOrHR) qApps = qApps.eq("emp_id", currentEmployee?.id);

    const { data: appsData } = await qApps;
    let filteredApps = appsData || [];

    if (deptFilter !== "All") {
      filteredApps = filteredApps.filter(a => a.emp?.department === deptFilter);
    }

    // 2. Leave Balances
    let qBals = supabase
      .from("leave_balances")
      .select(`
        *,
        emp:employees!emp_id(id, name, department),
        type:leave_types!leave_type_id(name)
      `)
      .eq("year", year);

    if (!isManagerOrHR) qBals = qBals.eq("emp_id", currentEmployee?.id);
    
    const { data: balsData } = await qBals;
    let filteredBals = balsData || [];
    if (deptFilter !== "All") {
      filteredBals = filteredBals.filter(b => b.emp?.department === deptFilter);
    }

    // Process Stats
    const totalApps = filteredApps.length;
    const approved = filteredApps.filter(a => a.status === "Approved").length;
    const rejected = filteredApps.filter(a => ["Manager_Rejected", "Rejected"].includes(a.status)).length;
    const pending = filteredApps.filter(a => ["Pending", "Manager_Approved"].includes(a.status)).length;

    // Process Type Breakdown
    const typeMap: any = {};
    filteredApps.forEach(a => {
      const t = a.type?.name || "Unknown";
      if (!typeMap[t]) typeMap[t] = 0;
      typeMap[t]++;
    });
    const typeChart = Object.keys(typeMap).map(t => ({
      name: t,
      count: typeMap[t],
      pct: totalApps > 0 ? (typeMap[t] / totalApps) * 100 : 0
    })).sort((a,b) => b.count - a.count);

    // Group Balances
    const balGroups: any = {};
    filteredBals.forEach(b => {
      if (!balGroups[b.emp_id]) balGroups[b.emp_id] = { name: b.emp?.name, dept: b.emp?.department, balances: [] };
      balGroups[b.emp_id].balances.push({
        type: b.type?.name,
        total: b.total,
        used: b.used,
        remaining: b.total - b.used
      });
    });

    setData({
      stats: { totalApps, approved, rejected, pending },
      typeChart,
      balGroups: Object.values(balGroups).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      applications: filteredApps
    });
    setLoading(false);
  }

  function exportCSV() {
    if (!data) return;
    const headers = ["Employee", "Department", "Leave Type", "From", "To", "Days", "Applied On", "Status"];
    const rows = data.applications.map((a: any) => [
      a.emp?.name, a.emp?.department, a.type?.name, a.from_date, a.to_date, a.days, new Date(a.created_at).toLocaleDateString(), a.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `leave_report_${year}_${month}.csv`;
    link.click();
  }

  function exportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const ws1 = XLSX.utils.json_to_sheet([
      { Metric: "Total Applications", Value: data.stats.totalApps },
      { Metric: "Approved", Value: data.stats.approved },
      { Metric: "Rejected", Value: data.stats.rejected },
      { Metric: "Pending", Value: data.stats.pending },
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary Stats");

    // Sheet 2: Applications
    const ws2 = XLSX.utils.json_to_sheet(data.applications.map((a: any) => ({
      Employee: a.emp?.name,
      Department: a.emp?.department,
      "Leave Type": a.type?.name,
      "From Date": a.from_date,
      "To Date": a.to_date,
      Days: a.days,
      "Applied On": new Date(a.created_at).toLocaleDateString(),
      Status: a.status
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "Applications");

    XLSX.writeFile(wb, `leave_report_${year}_${month}.xlsx`);
  }

  function getStatusColor(status: string) {
    if (status === "Approved") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (status.includes("Rejected")) return "bg-red-50 text-red-600 border-red-100";
    return "bg-amber-50 text-amber-600 border-amber-100";
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32">
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', {month: 'long'})}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-24">
            {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Leave Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40">
            <option value="All">All Types</option>
            {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32">
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        {isManagerOrHR && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40">
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        <button onClick={generateReport} disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg h-[38px] flex items-center">
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Select filters and click Generate Report to view data.
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3 print:hidden">
            <button onClick={exportCSV} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <FileText className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportExcel} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <DownloadCloud className="h-4 w-4" /> PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Applications</div>
              <div className="text-2xl font-bold text-gray-900">{data.stats.totalApps}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Approved</div>
              <div className="text-2xl font-bold text-emerald-600">{data.stats.approved}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-600">{data.stats.rejected}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Pending</div>
              <div className="text-2xl font-bold text-amber-600">{data.stats.pending}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-6">Leave Type Breakdown</h3>
              <div className="space-y-5">
                {data.typeChart.length === 0 ? (
                  <div className="text-sm text-gray-500">No applications</div>
                ) : (
                  data.typeChart.map((d: any) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{d.name}</span>
                        <span className="text-gray-500">{d.count} ({d.pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.pct}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Leave Balance Summary ({year})</h3>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                {data.balGroups.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center mt-4">No balances found</div>
                ) : (
                  <div className="space-y-6">
                    {data.balGroups.map((g: any) => (
                      <div key={g.name} className="border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <div className="font-bold text-gray-900">{g.name}</div>
                            <div className="text-xs text-gray-500">{g.dept || "—"}</div>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {g.balances.map((b: any, i: number) => {
                            const pct = b.total > 0 ? (b.used / b.total) * 100 : 0;
                            return (
                              <div key={i} className="bg-gray-50 rounded-lg p-3">
                                <div className="text-[11px] font-semibold text-gray-500 mb-1">{b.type}</div>
                                <div className="text-xs font-bold text-gray-900 mb-1.5">{b.used} used / <span className="text-gray-400">{b.total} total</span></div>
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Leave Applications Detail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-3 px-4 font-semibold text-gray-500">Employee</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Type</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Duration</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Days</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Applied On</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">No applications match the filters</td>
                    </tr>
                  ) : (
                    data.applications.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{a.emp?.name}</div>
                          <div className="text-[10px] text-gray-500">{a.emp?.department}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{a.type?.name}</td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {new Date(a.from_date).toLocaleDateString()} - {new Date(a.to_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{a.days}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceReportTab() {
  const { employee: currentEmployee } = useAuth();
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [deptFilter, setDeptFilter] = useState("All");
  const [empFilter, setEmpFilter] = useState("All");
  
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isManagerOrHR = currentEmployee?.role === "hr" || currentEmployee?.role === "manager" || currentEmployee?.role === "super_admin";

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    const { data: emps } = await supabase.from("employees").select("id, name, department").order("name");
    if (emps) {
      setEmployees(emps);
      const depts = [...new Set(emps.map(e => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    }
  }

  async function generateReport() {
    setLoading(true);
    
    // Determine date range for month/year
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Compute working days in this month
    let workingDays = 0;
    for(let d=1; d<=lastDay; d++) {
      const dt = new Date(year, month-1, d);
      if (dt.getDay() !== 0 && dt.getDay() !== 6) workingDays++;
    }

    // Query Attendance
    let query = supabase
      .from("attendance")
      .select(`
        *,
        emp:employees!emp_id(id, name, department)
      `)
      .gte("date", startDate)
      .lte("date", endDate);

    if (deptFilter !== "All") {
      // Need to filter post-query since employee filter is nested
    }
    if (empFilter !== "All") query = query.eq("emp_id", empFilter);
    else if (!isManagerOrHR) query = query.eq("emp_id", currentEmployee?.id);

    const { data: attData } = await query;
    let filteredData = attData || [];

    if (deptFilter !== "All") {
      filteredData = filteredData.filter(r => r.emp?.department === deptFilter);
    }

    // STATS
    const validEmps = new Set(filteredData.map(r => r.emp_id)).size || 1;
    const totalRecords = filteredData.length;
    const presentRecords = filteredData.filter(r => ["Present", "WFH", "Late"].includes(r.status));
    
    const avgAttendance = workingDays * validEmps > 0 
      ? (presentRecords.length / (workingDays * validEmps)) * 100 
      : 0;

    const totalPresentDays = presentRecords.length;
    const totalAbsentDays = filteredData.filter(r => r.status === "Absent").length;
    const totalWfhDays = filteredData.filter(r => r.status === "WFH").length;

    // DEPT CHART
    const deptMap: any = {};
    filteredData.forEach(r => {
      const d = r.emp?.department || "Unassigned";
      if (!deptMap[d]) deptMap[d] = { present: 0, total: 0 };
      deptMap[d].total++;
      if (["Present", "WFH", "Late"].includes(r.status)) deptMap[d].present++;
    });

    const deptChart = Object.keys(deptMap).map(d => ({
      dept: d,
      pct: deptMap[d].total > 0 ? (deptMap[d].present / deptMap[d].total) * 100 : 0
    })).sort((a,b) => b.pct - a.pct);

    // EMPLOYEE TABLE
    const empMap: any = {};
    filteredData.forEach(r => {
      const id = r.emp_id;
      if (!empMap[id]) {
        empMap[id] = {
          name: r.emp?.name || "Unknown",
          dept: r.emp?.department || "—",
          present: 0, wfh: 0, late: 0, absent: 0,
          total_ot: 0,
          total_hours: 0,
          working_days: workingDays
        };
      }
      if (r.status === "Present") empMap[id].present++;
      if (r.status === "WFH") empMap[id].wfh++;
      if (r.status === "Late") empMap[id].late++;
      if (r.status === "Absent") empMap[id].absent++;
      if (r.overtime_hours) empMap[id].total_ot += Number(r.overtime_hours);
      if (r.total_hours) empMap[id].total_hours += Number(r.total_hours);
    });

    const empTable = Object.values(empMap).map((e: any) => ({
      ...e,
      attPct: e.working_days > 0 ? ((e.present + e.wfh + e.late) / e.working_days) * 100 : 0
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    setData({
      stats: { avgAttendance, totalPresentDays, totalAbsentDays, totalWfhDays },
      deptChart,
      empTable
    });
    setLoading(false);
  }

  function getPctColor(pct: number) {
    if (pct >= 95) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (pct >= 80) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-red-600 bg-red-50 border-red-100";
  }
  function getPctBg(pct: number) {
    if (pct >= 95) return "bg-emerald-500";
    if (pct >= 80) return "bg-amber-500";
    return "bg-red-500";
  }

  function formatHours(decimalHours: number) {
    if (!decimalHours) return "0h 0m";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  }

  function exportCSV() {
    if (!data) return;
    const headers = ["Employee", "Department", "Present", "WFH", "Late", "Absent", "OT Hours", "Attendance %"];
    const rows = data.empTable.map((e: any) => [
      e.name, e.dept, e.present, e.wfh, e.late, e.absent, e.total_ot.toFixed(1), e.attPct.toFixed(1) + "%"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `attendance_report_${year}_${month}.csv`;
    link.click();
  }

  function exportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const ws1 = XLSX.utils.json_to_sheet([
      { Metric: "Avg Attendance %", Value: data.stats.avgAttendance.toFixed(1) + "%" },
      { Metric: "Total Present Days", Value: data.stats.totalPresentDays },
      { Metric: "Total Absent Days", Value: data.stats.totalAbsentDays },
      { Metric: "Total WFH Days", Value: data.stats.totalWfhDays },
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary Stats");

    // Sheet 2: Employee Details
    const ws2 = XLSX.utils.json_to_sheet(data.empTable.map((e: any) => ({
      Employee: e.name,
      Department: e.dept,
      Present: e.present,
      WFH: e.wfh,
      Late: e.late,
      Absent: e.absent,
      "OT Hours": e.total_ot,
      "Attendance %": Number(e.attPct.toFixed(1))
    })));
    XLSX.utils.book_append_sheet(wb, ws2, "Employee Details");

    XLSX.writeFile(wb, `attendance_report_${year}_${month}.xlsx`);
  }

  function exportPDF() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32">
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', {month: 'long'})}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-24">
            {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40">
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {isManagerOrHR && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Employee</label>
            <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48">
              <option value="All">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={generateReport} disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg h-[38px] flex items-center">
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          Select filters and click Generate Report to view data.
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3 print:hidden">
            <button onClick={exportCSV} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <FileText className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportExcel} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button onClick={exportPDF} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
              <DownloadCloud className="h-4 w-4" /> PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Avg Attendance</div>
              <div className="text-2xl font-bold text-gray-900">{data.stats.avgAttendance.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Present</div>
              <div className="text-2xl font-bold text-gray-900">{data.stats.totalPresentDays} <span className="text-base font-normal text-gray-400">days</span></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Absent</div>
              <div className="text-2xl font-bold text-gray-900">{data.stats.totalAbsentDays} <span className="text-base font-normal text-gray-400">days</span></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-1">Total WFH</div>
              <div className="text-2xl font-bold text-gray-900">{data.stats.totalWfhDays} <span className="text-base font-normal text-gray-400">days</span></div>
            </div>
          </div>

          {isManagerOrHR && deptFilter === "All" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-6">Department Attendance</h3>
              <div className="space-y-4">
                {data.deptChart.map((d: any) => (
                  <div key={d.dept} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700 truncate">{d.dept}</div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getPctBg(d.pct)}`} style={{ width: `${d.pct}%` }}></div>
                    </div>
                    <div className="w-16 text-right text-sm font-bold text-gray-900">{d.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Employee Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-3 px-4 font-semibold text-gray-500">Employee</th>
                    <th className="py-3 px-4 font-semibold text-gray-500">Department</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Present</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">WFH</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Late</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-center">Absent</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-right">OT Hours</th>
                    <th className="py-3 px-4 font-semibold text-gray-500 text-right">Att %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.empTable.map((e: any) => (
                    <tr key={e.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-semibold text-gray-900">{e.name}</td>
                      <td className="py-3 px-4 text-gray-500">{e.dept}</td>
                      <td className="py-3 px-4 text-center font-medium text-gray-700">{e.present}</td>
                      <td className="py-3 px-4 text-center text-blue-600">{e.wfh}</td>
                      <td className="py-3 px-4 text-center text-amber-600">{e.late}</td>
                      <td className="py-3 px-4 text-center text-red-600">{e.absent}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-700">{formatHours(e.total_ot)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getPctColor(e.attPct)}`}>
                          {e.attPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <td className="py-4 px-4 text-gray-900" colSpan={2}>Total</td>
                    <td className="py-4 px-4 text-center">{data.empTable.reduce((s:number,e:any)=>s+e.present,0)}</td>
                    <td className="py-4 px-4 text-center text-blue-600">{data.empTable.reduce((s:number,e:any)=>s+e.wfh,0)}</td>
                    <td className="py-4 px-4 text-center text-amber-600">{data.empTable.reduce((s:number,e:any)=>s+e.late,0)}</td>
                    <td className="py-4 px-4 text-center text-red-600">{data.empTable.reduce((s:number,e:any)=>s+e.absent,0)}</td>
                    <td className="py-4 px-4 text-right">{formatHours(data.empTable.reduce((s:number,e:any)=>s+e.total_ot,0))}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getPctColor(data.stats.avgAttendance)}`}>
                        {data.stats.avgAttendance.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
