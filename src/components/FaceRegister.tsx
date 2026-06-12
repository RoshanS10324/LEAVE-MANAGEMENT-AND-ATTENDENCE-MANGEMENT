import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { loadModels, captureFaceDescriptor, startWebcam, stopWebcam } from "../utils/faceApi";
import { saveFaceDescriptor } from "../utils/faceStorage";
import * as faceapi from "face-api.js";

type Props = {
  employee: any;
  onSuccess?: () => void;
};

type Status =
  | "idle"
  | "loading_models"
  | "ready"
  | "capturing"
  | "saving"
  | "success"
  | "error";

export default function FaceRegister({ employee, onSuccess }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const detectingRef = useRef(false);

  useEffect(() => {
    if (!employee?.id) return;
    init();
    return () => {
      detectingRef.current = false;
      cancelAnimationFrame(animRef.current);
      stopWebcam(videoRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [employee?.id]);

  async function init() {
    const { data: existing } = await supabase
      .from("face_descriptors")
      .select("registered_at")
      .eq("emp_id", employee.id)
      .maybeSingle();

    if (existing) {
      setAlreadyRegistered(true);
      setRegisteredAt(existing.registered_at);
    }

    try {
      setStatus("loading_models");
      await loadModels();
      setModelsLoaded(true);

      const stream = await startWebcam(videoRef.current!);
      streamRef.current = stream;

      setStatus("ready");
      startFaceDetection();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize camera or models.");
      setStatus("error");
    }
  }

  function startFaceDetection() {
    detectingRef.current = true;
    async function detect() {
      if (!detectingRef.current) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;
      const ctx = c.getContext("2d")!;

      const detection = await faceapi
        .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!detectingRef.current) return;

      ctx.clearRect(0, 0, c.width, c.height);

      if (detection) {
        setFaceDetected(true);
        const box = detection.detection.box;
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
        ctx.fillRect(box.x, box.y, box.width, box.height);

        faceapi.draw.drawFaceLandmarks(c, detection);
      } else {
        setFaceDetected(false);

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        const w = c.width * 0.7;
        const h = c.height * 0.7;
        const x = (c.width - w) / 2;
        const y = (c.height - h) / 2;
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
        ctx.fillRect(x, y, w, h);
      }

      if (detectingRef.current) {
        animRef.current = requestAnimationFrame(detect);
      }
    }

    animRef.current = requestAnimationFrame(detect);
  }

  function stopFaceDetection() {
    detectingRef.current = false;
    cancelAnimationFrame(animRef.current);
  }

  async function handleRegister() {
    if (!videoRef.current) return;
    if (!modelsLoaded) {
      setErrorMsg("AI models not loaded yet. Please try again.");
      setStatus("error");
      return;
    }

    try {
      stopFaceDetection();
      setStatus("capturing");

      const { descriptor, score } = await captureFaceDescriptor(videoRef.current, 15000);

      setStatus("saving");

      await saveFaceDescriptor(employee.id, descriptor, Math.round(score * 100));

      await supabase.from("audit_logs").insert({
        user_id: employee.id,
        action: "FACE_REGISTER",
        entity: "face_descriptors",
        new_value: { registered_at: new Date().toISOString() },
      });

      stopWebcam(videoRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      cancelAnimationFrame(animRef.current);

      setStatus("success");
      setAlreadyRegistered(true);
      setRegisteredAt(new Date().toISOString());
      onSuccess?.();
    } catch (err: any) {
      console.error("Face registration error:", err);
      setErrorMsg(err?.message || "Registration failed. Please try again.");
      setStatus("error");
    }
  }

  function handleReregister() {
    setAlreadyRegistered(false);
    setStatus("loading_models");
    loadModels()
      .then(() => {
        setModelsLoaded(true);
        return startWebcam(videoRef.current!);
      })
      .then((stream) => {
        streamRef.current = stream;
        setStatus("ready");
        startFaceDetection();
      })
      .catch((err: any) => {
        setErrorMsg(err.message || "Failed to restart.");
        setStatus("error");
      });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-blue-50 grid place-items-center">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Face ID Registration</h3>
          <p className="text-xs text-gray-500">One-time biometric enrollment</p>
        </div>
      </div>

      {alreadyRegistered && status !== "success" && (
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <span className="text-emerald-600 text-sm">✓</span>
          <span className="text-sm text-emerald-700 font-medium">
            Face ID Active — Registered on{" "}
            {registeredAt
              ? new Date(registeredAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        </div>
      )}

      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-xl border-2 border-gray-200 bg-black"
          style={{ maxWidth: 320, aspectRatio: "4/3" }}
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="absolute top-0 left-0 rounded-xl pointer-events-none"
          style={{ maxWidth: 320, aspectRatio: "4/3" }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        {status === "idle" && <span className="text-gray-400">Initializing...</span>}
        {status === "loading_models" && (
          <>
            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-blue-600 font-medium">Loading AI models...</span>
          </>
        )}
        {status === "ready" && (
          faceDetected ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 font-medium">Face detected — ready to capture</span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              <span className="text-gray-500">No face detected — position yourself</span>
            </>
          )
        )}
        {status === "capturing" && (
          <>
            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-blue-600 font-medium">Capturing face data...</span>
          </>
        )}
        {status === "saving" && (
          <>
            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-blue-600 font-medium">Saving to database...</span>
          </>
        )}
        {status === "success" && (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-600 font-medium">Face ID registered successfully!</span>
          </>
        )}
        {status === "error" && (
          <>
            <span className="text-red-500 font-bold">✕</span>
            <span className="text-red-600 font-medium">{errorMsg}</span>
          </>
        )}
      </div>

      <div className="mt-5">
        {alreadyRegistered && status !== "success" ? (
          <button
            onClick={handleReregister}
            className="w-full py-2.5 px-4 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Re-register Face
          </button>
        ) : (
          <button
            onClick={handleRegister}
            disabled={status !== "ready" || !faceDetected}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {(status === "capturing" || status === "saving") && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === "capturing" || status === "saving"
              ? "Processing..."
              : "Register Face ID"}
          </button>
        )}
      </div>
    </div>
  );
}
