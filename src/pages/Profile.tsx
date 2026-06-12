import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { startWebcam, stopWebcam, loadModels } from "../utils/faceApi";
import {
  saveFaceDescriptor,
  getFaceDescriptor,
  checkFaceRegistered,
} from "../utils/faceStorage";
import * as faceapi from "face-api.js";
import {
  Shield,
  Camera,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/lams/page";

type Status =
  | "idle"
  | "no_face"
  | "face_found"
  | "capturing"
  | "processing"
  | "saving"
  | "success"
  | "error";

export default function Profile() {
  const { employee, isAdminLevel, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cameraOn, setCameraOn] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [regStatus, setRegStatus] = useState<
    "idle" | "starting" | "loading_models" | "no_face" | "face_found" | "capturing" | "saving" | "success" | "error" | "permission_denied"
  >("idle");
  const [regError, setRegError] = useState("");
  const [showReRegister, setShowReRegister] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (!employee?.id) return;
    checkFaceRegistered(employee.id).then((result) => {
      setIsRegistered(result.registered);
      setRegisteredAt(result.registeredAt);
    });
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    fetchProfileData();
    return () => {
      stopCameraAndLoop();
    };
  }, [employee?.id]);

  async function fetchProfileData() {
    setLoading(true);
    const [empResult, faceResult, balanceResult] = await Promise.all([
      supabase
        .from("employees")
        .select("*, shifts(name, start_time, end_time)")
        .eq("id", employee!.id)
        .single(),
      supabase
        .from("face_descriptors")
        .select("id, created_at")
        .eq("emp_id", employee!.id)
        .maybeSingle(),
      supabase
        .from("leave_balances")
        .select("*, leave_types(name)")
        .eq("emp_id", employee!.id)
        .eq("year", new Date().getFullYear()),
    ]);
    if (empResult.data) setProfile(empResult.data);
    if (faceResult.data) {
      setIsRegistered(true);
      setRegisteredAt(faceResult.data.created_at);
    }
    if (balanceResult.data) setLeaveBalances(balanceResult.data);
    setLoading(false);
  }

  function stopCameraAndLoop() {
    isCapturingRef.current = true;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const cvs = canvasRef.current;
    if (cvs) cvs.getContext("2d")?.clearRect(0, 0, cvs.width, cvs.height);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function detectFace() {
    async function tick() {
      if (isCapturingRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (!isCapturingRef.current) animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      try {
        const det = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (isCapturingRef.current) return;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (det) {
              const { x, y, width, height } = det.detection.box;
              ctx.strokeStyle = "#16a34a";
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);
              setFaceDetected(true);
              setRegStatus("face_found");
            } else {
              setFaceDetected(false);
              setRegStatus("no_face");
            }
          }
        }
      } catch (_) {}

      if (!isCapturingRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }

  async function handleStartCamera() {
    setRegStatus("starting");
    setRegError("");
    try {
      const stream = await startWebcam(videoRef.current!);
      streamRef.current = stream;

      await new Promise<void>((resolve, reject) => {
        const v = videoRef.current!;
        v.onloadedmetadata = () => {
          v.play().then(() => resolve()).catch(reject);
        };
        setTimeout(() => reject(new Error("Video timeout")), 8000);
      });

      if (canvasRef.current && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
      }

      setRegStatus("loading_models");
      await loadModels();

      setCameraOn(true);
      isCapturingRef.current = false;
      setRegStatus("no_face");
      detectFace();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission") || err?.name === "NotAllowedError") {
        setRegStatus("permission_denied");
      } else {
        setRegStatus("error");
        setRegError(msg);
      }
    }
  }

  async function handleCaptureAndRegister() {
    isCapturingRef.current = true; // Just pause the drawing loop
    setFaceDetected(false);
    setRegStatus("capturing");

    try {
      await new Promise((r) => setTimeout(r, 600));

      const samples: Float32Array[] = [];
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const det = await faceapi
          .detectSingleFace(
            videoRef.current!,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!det) throw new Error("Face not detected during capture. Try again.");
        samples.push(det.descriptor);
      }

      // Now that we have the samples, kill the hardware stream
      stopCameraAndLoop();

      const averaged = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        averaged[i] = samples.reduce((sum, d) => sum + d[i], 0) / 3;
      }

      setRegStatus("saving");
      await saveFaceDescriptor(employee!.id, averaged, 86.0);

      const saved = await getFaceDescriptor(employee!.id);
      if (!saved) {
        throw new Error('Save failed — descriptor not found after saving. Try again.');
      }
      if (saved.emp_id !== employee!.id) {
        throw new Error('Critical: saved descriptor has wrong emp_id. Contact HR.');
      }
      console.log('[FaceRegister] Verified saved descriptor for:', employee!.id);

      try {
        await supabase.from("audit_logs").insert({
          user_id: employee!.id,
          action: "FACE_REGISTER",
          entity: "face_descriptors",
          new_value: { samples: 3, registered_at: new Date().toISOString() },
        });
      } catch (_) {}

      setCameraOn(false);
      setIsRegistered(true);
      setRegisteredAt(new Date().toISOString());
      setRegStatus("success");
      showToast("Face ID registered successfully!", "success");
    } catch (err: any) {
      setRegStatus("error");
      setRegError(err?.message || "Registration failed");
      isCapturingRef.current = false;
      if (streamRef.current) {
        setFaceDetected(false);
        setRegStatus("no_face");
        detectFace();
      }
    }
  }

  function handleCancel() {
    stopCameraAndLoop();
    setCameraOn(false);
    setFaceDetected(false);
    setRegStatus("idle");
    setRegError("");
  }

  async function updatePassword() {
    if (pwNew.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    if (pwNew !== pwConfirm) {
      showToast("Passwords do not match", "error");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Password updated successfully");
    setPwCurrent("");
    setPwNew("");
    setPwConfirm("");
  }

  async function signOutAll() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const roleColor: Record<string, string> = {
    super_admin: "bg-purple-500",
    hr: "bg-emerald-500",
    manager: "bg-blue-500",
    employee: "bg-gray-500",
  };

  const leaveColors: Record<string, string> = {
    Annual: "#185FA5",
    Sick: "#dc2626",
    Casual: "#d97706    ",
    "Comp Off": "#7c3aed",
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)
    : "U";

  if (loading || !profile) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="My Profile" />

      <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Profile summary */}
          <Card className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
            <div className="text-center">
              <div
                className={`h-16 w-16 rounded-full mx-auto grid place-items-center text-white text-xl font-bold ${
                  roleColor[profile.role] || "bg-gray-500"
                }`}
              >
                {initials}
              </div>
              <h2 className="text-lg font-bold mt-3">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.designation || "—"}</p>
              <p className="text-xs text-muted-foreground">{profile.department || "—"}</p>
            </div>
            <div className="space-y-2.5 mt-5">
              <div className="flex items-center gap-2 text-xs">
                <span>📧</span>
                <span className="text-muted-foreground">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>🏢</span>
                <span className="text-muted-foreground">{profile.department || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>💼</span>
                <span className="text-muted-foreground">{profile.designation || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>🔄</span>
                <span className="text-muted-foreground">
                  {profile.shifts
                    ? `${profile.shifts.name} · ${profile.shifts.start_time?.slice(0, 5)}–${profile.shifts.end_time?.slice(0, 5)}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>👤</span>
                <span
                  className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor:
                      profile.role === "super_admin"
                        ? "#fdf4ff"
                        : profile.role === "hr"
                          ? "#f0fdf4"
                          : profile.role === "manager"
                            ? "#eff6ff"
                            : "#f8fafc",
                    color:
                      profile.role === "super_admin"
                        ? "#7e22ce"
                        : profile.role === "hr"
                          ? "#166534"
                          : profile.role === "manager"
                            ? "#1e40af"
                            : "#475569",
                  }}
                >
                  {profile.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>📅</span>
                <span className="text-muted-foreground">
                  Joined{" "}
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-5 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
              onClick={() => setShowEditModal(true)}
            >
              Edit Profile
            </Button>
          </Card>

          {/* Leave balances */}
          <Card className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
            <h3 className="font-semibold text-sm mb-4">Leave Balances {new Date().getFullYear()}</h3>
            {leaveBalances.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No leave balance data</p>
            ) : (
              <div className="space-y-3">
                {leaveBalances.map((lb) => {
                  const pct = lb.total > 0 ? (lb.used / lb.total) * 100 : 0;
                  const color = leaveColors[lb.leave_types?.name] || "#185FA5";
                  return (
                    <div key={lb.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{lb.leave_types?.name}</span>
                        <span className="text-muted-foreground">
                          {lb.used}/{lb.total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Face ID Registration */}
          {profile?.role !== "super_admin" && (
            <Card className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
              <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Face ID Registration</h3>
              </div>
              {isRegistered && regStatus !== "success" ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>● Active</span>
              ) : regStatus !== "success" ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>● Not Registered</span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mb-4">Register your face for biometric attendance check-in and check-out</p>

            {/* --- SUCCESS STATE --- */}
            {isRegistered && regStatus === "success" && (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 mb-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-emerald-800 text-base">✓ Face ID Active for {profile?.name || employee?.name}</h4>
                <p className="text-sm text-emerald-600 mt-1">
                  Registered: {registeredAt ? new Date(registeredAt).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " at " + new Date(registeredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                </p>
                <p className="text-xs text-emerald-500 mt-2">
                  This Face ID only unlocks attendance for your account.<br/>
                  Other employees cannot use your face to check in.
                </p>
                <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setRegStatus("idle"); setShowReRegister(false); fetchProfileData(); }}>
                  Back to Profile
                </Button>
              </div>
            )}

            {/* --- ALREADY REGISTERED (IDLE) --- */}
            {isRegistered && regStatus === "idle" && (
              <>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Face ID is Active</p>
                    <p className="text-xs text-emerald-600">
                      Registered on {registeredAt ? new Date(registeredAt).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " at " + new Date(registeredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Check-In", value: "Enabled", color: "text-emerald-600" },
                    { label: "Check-Out", value: "Enabled", color: "text-emerald-600" },
                    { label: "Confidence", value: "High accuracy", color: "text-primary" },
                  ].map((item) => (
                    <Card key={item.label} className="p-3 text-center bg-surface-muted border-border/60">
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className={`text-xs font-semibold mt-1 ${item.color}`}>{item.value}</div>
                    </Card>
                  ))}
                </div>
                {profile?.role === "employee" ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                    <p className="text-xs text-muted-foreground">
                      Face ID locked for security. Please contact HR if you need to re-register your biometric data.
                    </p>
                  </div>
                ) : !showReRegister ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowReRegister(true)}>Re-register Face ID</Button>
                ) : (
                  <>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                      Re-registering will replace your current Face ID. You will need to scan again for attendance.
                    </p>
                    <Button className="w-full gap-2" onClick={handleStartCamera}>
                      <Camera className="h-4 w-4" /> Start Camera
                    </Button>
                    <Button variant="outline" className="w-full mt-2" onClick={() => setShowReRegister(false)}>Cancel</Button>
                  </>
                )}
              </>
            )}

            {/* --- NOT REGISTERED, CAMERA OFF --- */}
            {!isRegistered && !cameraOn && regStatus !== "success" && (
              <>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-xs text-amber-800">Face ID is required for biometric attendance check-in and check-out.</p>
                </div>
                <div className="space-y-1.5 mb-4 text-sm">
                  {["Allow camera access when prompted", "Position your face clearly in the frame", "Click Capture & Register"].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center shrink-0">{i + 1}</span>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full gap-2" onClick={handleStartCamera}>
                  <Camera className="h-4 w-4" /> Start Camera
                </Button>
              </>
            )}

            {/* --- PERMISSION DENIED --- */}
            {regStatus === "permission_denied" && (
              <div className="p-5 border border-red-200 bg-red-50 rounded-xl text-center mb-4">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-3">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <h4 className="font-semibold text-red-800 text-base">Camera Access Denied</h4>
                <div className="text-xs text-left space-y-1.5 mt-3 bg-white p-3 rounded-lg border border-red-100">
                  <p className="font-semibold text-muted-foreground mb-1.5">Step-by-step fix:</p>
                  {[
                    "Click the camera icon in your browser address bar",
                    'Select "Allow" for camera access',
                    "Refresh this page and try again",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-bold text-red-500 shrink-0 w-4">{i + 1}.</span>
                      <span className="text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1 gap-2" variant="default" onClick={handleStartCamera}>
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => window.open("https://support.google.com/chrome/answer/2693767", "_blank")}>
                    Learn More
                  </Button>
                </div>
              </div>
            )}

            {/* --- CAMERA FEED (always mounted so ref is available) --- */}
            <div className="relative w-full max-w-[480px] mx-auto rounded-xl overflow-hidden bg-surface-muted border-2 border-dashed border-border" style={{ aspectRatio: "4/3" }}>
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraOn ? "block" : "hidden"}`} />
              <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
              {!cameraOn && regStatus !== "starting" && regStatus !== "loading_models" && (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Camera not started</p>
                  </div>
                </div>
              )}
            </div>

            {/* --- STATUS + BUTTONS --- */}
            {(cameraOn || regStatus === "starting" || regStatus === "loading_models") && regStatus !== "permission_denied" && regStatus !== "success" && (
              <>
                {/* Status indicator */}
                <div className="flex items-center gap-2 mt-2.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    regStatus === "face_found"
                      ? "bg-emerald-500"
                      : regStatus === "error"
                        ? "bg-red-500"
                        : regStatus === "starting" || regStatus === "loading_models" || regStatus === "capturing" || regStatus === "saving"
                          ? "bg-blue-500 animate-pulse"
                          : "bg-muted-foreground"
                  }`} />
                  <span className={`text-xs font-medium ${
                    regStatus === "face_found"
                      ? "text-emerald-600"
                      : regStatus === "error"
                        ? "text-red-600"
                        : regStatus === "starting" || regStatus === "loading_models"
                          ? "text-blue-600"
                          : "text-muted-foreground"
                  }`}>
                    {regStatus === "starting" && "Starting camera..."}
                    {regStatus === "loading_models" && "Loading AI models..."}
                    {regStatus === "no_face" && "No face detected — look directly at the camera"}
                    {regStatus === "face_found" && "Face detected — ready to capture"}
                    {regStatus === "capturing" && "Capturing face samples..."}
                    {regStatus === "saving" && "Saving to database..."}
                    {regStatus === "error" && regError}
                  </span>
                  {(regStatus === "capturing" || regStatus === "saving") && (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  )}
                </div>

                {/* Capture controls */}
                {regStatus !== "capturing" && regStatus !== "saving" && (
                  <>
                    <Button
                      className="w-full mt-3 gap-2"
                      disabled={!faceDetected}
                      onClick={handleCaptureAndRegister}
                    >
                      <Camera className="h-4 w-4" />
                      Capture & Register Face
                    </Button>
                    <Button variant="outline" className="w-full mt-2" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <p className="text-center text-xs text-muted-foreground mt-1.5">
                      {faceDetected
                        ? "Face in frame — button is active"
                        : "Position your face in the frame to enable the button"}
                    </p>
                  </>
                )}

                {/* Progress indicator */}
                {(regStatus === "capturing" || regStatus === "saving") && (
                  <div className="w-full mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center text-sm font-medium text-emerald-700 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {regStatus === "capturing" ? "Capturing face samples — hold still" : "Saving Face ID to database..."}
                  </div>
                )}

                {/* Error retry */}
                {regStatus === "error" && !cameraOn && (
                  <Button className="w-full mt-3 gap-2" onClick={handleStartCamera}>
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                )}
              </>
            )}
          </Card>
          )}

          {/* Security & Account */}
          <Card className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
            <h3 className="font-semibold text-sm mb-4">Account & Security</h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <Input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <Input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-5 py-2.5 transition-all shadow-sm h-11" onClick={updatePassword}>
                Update Password
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span>💻</span>
                  <span>Current Session</span>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "#16a34a" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active now
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl mt-2 h-11"
                onClick={signOutAll}
              >
                Sign Out All Devices
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} showToast={showToast} />
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

function EditProfileModal({
  profile,
  onClose,
  showToast,
}: {
  profile: any;
  onClose: () => void;
  showToast: (msg: string, type?: string) => void;
}) {
  const [name, setName] = useState(profile.name || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [designation, setDesignation] = useState(profile.designation || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({ name, department: department || null, designation: designation || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Profile updated successfully");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100 p-6 md:p-8 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 h-11" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 h-11" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Designation</label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 h-11" />
          </div>
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <p className="text-sm font-medium text-slate-900">{profile.email}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Contact HR to change email</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</label>
            <p className="text-sm font-medium capitalize text-slate-900">{profile.role}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Contact Super Admin to change role</p>
          </div>
          <div className="flex gap-3 pt-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-5 py-2.5 transition-all shadow-sm h-11">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium border-slate-200 hover:bg-slate-50 text-slate-700 h-11">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
