import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { PageContainer, PageHeader, StatTile, StatusPill } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import BRDTag from "@/components/BRDTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FaceCheckin from "../components/FaceCheckin";
import FaceRegister from "../components/FaceRegister";
import { deleteFaceDescriptor } from "../utils/faceStorage";
import {
  Fingerprint,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Plus,
  X,
  Loader2,
  Globe,
  Clock,
  Calendar,
  Info,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Search,
  ScanFace,
} from "lucide-react";

export const Route = createFileRoute("/_app/integrations/biometric")({
  head: () => ({ meta: [{ title: "Biometric Integration — LAMS" }] }),
  component: BiometricIntegrationPage,
});

type BiometricDevice = {
  id: string;
  device_name: string;
  location: string;
  ip_address: string | null;
  last_sync: string | null;
  status: string;
  created_at: string;
};

type BiometricSyncLog = {
  id: string;
  device_name: string;
  synced_at: string;
  punches_pulled: number;
  status: string;
  error_message: string | null;
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hour(s) ago`;
  return `${Math.floor(diff / 86400000)} day(s) ago`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}

function BiometricIntegrationPage() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const isHrOrSuperAdmin = employee?.role === "hr" || employee?.role === "super_admin";
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [punches24h, setPunches24h] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [detailDevice, setDetailDevice] = useState<BiometricDevice | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "sync" | "users">("overview");
  const [syncLogs, setSyncLogs] = useState<BiometricSyncLog[]>([]);

  const [troubleshootDevice, setTroubleshootDevice] = useState<BiometricDevice | null>(null);

  const [mainTab, setMainTab] = useState<"devices" | "face">("devices");
  const [punchLog, setPunchLog] = useState<any[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    device_name: "",
    location: "",
    ip_address: "",
  });

  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [registeredFaceIds, setRegisteredFaceIds] = useState<Record<string, string>>({});
  const [selectedEmpForTraining, setSelectedEmpForTraining] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFaces, setLoadingFaces] = useState(false);

  async function fetchFaceData() {
    setLoadingFaces(true);
    try {
      // Fetch all active employees
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .order("name");
        
      // Fetch all registered face descriptors
      const { data: faces, error: faceErr } = await supabase
        .from("face_descriptors")
        .select("emp_id, created_at");

      if (emps) setEmployeeList(emps);
      if (faces) {
        const map: Record<string, string> = {};
        faces.forEach((f) => {
          map[f.emp_id] = f.created_at;
        });
        setRegisteredFaceIds(map);
      }
    } catch (e) {
      console.error("Failed to fetch face ID profiles", e);
    }
    setLoadingFaces(false);
  }

  async function handleDeleteFace(emp: any) {
    if (!confirm(`Delete Face ID for ${emp.name}? This cannot be undone.`)) return;
    try {
      await deleteFaceDescriptor(emp.id);

      // INSERT audit_log: action='FACE_DELETE'
      await supabase.from("audit_logs").insert({
        user_id: employee?.id,
        action: "FACE_DELETE",
        entity_type: "face_descriptors",
        details: { emp_id: emp.id, emp_name: emp.name },
        // backwards compatibility
        entity: "face_descriptors",
        new_value: { emp_id: emp.id, emp_name: emp.name }
      });

      showToast(`${emp.name} Face ID deleted`, "success");
      await fetchFaceData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, "error");
    }
  }

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchDevices() {
    const { data, error } = await supabase
      .from("biometric_devices")
      .select("*")
      .order("device_name");
    if (error) {
      console.error("Fetch devices error:", error);
      return;
    }
    if (data) setDevices(data);
  }

  async function fetchPunches24h() {
    const { count, error } = await supabase
      .from("biometric_punches")
      .select("*", { count: "exact", head: true })
      .gte("punch_time", new Date(Date.now() - 86400000).toISOString());
    if (!error && count !== null) setPunches24h(count);
  }

  async function fetchTodaysPunchLog() {
    if (!employee?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("biometric_punches")
      .select("*")
      .eq("emp_id", employee.id)
      .gte("punch_time", today)
      .order("punch_time", { ascending: true });
    if (data) setPunchLog(data);
  }

  useEffect(() => {
    fetchDevices();
    fetchPunches24h();
    const interval = setInterval(() => {
      fetchDevices();
      fetchPunches24h();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mainTab === "face") {
      fetchFaceData();
      fetchTodaysPunchLog();
    }
  }, [mainTab, isHrOrSuperAdmin]);

  async function syncDevice(device: BiometricDevice) {
    await supabase
      .from("biometric_devices")
      .update({ status: "syncing" })
      .eq("device_name", device.device_name);
    setDevices((prev) =>
      prev.map((d) => (d.device_name === device.device_name ? { ...d, status: "syncing" } : d)),
    );

    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
    const punches = Math.floor(Math.random() * 500) + 100;

    await supabase
      .from("biometric_devices")
      .update({ last_sync: new Date().toISOString(), status: "online" })
      .eq("device_name", device.device_name);
    await supabase.from("biometric_sync_logs").insert({
      device_name: device.device_name,
      synced_at: new Date().toISOString(),
      punches_pulled: punches,
      status: "success",
    });

    setDevices((prev) =>
      prev.map((d) =>
        d.device_name === device.device_name
          ? { ...d, last_sync: new Date().toISOString(), status: "online" }
          : d,
      ),
    );
    await fetchPunches24h();
  }

  async function syncAll() {
    setSyncing(true);
    const online = devices.filter((d) => d.status !== "error");
    for (const d of online) {
      await syncDevice(d);
    }
    await fetchDevices();
    setSyncing(false);
    showToast("All devices synced successfully");
  }

  const activeCount = devices.filter((d) => d.status !== "offline").length;
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const issuesCount = devices.filter((d) => d.status === "error" || d.status === "offline").length;
  const staleDevices = devices.filter(
    (d) =>
      d.status === "error" ||
      (d.last_sync && Date.now() - new Date(d.last_sync).getTime() > 7200000),
  );

  async function openDetail(device: BiometricDevice) {
    setDetailDevice(device);
    setDetailTab("overview");
    const { data } = await supabase
      .from("biometric_sync_logs")
      .select("*")
      .eq("device_name", device.device_name)
      .order("synced_at", { ascending: false })
      .limit(20);
    if (data) setSyncLogs(data);
  }

  async function addDevice() {
    const { error } = await supabase.from("biometric_devices").insert({
      device_name: addForm.device_name,
      location: addForm.location,
      ip_address: addForm.ip_address || null,
      status: "online",
    });
    if (error) {
      showToast(`Error: ${error.message}`, "error");
      return;
    }
    setShowAddModal(false);
    setAddForm({ device_name: "", location: "", ip_address: "" });
    await fetchDevices();
    showToast("Device added successfully");
  }

  async function deactivateDevice(id: string) {
    await supabase.from("biometric_devices").update({ status: "offline" }).eq("id", id);
    setDetailDevice(null);
    await fetchDevices();
    showToast("Device deactivated");
  }

  async function markResolved(device: BiometricDevice) {
    await supabase
      .from("biometric_devices")
      .update({ status: "online", last_sync: new Date().toISOString() })
      .eq("device_name", device.device_name);
    setTroubleshootDevice(null);
    await fetchDevices();
    showToast("Device marked as resolved");
  }

  return (
    <PageContainer>
      <PageHeader
        title="Biometric Integration"
        subtitle="Connected biometric devices across all locations"
        breadcrumbs={[{ label: "Integrations" }, { label: "Biometric" }]}
        badge={<BRDTag label="BRD 4.7: Biometric Integration" />}
        actions={
          mainTab === "devices" ? (
            <Button
              size="sm"
              className="bg-gradient-brand text-white"
              onClick={syncAll}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              {syncing ? "Syncing..." : "Sync All"}
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMainTab("devices")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            mainTab === "devices"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Fingerprint className="h-4 w-4" />
          Devices
        </button>
        <button
          onClick={() => setMainTab("face")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            mainTab === "face"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ScanFace className="h-4 w-4" />
          Face Check-In
        </button>
      </div>

      {/* Devices tab */}
      {mainTab === "devices" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Devices Connected" value={formatCount(activeCount)} icon={Fingerprint} tone="primary" />
            <StatTile label="Online" value={formatCount(onlineCount)} icon={CheckCircle2} tone="success" />
            <StatTile label="Issues" value={formatCount(issuesCount)} icon={AlertTriangle} tone="warning" />
            <StatTile label="Punches (24h)" value={formatCount(punches24h)} icon={Wifi} tone="teal" />
          </div>

          {/* Alert banners */}
          {staleDevices.map((d) => {
            const isError = d.status === "error";
            const staleTime = timeAgo(d.last_sync);
            return (
              <Card
                key={d.id}
                className="p-4 flex items-start gap-3 border-l-4"
                style={{ borderLeftColor: "#f59e0b", backgroundColor: "#fffbeb" }}
              >
                <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "#d97706" }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: "#92400e" }}>
                    {d.device_name} ({d.location}) hasn't synced in {isError ? "several hours" : staleTime}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#b45309" }}>
                    {d.last_sync
                      ? `Last successful sync at ${new Date(d.last_sync).toLocaleTimeString()}. Device may be offline.`
                      : "Device has never synced."}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setTroubleshootDevice(d)}
                >
                  Troubleshoot
                </Button>
              </Card>
            );
          })}

          {/* Devices table */}
          <Card className="bg-surface border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    {["Device", "Location", "Last Sync", "Status"].map((c) => (
                      <th
                        key={c}
                        className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors"
                      style={{ height: 52 }}
                    >
                      <td className="px-4 py-3">
                        <button
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                          onClick={() => openDetail(d)}
                        >
                          {d.device_name}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm">{d.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{timeAgo(d.last_sync)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Add device button */}
          {isHrOrSuperAdmin && (
            <div className="flex justify-start">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4" /> Add New Device
              </Button>
            </div>
          )}
        </>
      )}

      {/* Face Check-In tab */}
      {mainTab === "face" && (
        <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-200">
          {isHrOrSuperAdmin ? (
            <>
              {/* HR/Admin Face Management Panel */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ScanFace className="h-5 w-5 text-blue-600" />
                    Employee Face Enrollment
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Register and manage employee Face IDs for biometric attendance
                  </p>
                </div>

                {/* Search box */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employee or department..."
                    className="pl-9 text-xs h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Employee Face ID Table */}
              <Card className="bg-surface border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {["EMPLOYEE", "EMAIL", "ROLE", "REGISTRATION DATE", "ACTIONS"].map((col) => (
                          <th key={col} className="text-left px-6 py-3.5">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingFaces ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                            <span className="text-xs text-gray-400 mt-2 block">Loading biometric signatures...</span>
                          </td>
                        </tr>
                      ) : employeeList.filter(emp => {
                        const q = searchQuery.toLowerCase();
                        return (
                          emp.name.toLowerCase().includes(q) ||
                          emp.email.toLowerCase().includes(q) ||
                          (emp.department && emp.department.toLowerCase().includes(q)) ||
                          (emp.designation && emp.designation.toLowerCase().includes(q))
                        );
                      }).map((emp) => {
                        const enrolledAt = registeredFaceIds[emp.id];
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5 font-semibold text-gray-900">
                              {emp.name}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-gray-600">
                              {emp.email}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-gray-600 capitalize">
                              {emp.role || "employee"}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-gray-500">
                              {(() => {
                                if (!enrolledAt) return "—";
                                const date = new Date(enrolledAt);
                                const formattedDate = date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                }); // e.g. "09 Jun 2026"
                                const formattedTime = date.toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true
                                }).toLowerCase(); // e.g. "11:52 am"
                                return `${formattedDate}, ${formattedTime}`;
                              })()}
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={enrolledAt ? "outline" : "default"}
                                  className={enrolledAt ? "text-xs font-semibold text-gray-700 border-gray-200" : "text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"}
                                  onClick={() => setSelectedEmpForTraining(emp)}
                                >
                                  {enrolledAt ? "Re-train Face" : "Train Face ID"}
                                </Button>
                                {enrolledAt && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                                    onClick={() => handleDeleteFace(emp)}
                                  >
                                    Delete Face
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!loadingFaces && employeeList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs">
                            No employees found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Training Modal */}
              {selectedEmpForTraining && (
                <Modal onClose={() => setSelectedEmpForTraining(null)}>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Biometric Face Trainer</h3>
                      <p className="text-xs text-gray-500">
                        Training: <strong className="text-blue-600">{selectedEmpForTraining.name}</strong>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEmpForTraining(null)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Note Banner */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 mb-4 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <p>
                      You are registering Face ID on behalf of <strong className="font-semibold">{selectedEmpForTraining.name}</strong>. Ask the employee to look at the camera.
                    </p>
                  </div>
                  
                  <div className="max-w-[400px] mx-auto py-2">
                    <FaceRegister
                      employee={selectedEmpForTraining}
                      onSuccess={async () => {
                        showToast(`Face ID registered for ${selectedEmpForTraining.name}!`, "success");
                        await fetchFaceData();
                        setTimeout(() => setSelectedEmpForTraining(null), 1500);
                      }}
                    />
                  </div>
                </Modal>
              )}
            </>
          ) : (
            <>
              {/* Employee View */}
              <div className="max-w-[800px] mx-auto space-y-6">
                <Card className="p-6 bg-white border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 grid place-items-center shrink-0">
                      <ScanFace className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Face ID Attendance Check-in</h3>
                      <p className="text-xs text-gray-500">Verify your attendance using face biometrics</p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                    <p className="font-semibold flex items-center gap-1">
                      <Info className="h-4 w-4 shrink-0 text-amber-600" />
                      Face Check-In Location Moved
                    </p>
                    <p>
                      Daily biometric attendance logging has been moved to your centralized **Attendance Logs** page.
                      This ensures you can see your daily attendance records and stats side-by-side with the scanner.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => navigate({ to: "/attendance-logs" })}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold"
                    >
                      Go to Attendance Logs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate({ to: "/profile" })}
                      className="text-xs font-semibold"
                    >
                      View Profile Enrollment
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Device Detail Modal */}
      {detailDevice && (
        <Modal onClose={() => setDetailDevice(null)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">{detailDevice.device_name}</h2>
              <p className="text-sm text-muted-foreground">{detailDevice.location}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDetailDevice(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
            {(["overview", "sync", "users"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  detailTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "overview" ? "Overview" : t === "sync" ? "Sync History" : "Users"}
              </button>
            ))}
          </div>

          {detailTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "IP Address", value: detailDevice.ip_address || "—", icon: Globe },
                  { label: "Last Sync", value: timeAgo(detailDevice.last_sync), icon: Clock },
                  {
                    label: "Status",
                    value: detailDevice.status.charAt(0).toUpperCase() + detailDevice.status.slice(1),
                    icon: CheckCircle,
                  },
                  { label: "Created", value: new Date(detailDevice.created_at).toLocaleDateString(), icon: Calendar },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted"
                  >
                    <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </div>
                      <div className="text-sm font-semibold">{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    syncDevice(detailDevice);
                    setDetailDevice(null);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Sync Now
                </Button>
                {isHrOrSuperAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => deactivateDevice(detailDevice.id)}
                    >
                      Deactivate
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {detailTab === "sync" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-border">
                    {["Synced At", "Punches Pulled", "Status", "Error"].map((c) => (
                      <th
                        key={c}
                        className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-xs">{new Date(l.synced_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs font-semibold">{formatCount(l.punches_pulled)}</td>
                      <td className="px-3 py-2 text-xs">
                        <StatusBadge status={l.status === "success" ? "online" : "error"} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {l.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                  {syncLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No sync logs yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === "users" && (
            <div className="text-center py-8 text-muted-foreground">
              <Fingerprint className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">User-level enrollment details not yet available</p>
            </div>
          )}
        </Modal>
      )}

      {/* Troubleshoot Modal */}
      {troubleshootDevice && (
        <Modal onClose={() => setTroubleshootDevice(null)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Troubleshoot {troubleshootDevice.device_name}</h2>
            <Button variant="ghost" size="icon" onClick={() => setTroubleshootDevice(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label: "Device registered in system", done: true },
              { label: `Network connectivity (ping ${troubleshootDevice.ip_address || "N/A"})`, done: false },
              { label: "Last sync within 2 hours", done: troubleshootDevice.last_sync ? Date.now() - new Date(troubleshootDevice.last_sync).getTime() < 7200000 : false },
              { label: "Punch data flowing", done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted">
                {step.done ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <HelpCircle className="h-5 w-5 text-amber-500 shrink-0" />
                )}
                <span className="text-sm">{step.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Common fixes
            </h3>
            <ul className="space-y-1.5">
              {[
                "Check network cable / WiFi connection",
                `Verify IP address ${troubleshootDevice.ip_address || "N/A"} is reachable`,
                "Restart device via admin panel",
                "Contact IT support if issue persists",
              ].map((fix, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                syncDevice(troubleshootDevice);
                setTroubleshootDevice(null);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Force Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => markResolved(troubleshootDevice)}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Mark as Resolved
            </Button>
          </div>
        </Modal>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Add New Device</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Device Name
              </label>
              <Input
                placeholder="e.g. BIO-X-01"
                value={addForm.device_name}
                onChange={(e) => setAddForm({ ...addForm, device_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Location
              </label>
              <Input
                placeholder="e.g. Bengaluru · Zone B · Floor 2"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                IP Address
              </label>
              <Input
                placeholder="e.g. 192.168.1.100"
                value={addForm.ip_address}
                onChange={(e) => setAddForm({ ...addForm, ip_address: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={addDevice} className="flex-1">
                <Plus className="h-4 w-4 mr-1.5" /> Save Device
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
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
    </PageContainer>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    online: { bg: "#dcfce7", text: "#166534", label: "Synced" },
    offline: { bg: "#fee2e2", text: "#991b1b", label: "Offline" },
    syncing: { bg: "#dbeafe", text: "#1e40af", label: "Syncing" },
    error: { bg: "#ffedd5", text: "#9a3412", label: "Error" },
  };
  const s = map[status] || { bg: "#f1f5f9", text: "#475569", label: status };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      ● {s.label}
    </span>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        {children}
      </div>
    </div>
  );
}
