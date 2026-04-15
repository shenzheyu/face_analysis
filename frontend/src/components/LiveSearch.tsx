import { useCallback, useEffect, useRef, useState } from "react";
import { recognizeStream, type StreamResponse } from "../api/client";

const MAX_FRAME_SIDE = 640;
const JPEG_QUALITY = 0.75;

interface Recent {
  name: string;
  similarity: number;
  ts: number;
}

export function LiveSearch() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const inFlightRef = useRef(false);
  const cancelRef = useRef(false);
  const lastFrameTs = useRef(0);
  const frameCount = useRef(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [result, setResult] = useState<StreamResponse | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API unavailable (needs HTTPS or localhost)");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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
  }, []);

  const stop = useCallback(() => {
    cancelRef.current = true;
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setResult(null);
    setLatencyMs(null);
    setFps(0);
  }, [stream]);

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

  useEffect(() => {
    if (!stream) return;
    cancelRef.current = false;
    let timer: number | null = null;

    const tick = async () => {
      if (cancelRef.current) return;
      const v = videoRef.current;
      if (!v || !v.videoWidth || inFlightRef.current) {
        timer = window.setTimeout(tick, 80);
        return;
      }
      inFlightRef.current = true;
      try {
        if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
        const canvas = offscreenRef.current;
        const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, "image/jpeg", JPEG_QUALITY),
        );
        if (!blob) return;

        const t0 = performance.now();
        const r = await recognizeStream(blob);
        const dt = performance.now() - t0;
        if (cancelRef.current) return;
        setResult(r);
        setLatencyMs(dt);

        const now = performance.now();
        frameCount.current += 1;
        if (now - lastFrameTs.current >= 1000) {
          setFps(frameCount.current / ((now - lastFrameTs.current) / 1000));
          frameCount.current = 0;
          lastFrameTs.current = now;
        }

        const hits = r.faces
          .map((f) => f.hit)
          .filter((h): h is NonNullable<typeof h> => !!h && !!h.name && h.similarity >= r.threshold);
        if (hits.length > 0) {
          const ts = Date.now();
          setRecent((prev) => {
            const merged = [...hits.map((h) => ({ name: h.name!, similarity: h.similarity, ts })), ...prev];
            const dedup = new Map<string, Recent>();
            for (const r of merged) {
              const existing = dedup.get(r.name);
              if (!existing || existing.ts < r.ts) dedup.set(r.name, r);
            }
            return [...dedup.values()].sort((a, b) => b.ts - a.ts).slice(0, 8);
          });
        }
      } catch {
        // transient network / backend errors; skip this frame
      } finally {
        inFlightRef.current = false;
        if (!cancelRef.current) timer = window.setTimeout(tick, 30);
      }
    };
    lastFrameTs.current = performance.now();
    frameCount.current = 0;
    tick();
    return () => {
      cancelRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [stream]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!result) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    canvas.width = result.width;
    canvas.height = result.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 320));
    ctx.font = `${Math.max(12, Math.round(canvas.height / 30))}px system-ui`;
    for (const f of result.faces) {
      const { x1, y1, x2, y2 } = f.bbox;
      const hit = f.hit;
      const recognized = !!hit && !!hit.name && hit.similarity >= result.threshold;
      const unknown = !!hit && !recognized;
      const color = recognized ? "#3ddc97" : unknown ? "#ffb74a" : "#9aa3b2";
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const label = recognized
        ? `${hit!.name} ${hit!.similarity.toFixed(2)}`
        : unknown
        ? `unknown ${hit!.similarity.toFixed(2)}`
        : "no match";
      const tw = ctx.measureText(label).width + 10;
      const th = parseInt(ctx.font, 10) + 6;
      ctx.fillStyle = "rgba(15,17,21,0.85)";
      ctx.fillRect(x1, Math.max(0, y1 - th), tw, th);
      ctx.fillStyle = color;
      ctx.fillText(label, x1 + 5, Math.max(th - 6, y1 - 6));
    }
  }, [result]);

  if (!stream) {
    return (
      <div className="stack">
        <button className="btn" onClick={start} disabled={starting}>
          {starting ? "Starting camera…" : "Start live recognition"}
        </button>
        {error && <div className="error">{error}</div>}
        <div className="muted" style={{ fontSize: 12 }}>
          Camera stays on. Frames are downscaled to {MAX_FRAME_SIDE}px and sent ~5–10 Hz depending on GPU load.
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div style={{ position: "relative", width: "100%", lineHeight: 0 }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 6, background: "#000", display: "block" }} />
        <canvas
          ref={overlayRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn secondary" onClick={stop}>Stop</button>
        <span className="muted" style={{ fontSize: 12 }}>
          {latencyMs !== null ? `${latencyMs.toFixed(0)} ms` : "…"} · {fps.toFixed(1)} Hz
          {result && ` · ${result.faces.length} face(s)`}
        </span>
      </div>
      {recent.length > 0 && (
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Recent matches</div>
          <ul className="face-list">
            {recent.map((r) => (
              <li key={r.name}>
                <span>{r.name}</span>
                <span className="muted">
                  {r.similarity.toFixed(3)} · {Math.max(0, Math.round((Date.now() - r.ts) / 1000))}s ago
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
