import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "../lib/supabaseClient";
import {
  loadModels,
  captureFaceDescriptor,
  startWebcam,
  stopWebcam,
  drawFaceBox,
  clearCanvas,
} from "../utils/faceApi";
import {
  verifyFaceDescriptor,
  checkFaceRegistered,
} from "../utils/faceStorage";
import {
  calculateStatus,
  calculateCheckout,
  formatHours,
} from "../utils/attendanceCalculator";
import * as faceapi from "face-api.js";

type ScanStatus = "idle" | "scanning" | "verifying" | "success" | "failed";

type Toast = { id: number; message: string; type: "success" | "warning" | "error" | "info" };

let toastSeq = 0;

export default function FaceCheckin({
  employee,
  onAttendanceUpdate,
}: {
  employee: any;
  onAttendanceUpdate: (att?: any) => void;
}) {
  const [mode, setMode] = useState<"checkin" | "checkout" | "complete">("checkin");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [faceRegistered, setFaceRegistered] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [confidence, setConfidence] = useState(0);
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const scanStatusRef = useRef(scanStatus);
  useEffect(() => {
    scanStatusRef.current = scanStatus;
  }, [scanStatus]);

  function showToast(message: string, type: Toast["type"] = "info") {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }

  useEffect(() => {
    if (!employee?.id) return;
    init();

    function onVisible() {
      if (document.visibilityState === "visible") {
        checkFaceRegistered(employee!.id).then((r) => setFaceRegistered(r.registered));
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(animRef.current);
      stopWebcam(videoRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [employee?.id]);

  async function init() {
    const today = new Date().toISOString().slice(0, 10);

    const [attResult, shiftResult, faceResult] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("emp_id", employee.id)
        .eq("date", today)
        .maybeSingle(),
      supabase.from("shifts").select("*").eq("id", employee.shift_id).maybeSingle(),
      checkFaceRegistered(employee.id),
    ]);

    const record = attResult.data;
    setTodayRecord(record);
    setShift(shiftResult.data);
    setFaceRegistered(faceResult.registered);

    if (!record || !record.check_in) {
      setMode("checkin");
    } else if (record.check_in && !record.check_out) {
      setMode("checkout");
    } else {
      setMode("complete");
    }

    try {
      await loadModels();
      setModelsLoaded(true);
    } catch {
      console.error("Failed to load face-api models");
    }

    if (onAttendanceUpdate) onAttendanceUpdate(record);
  }

  function startDetectionLoop() {
    let scanY = 0;
    async function detect() {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || !streamRef.current) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      const ctx = c.getContext("2d")!;
      try {
        const detection = await faceapi
          .detectSingleFace(
            v,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks();

        ctx.clearRect(0, 0, c.width, c.height);

        // Draw scanning sweep line if we are scanning
        if (scanStatusRef.current === "scanning") {
          // Scanning line gradient
          const gradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
          gradient.addColorStop(0, "transparent");
          gradient.addColorStop(0.5, "#16a34a");
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, scanY - 20, c.width, 40);
          scanY = (scanY + 3) % c.height;
        }

        if (detection) {
          setFaceDetected(true);
          drawFaceBox(c, detection, "#22c55e");
        } else {
          setFaceDetected(false);
          // Draw scanning frame
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(4, 4, c.width - 8, c.height - 8);
          ctx.setLineDash([]);
        }
      } catch (e) {
        // ignore detection failure
      }
      animRef.current = requestAnimationFrame(detect);
    }
    animRef.current = requestAnimationFrame(detect);
  }

  async function handleScan() {
    if (!faceRegistered) {
      showToast('Register your Face ID first in My Profile → Face ID Registration', 'error')
      return
    }

    setScanStatus('scanning')
    setErrorMsg('')

    try {
      setPermissionError(null);
      let stream;
      try {
        stream = await startWebcam(videoRef.current!);
        streamRef.current = stream;
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.message?.includes("denied") || err.message?.includes("permission")) {
          setPermissionError(err.message || "Camera permission denied");
        }
        throw err;
      }

      startDetectionLoop();

      // Give user time to align
      await new Promise((r) => setTimeout(r, 2000));

      setScanStatus('verifying')
      cancelAnimationFrame(animRef.current);

      // Capture live face from camera
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current!,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor()

      // Stop camera and tracking loop
      cancelAnimationFrame(animRef.current);
      stopWebcam(videoRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const c = canvasRef.current;
      if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);

      if (!detection) {
        setScanStatus('failed')
        setErrorMsg('No face detected. Look directly at the camera.')
        return
      }

      // STRICT VERIFY: only checks against employee.id — never other employees
      const result = await verifyFaceDescriptor(
        employee.id,
        detection.descriptor
      )

      if (!result.match) {
        setScanStatus('failed')
        setErrorMsg(result.error || 'Face not recognized for this account.')

        // Log failed attempt
        try {
          await supabase.from('audit_logs').insert({
            user_id: employee.id,
            action: 'FACE_VERIFY_FAILED',
            entity: 'attendance',
            new_value: {
              confidence: result.confidence,
              distance: result.distance,
              reason: result.error,
              attempted_at: new Date().toISOString()
            }
          })
        } catch (_) {}

        return
      }

      setConfidence(result.confidence);

      // Verified — proceed with check-in or check-out
      setScanStatus('success')
      if (mode === 'checkin') {
        await doCheckin(result.confidence, "face_id")
      } else {
        await doCheckout(result.confidence, "face_id")
      }

    } catch (err: any) {
      cancelAnimationFrame(animRef.current);
      stopWebcam(videoRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const c = canvasRef.current;
      if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);

      setScanStatus('failed')
      setErrorMsg(err.message || 'Scan failed. Please try again.')
    }
  }

  async function doCheckin(conf: number, method: string) {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const today = now.toISOString().slice(0, 10);
    const { isLate, lateByMins, status: attStatus } = calculateStatus(timeStr, shift);

    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        {
          emp_id: employee.id,
          date: today,
          check_in: timeStr,
          status: attStatus,
          is_late: isLate,
          face_verified: true,
          face_confidence: conf,
          source: "face_id",
        },
        { onConflict: "emp_id,date" },
      )
      .select("*")
      .single();

    if (error) throw error;

    // Insert into biometric_punches
    const punchRes = await supabase.from("biometric_punches").insert({
      emp_id: employee.id,
      punch_time: new Date().toISOString(),
      punch_type: "in",
      processed: true,
      raw_data: {
        method,
        confidence: conf,
        source: "face_id",
      },
    });
    if (punchRes.error) {
      console.error("Failed to insert biometric punch:", punchRes.error);
    }

    const auditPayload = {
      user_id: employee.id,
      action: "CHECK_IN",
      entity_type: "attendance",
      details: { time: timeStr, is_late: isLate, late_by_mins: lateByMins, confidence: conf, method },
      // backwards compatibility
      entity: "attendance",
      new_value: { time: timeStr, is_late: isLate, late_by_mins: lateByMins, confidence: conf, method }
    };
    try { await supabase.from("audit_logs").insert(auditPayload); } catch (_) {}

    setTodayRecord(data || { ...todayRecord, check_in: timeStr, status: attStatus, is_late: isLate });
    setMode("checkout");

    const msg = isLate
      ? `Checked in at ${timeStr} — Late by ${lateByMins} min(s)`
      : `Checked in at ${timeStr} ✓`;
    showToast(msg, isLate ? "warning" : "success");
    if (onAttendanceUpdate) onAttendanceUpdate();
  }

  async function doCheckout(conf: number, method: string) {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const today = now.toISOString().slice(0, 10);
    const { totalHours, overtimeHours, isEarlyLeave, earlyByMins } = calculateCheckout(
      todayRecord?.check_in,
      timeStr,
      shift,
    );

    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_out: timeStr,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        early_leave: isEarlyLeave,
        face_verified: true,
        face_confidence: conf,
      })
      .eq("emp_id", employee.id)
      .eq("date", today)
      .select("*")
      .single();

    if (error) throw error;

    // Insert into biometric_punches
    const punchRes = await supabase.from("biometric_punches").insert({
      emp_id: employee.id,
      punch_time: new Date().toISOString(),
      punch_type: "out",
      processed: true,
      raw_data: {
        method,
        confidence: conf,
        source: "face_id",
      },
    });
    if (punchRes.error) {
      console.error("Failed to insert biometric punch:", punchRes.error);
    }

    const auditPayload = {
      user_id: employee.id,
      action: "CHECK_OUT",
      entity_type: "attendance",
      details: {
        time: timeStr,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        early_leave: isEarlyLeave,
        early_by_mins: earlyByMins,
        method,
      },
      // backwards compatibility
      entity: "attendance",
      new_value: {
        time: timeStr,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        early_leave: isEarlyLeave,
        early_by_mins: earlyByMins,
        method,
      },
    };
    try { await supabase.from("audit_logs").insert(auditPayload); } catch (_) {}

    setTodayRecord(data || { ...todayRecord, check_out: timeStr, total_hours: totalHours });
    setMode("complete");

    let msg = `Checked out at ${timeStr} · ${formatHours(totalHours)} worked`;
    if (overtimeHours > 0) msg += ` · OT: ${formatHours(overtimeHours)}`;
    if (isEarlyLeave) msg += ` · Early leave (${earlyByMins} mins early)`;
    showToast(msg, "success");
    if (onAttendanceUpdate) onAttendanceUpdate();
  }

  function formatTimeDisplay(timeStr: string | null) {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  const statusInfo = todayRecord?.check_in
    ? calculateStatus(todayRecord.check_in, shift)
    : null;
  const checkoutInfo =
    todayRecord?.check_in && todayRecord?.check_out
      ? calculateCheckout(todayRecord.check_in, todayRecord.check_out, shift)
      : null;
  const totalHours = checkoutInfo?.totalHours || 0;
  const expectedHours = shift?.working_hours || 9;
  const progressPct = Math.min(100, (totalHours / expectedHours) * 100);
  const progressColor =
    progressPct >= 100
      ? "bg-emerald-500"
      : progressPct >= 50
      ? "bg-blue-500"
      : "bg-amber-400";

  const todayDateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[55fr_45fr] gap-6">
        {/* LEFT COLUMN */}
        <div>
          <h2 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            Biometric Face Check-In
          </h2>

          <div className="relative mb-4">
            {permissionError ? (
              <div className="w-full rounded-xl border border-red-500 bg-red-50/10 p-4 text-xs" style={{ maxWidth: 340, aspectRatio: "4/3", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xl mb-1">🚫</span>
                  <h4 className="font-bold text-red-700 mb-1">
                    Camera Access Required
                  </h4>
                  <p className="text-gray-500 mb-2">
                    LeaveFlow needs camera permission for Face ID attendance check.
                  </p>
                </div>
                
                <div className="bg-white p-2 rounded border border-red-100 space-y-0.5 text-left text-[11px]">
                  <p className="font-semibold text-gray-700">Step-by-step fix guide:</p>
                  <p className="text-gray-600">1. Click camera icon 🎥 in URL bar</p>
                  <p className="text-gray-600">2. Select "Allow" and refresh</p>
                  
                  <div className="border-t border-red-100 pt-1 mt-1">
                    <p className="font-semibold text-red-700">Browser Guide:</p>
                    <p className="text-gray-600 italic">
                      {(() => {
                        const ua = navigator.userAgent.toLowerCase();
                        if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome: Click 🎥 icon in address bar → Allow";
                        if (ua.includes("firefox")) return "Firefox: Click lock icon → Permissions → Allow";
                        if (ua.includes("edg")) return "Edge: Click camera icon → Allow";
                        return "Allow camera in browser settings";
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    className="flex-1 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                    onClick={() => {
                      setPermissionError(null);
                      handleScan();
                    }}
                  >
                    Retry
                  </button>
                  <button
                    className="flex-1 py-1.5 border border-gray-300 rounded font-medium hover:bg-gray-50 text-gray-700 bg-white"
                    onClick={() => window.open("https://support.google.com/chrome/answer/2693767", "_blank")}
                  >
                    Help
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-xl border-2 border-gray-200 bg-black"
                  style={{ maxWidth: 340, aspectRatio: "4/3" }}
                />
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={255}
                  className="absolute top-0 left-0 rounded-xl pointer-events-none"
                  style={{ maxWidth: 340, aspectRatio: "4/3" }}
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm mb-4 min-h-[24px]">
            {scanStatus === "idle" && (
              <>
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-gray-500">Click scan button to start</span>
              </>
            )}
            {scanStatus === "scanning" && (
              <>
                <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-blue-600 font-medium">
                  {faceDetected ? "Face detected - analyzing landmarks..." : "Align your face in the camera frame..."}
                </span>
              </>
            )}
            {scanStatus === "verifying" && (
              <>
                <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-blue-600 font-medium">Verifying matching face vector in DB...</span>
              </>
            )}
            {scanStatus === "success" && (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 font-medium">
                  Identity verified ✓ ({confidence}% match)
                </span>
              </>
            )}
            {scanStatus === "failed" && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '12px 16px', marginTop: 10, width: '100%'
              }}>
                <div style={{ color: '#991b1b', fontWeight: 600, fontSize: 14 }}>
                  ✗ Face Verification Failed
                </div>
                <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>
                  {errorMsg}
                </div>
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
                  Only {employee?.name}'s registered face can access this account.
                </div>
                <button
                  onClick={() => { setScanStatus('idle'); setErrorMsg('') }}
                  style={{
                    marginTop: 10, padding: '8px 16px',
                    background: '#185FA5', color: 'white',
                    border: 'none', borderRadius: 8,
                    fontSize: 13, cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {mode === "checkin" && (scanStatus === "scanning" || scanStatus === "verifying" ? (
              <button
                onClick={() => { cancelAnimationFrame(animRef.current); stopWebcam(videoRef.current); if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } setScanStatus("idle"); setErrorMsg(""); }}
                className="w-full h-12 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>✕</span> Cancel Scan
              </button>
            ) : (
              <button
                onClick={handleScan}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>▶</span> Start Check-In Scan
              </button>
            ))}
            {mode === "checkout" && (scanStatus === "scanning" || scanStatus === "verifying" ? (
              <button
                onClick={() => { cancelAnimationFrame(animRef.current); stopWebcam(videoRef.current); if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } setScanStatus("idle"); setErrorMsg(""); }}
                className="w-full h-12 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>✕</span> Cancel Scan
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to check out? This will mark your attendance as complete for today.")) {
                    handleScan();
                  }
                }}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>◼</span> Start Check-Out Scan
              </button>
            ))}
            {mode === "complete" && (
              <>
                <div className="w-full h-12 bg-gray-100 text-gray-400 font-semibold rounded-xl flex items-center justify-center text-sm cursor-not-allowed">
                  Attendance Complete for Today ✓
                </div>
                <button
                  onClick={async () => {
                    await supabase
                      .from("attendance")
                      .update({ check_in: null, check_out: null, total_hours: null, overtime_hours: null, early_leave: false, is_late: false, status: null })
                      .eq("emp_id", employee.id)
                      .eq("date", new Date().toISOString().slice(0, 10));
                    setTodayRecord(null);
                    setMode("checkin");
                    showToast("Today's attendance reset. You can check in again.", "info");
                  }}
                  className="w-full mt-2 py-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Re-check-in (testing)
                </button>
              </>
            )}

            <div className="flex items-center gap-2 text-xs">
              {faceRegistered ? (
                <>
                  <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-emerald-600 font-medium">Face Vector Registered</span>
                </>
              ) : faceRegistered === false ? (
                <div style={{
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: 10, padding: '12px 16px', marginTop: 10,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12, width: '100%'
                }}>
                  <div>
                    <div style={{ color: '#92400e', fontWeight: 600, fontSize: 13 }}>
                      ⚠ Face ID Not Registered
                    </div>
                    <div style={{ color: '#b45309', fontSize: 12, marginTop: 2 }}>
                      Register your face in My Profile before scanning.
                      Each employee registers their own face only.
                    </div>
                  </div>
                  <button
                    onClick={() => navigate({ to: '/profile' })}
                    style={{
                      padding: '8px 14px', background: '#185FA5',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontSize: 12, cursor: 'pointer', flexShrink: 0
                    }}
                  >
                    Register Now →
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-1">Today's Summary</h3>
          <p className="text-xs text-gray-500 mb-3">{todayDateStr}</p>

          {shift && (
            <div className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full mb-4">
              <span>{shift.name}</span>
              <span>·</span>
              <span>
                {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Check-in</span>
              <span className={`font-semibold ${todayRecord?.check_in ? "text-blue-600" : "text-gray-400"}`}>
                {formatTimeDisplay(todayRecord?.check_in)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Check-out</span>
              <span className={`font-semibold ${todayRecord?.check_out ? "text-amber-600" : "text-gray-400"}`}>
                {formatTimeDisplay(todayRecord?.check_out)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Duration</span>
              <span className="font-semibold text-gray-900">
                {todayRecord?.check_out
                  ? formatHours(totalHours)
                  : "In progress..."}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status</span>
              {statusInfo ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    statusInfo.isLate
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  }`}
                >
                  {statusInfo.isLate ? `Late by ${statusInfo.lateByMins}m` : "On Time"}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>

          {todayRecord?.check_in && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress</span>
                <span className="font-semibold">
                  {formatHours(totalHours)} of {expectedHours}h expected
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {todayRecord && (
            <div className="mt-5 space-y-2">
              {todayRecord.is_late && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                  <span>🟠</span> Late by {statusInfo?.lateByMins || 0} mins
                </div>
              )}
              {todayRecord.early_leave && (
                <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">
                  <span>🟡</span> Early leave by {checkoutInfo?.earlyByMins || 0} mins
                </div>
              )}
              {todayRecord.overtime_hours > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                  <span>🟢</span> Overtime: {formatHours(todayRecord.overtime_hours)}
                </div>
              )}
              {todayRecord.face_verified && (
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                  <span>🔵</span> Face verified ({(todayRecord.face_confidence * 100).toFixed(0)}%)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2">
          {toasts.map((t) => {
            const colors: Record<string, string> = {
              success: "bg-emerald-600 text-white",
              warning: "bg-amber-500 text-white",
              error: "bg-red-600 text-white",
              info: "bg-blue-600 text-white",
            };
            return (
              <div
                key={t.id}
                className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${colors[t.type] || colors.info}`}
              >
                {t.message}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
