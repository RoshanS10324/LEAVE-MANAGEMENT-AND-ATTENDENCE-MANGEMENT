import * as faceapi from "face-api.js";

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  const MODEL_URL = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function captureFaceDescriptor(videoElement: HTMLVideoElement, timeoutMs = 15000) {
  await loadModels();

  const startTime = Date.now();

  while (true) {
    const detection = await faceapi
      .detectSingleFace(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection && detection.detection.score >= 0.5) {
      return {
        descriptor: detection.descriptor,
        score: detection.detection.score,
        landmarks: detection.landmarks
      };
    }

    if (Date.now() - startTime > timeoutMs) {
      if (!detection) {
        throw new Error("No face detected. Look directly at the camera.");
      } else {
        throw new Error("Low confidence. Improve lighting and try again.");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function captureMultipleSamples(videoElement: HTMLVideoElement, sampleCount = 3) {
  // Capture multiple samples and average them for better accuracy
  const descriptors: Float32Array[] = [];
  for (let i = 0; i < sampleCount; i++) {
    await new Promise(r => setTimeout(r, 300));
    const result = await captureFaceDescriptor(videoElement);
    descriptors.push(result.descriptor);
  }
  // Average the descriptors
  const averaged = new Float32Array(128);
  for (let i = 0; i < 128; i++) {
    averaged[i] = descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length;
  }
  return averaged;
}

export async function verifyFaceLocally(videoElement: HTMLVideoElement, savedDescriptorArray: any) {
  // Used as fallback when Supabase RPC is slow
  const result = await captureFaceDescriptor(videoElement);
  const saved = new Float32Array(Object.values(savedDescriptorArray));
  const distance = faceapi.euclideanDistance(result.descriptor, saved);
  const confidence = parseFloat(((1 - distance) * 100).toFixed(1));
  return {
    match: distance <= 0.5,
    confidence,
    distance: parseFloat(distance.toFixed(4)),
    error: distance > 0.5
      ? `Face not recognized (${confidence}% match). Try better lighting.`
      : null
  };
}

export function startWebcam(videoElement: HTMLVideoElement) {
  return navigator.mediaDevices
    .getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
        frameRate: { ideal: 30 }
      }
    })
    .then(stream => {
      videoElement.srcObject = stream;
      return stream;
    })
    .catch(err => {
      if (err.name === "NotAllowedError")
        throw new Error("Camera permission denied. Please allow camera access in browser settings.");
      if (err.name === "NotFoundError")
        throw new Error("No camera found. Please connect a webcam.");
      throw new Error("Camera error: " + err.message);
    });
}

export function stopWebcam(streamOrVideo: MediaStream | HTMLVideoElement | null) {
  if (!streamOrVideo) return;
  if (streamOrVideo instanceof HTMLVideoElement) {
    if (streamOrVideo.srcObject) {
      const stream = streamOrVideo.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      streamOrVideo.srcObject = null;
    }
  } else {
    streamOrVideo.getTracks().forEach((t) => t.stop());
  }
}

export function drawFaceBox(canvas: HTMLCanvasElement | null, detection: any, color = "#16a34a") {
  if (!canvas || !detection) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const { x, y, width, height } = detection.detection.box;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  // Corner accents
  const cl = 15;
  ctx.lineWidth = 3;
  [
    [x, y, x + cl, y, x, y + cl],
    [x + width - cl, y, x + width, y, x + width, y + cl],
    [x, y + height - cl, x, y + height, x + cl, y + height],
    [x + width - cl, y + height, x + width, y + height, x + width, y + height - cl],
  ].forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  });
}

export function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}
