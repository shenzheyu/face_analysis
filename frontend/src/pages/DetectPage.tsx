import { useState } from "react";
import { detectFaces, type DetectResponse } from "../api/client";
import { ImageUploader } from "../components/ImageUploader";
import { FaceCanvas } from "../components/FaceCanvas";
import { ResultPanel } from "../components/ResultPanel";

export function DetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await detectFaces(file);
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
            <button className="btn" disabled={!file || loading} onClick={run}>
              {loading ? "Detecting…" : "Detect faces"}
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
              <pre className="result">{JSON.stringify(result.faces, null, 2)}</pre>
            )}
          </ResultPanel>
        </div>
      </div>
    </div>
  );
}
