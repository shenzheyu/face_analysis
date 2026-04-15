import { useState } from "react";
import { analyzeFaces, type AnalyzeResponse } from "../api/client";
import { ImageUploader } from "../components/ImageUploader";
import { FaceCanvas } from "../components/FaceCanvas";
import { ResultPanel } from "../components/ResultPanel";

export function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [includeEmb, setIncludeEmb] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await analyzeFaces(file, includeEmb);
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="col">
        <div className="panel">
          <h2>Input</h2>
          <div className="stack">
            <ImageUploader file={file} onChange={(f) => { setFile(f); setResult(null); }} />
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={includeEmb}
                onChange={(e) => setIncludeEmb(e.target.checked)}
              />
              include 512-d embedding
            </label>
            <button className="btn" disabled={!file || loading} onClick={run}>
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>
      </div>
      <div className="col">
        <div className="panel">
          <h2>Result {result && <span className="muted">({result.faces.length} face(s))</span>}</h2>
          <ResultPanel loading={loading} error={error} empty={!result}>
            {result && file && (
              <FaceCanvas file={file} faces={result.faces} width={result.width} height={result.height} />
            )}
            {result && (
              <ul className="face-list" style={{ marginTop: 12 }}>
                {result.faces.map((f, i) => (
                  <li key={i}>
                    <span>Face #{i + 1}</span>
                    <span className="muted">
                      {f.age ?? "?"}y · {f.gender ?? "?"} · score {f.det_score.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ResultPanel>
        </div>
      </div>
    </div>
  );
}
