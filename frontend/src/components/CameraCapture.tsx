import { useCallback, useEffect, useRef, useState } from "react";

export interface CameraCaptureProps {
  onCapture: (file: File) => void;
  facingMode?: "user" | "environment";
}

export function CameraCapture({ onCapture, facingMode = "user" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API unavailable (needs HTTPS or localhost)");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "camera failed";
      setError(
        !window.isSecureContext
          ? "Camera requires HTTPS (use localhost, SSH tunnel, or Cloudflare Tunnel)"
          : msg,
      );
    } finally {
      setStarting(false);
    }
  }, [facingMode]);

  useEffect(() => {
    const v = videoRef.current;
    if (v && stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
    return () => {
      if (v) v.srcObject = null;
    };
  }, [stream]);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture]);

  if (!stream) {
    return (
      <div className="stack">
        <button className="btn" onClick={start} disabled={starting}>
          {starting ? "Starting camera…" : "Enable camera"}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="stack">
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: "100%", borderRadius: 6, background: "#000", display: "block" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={capture}>Capture</button>
        <button className="btn secondary" onClick={stop}>Stop camera</button>
      </div>
    </div>
  );
}
