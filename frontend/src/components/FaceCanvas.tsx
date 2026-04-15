import { useEffect, useRef } from "react";
import type { AnalyzedFace, DetectedFace } from "../api/client";

export interface FaceCanvasProps {
  file: File;
  faces: (DetectedFace | AnalyzedFace)[];
  width: number;
  height: number;
}

function isAnalyzed(f: DetectedFace | AnalyzedFace): f is AnalyzedFace {
  return "age" in f || "gender" in f;
}

export function FaceCanvas({ file, faces, width, height }: FaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = width || img.naturalWidth;
      const h = height || img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);

      ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 400));
      ctx.strokeStyle = "#4f8cff";
      ctx.fillStyle = "#4f8cff";
      ctx.font = `${Math.max(12, Math.round(h / 45))}px system-ui`;

      for (const f of faces) {
        const { x1, y1, x2, y2 } = f.bbox;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        for (const [kx, ky] of f.kps) {
          ctx.beginPath();
          ctx.arc(kx, ky, ctx.lineWidth * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        const labelParts: string[] = [`${(f.det_score * 100).toFixed(0)}%`];
        if (isAnalyzed(f)) {
          if (f.age !== null) labelParts.push(`${f.age}y`);
          if (f.gender) labelParts.push(f.gender);
        }
        const label = labelParts.join(" ");
        const tw = ctx.measureText(label).width + 10;
        const th = parseInt(ctx.font, 10) + 6;
        ctx.fillStyle = "rgba(15,17,21,0.9)";
        ctx.fillRect(x1, Math.max(0, y1 - th), tw, th);
        ctx.fillStyle = "#4f8cff";
        ctx.fillText(label, x1 + 5, Math.max(th - 6, y1 - 6));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, faces, width, height]);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}
