import { useCallback, useEffect, useState } from "react";
import {
  compareFaces,
  deleteFace,
  enrollFace,
  listFaces,
  searchFace,
  type FaceRecordOut,
  type SearchResponse,
} from "../api/client";
import { FaceCanvas } from "../components/FaceCanvas";
import { ImageUploader } from "../components/ImageUploader";
import { CameraCapture } from "../components/CameraCapture";
import { LiveSearch } from "../components/LiveSearch";

export function RecognizePage() {
  return (
    <div className="stack">
      <EnrollSection />
      <SearchSection />
      <CompareSection />
      <RosterSection />
    </div>
  );
}

function EnrollSection() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const run = async () => {
    if (!file || !name.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await enrollFace(file, name.trim());
      setMsg({ ok: true, text: `Enrolled "${r.name}" (${r.id.slice(0, 8)}…)` });
      setFile(null);
      setName("");
      window.dispatchEvent(new CustomEvent("face-db-changed"));
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "enroll failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Enroll</h2>
      <div className="row">
        <div className="col">
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button
              className={`tab${mode === "upload" ? " active" : ""}`}
              onClick={() => { setMode("upload"); setFile(null); }}
            >
              Upload
            </button>
            <button
              className={`tab${mode === "camera" ? " active" : ""}`}
              onClick={() => { setMode("camera"); setFile(null); }}
            >
              Camera
            </button>
          </div>
          {mode === "upload" ? (
            <ImageUploader file={file} onChange={setFile} label="Upload a clear face photo" />
          ) : (
            <>
              <CameraCapture onCapture={setFile} />
              {previewUrl && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Captured frame:</div>
                  <img src={previewUrl} alt="captured" style={{ width: "100%", borderRadius: 6 }} />
                </div>
              )}
            </>
          )}
        </div>
        <div className="col">
          <div className="stack">
            <div>
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" />
            </div>
            <button className="btn" disabled={!file || !name.trim() || loading} onClick={run}>
              {loading ? "Enrolling…" : "Enroll face"}
            </button>
            {msg && <div className={msg.ok ? "success" : "error"}>{msg.text}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchSection() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "camera" | "live">("upload");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await searchFace(file, 3));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Search (1:N)</h2>
      <div className="row">
        <div className="col">
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button
              className={`tab${mode === "upload" ? " active" : ""}`}
              onClick={() => { setMode("upload"); setFile(null); setResult(null); }}
            >
              Upload
            </button>
            <button
              className={`tab${mode === "camera" ? " active" : ""}`}
              onClick={() => { setMode("camera"); setFile(null); setResult(null); }}
            >
              Camera
            </button>
            <button
              className={`tab${mode === "live" ? " active" : ""}`}
              onClick={() => { setMode("live"); setFile(null); setResult(null); }}
            >
              Live
            </button>
          </div>
          {mode === "upload" && (
            <ImageUploader file={file} onChange={(f) => { setFile(f); setResult(null); }} label="Upload query photo" />
          )}
          {mode === "camera" && (
            <>
              <CameraCapture onCapture={(f) => { setFile(f); setResult(null); }} />
              {previewUrl && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Captured frame:</div>
                  <img src={previewUrl} alt="captured" style={{ width: "100%", borderRadius: 6 }} />
                </div>
              )}
            </>
          )}
          {mode === "live" && <LiveSearch />}
          {mode !== "live" && (
            <button className="btn" disabled={!file || loading} onClick={run} style={{ marginTop: 10 }}>
              {loading ? "Searching…" : "Search"}
            </button>
          )}
          {error && <div className="error">{error}</div>}
        </div>
        <div className="col">
          {mode !== "live" && result && file && (
            <>
              <FaceCanvas file={file} faces={result.faces} width={result.width} height={result.height} />
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {result.faces.length} face(s) detected · threshold={result.threshold}
              </div>
              <div className="stack" style={{ marginTop: 10 }}>
                {result.faces.map((f, i) => {
                  const top = f.hits[0];
                  const recognized = top && top.similarity >= result.threshold;
                  return (
                    <div key={i} style={{ padding: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <strong>Face #{i + 1}</strong>
                        <span className={recognized ? "success" : "muted"} style={{ fontSize: 12 }}>
                          {recognized ? `${top.name} ${top.similarity.toFixed(3)} ✓` : top ? `best: ${top.name} ${top.similarity.toFixed(3)}` : "no matches"}
                        </span>
                      </div>
                      {f.hits.length > 0 && (
                        <ul className="face-list">
                          {f.hits.map((h) => {
                            const above = h.similarity >= result.threshold;
                            return (
                              <li key={h.id}>
                                <span>{h.name}</span>
                                <span className={above ? "success" : "muted"}>
                                  {h.similarity.toFixed(3)} {above ? "✓" : ""}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {mode !== "live" && result && result.faces.length === 0 && (
            <div className="muted">No face detected in the image.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareSection() {
  const [a, setA] = useState<File | null>(null);
  const [b, setB] = useState<File | null>(null);
  const [result, setResult] = useState<{ similarity: number; is_same: boolean; threshold: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!a || !b) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await compareFaces(a, b));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "compare failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Compare (1:1)</h2>
      <div className="row">
        <div className="col">
          <label>Image A</label>
          <ImageUploader file={a} onChange={setA} />
        </div>
        <div className="col">
          <label>Image B</label>
          <ImageUploader file={b} onChange={setB} />
        </div>
        <div className="col">
          <div className="stack">
            <button className="btn" disabled={!a || !b || loading} onClick={run}>
              {loading ? "Comparing…" : "Compare"}
            </button>
            {error && <div className="error">{error}</div>}
            {result && (
              <div className={result.is_same ? "success" : "muted"}>
                similarity = {result.similarity.toFixed(3)} (threshold {result.threshold}){" "}
                → {result.is_same ? "SAME" : "different"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RosterSection() {
  const [records, setRecords] = useState<FaceRecordOut[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listFaces();
      setRecords(r.records);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("face-db-changed", onChange);
    return () => window.removeEventListener("face-db-changed", onChange);
  }, [refresh]);

  const remove = async (id: string) => {
    await deleteFace(id);
    refresh();
  };

  return (
    <div className="panel">
      <h2>
        Enrolled faces <span className="muted">({records.length})</span>
        <button className="btn secondary" onClick={refresh} disabled={loading} style={{ float: "right", padding: "4px 12px", fontSize: 12 }}>
          refresh
        </button>
      </h2>
      {records.length === 0 ? (
        <div className="muted">No faces enrolled yet.</div>
      ) : (
        <ul className="face-list">
          {records.map((r) => (
            <li key={r.id}>
              <span>
                {r.name}{" "}
                <span className="muted" style={{ fontSize: 11 }}>
                  {r.id.slice(0, 8)}… · {new Date(r.created_at * 1000).toLocaleString()}
                </span>
              </span>
              <button className="btn danger" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => remove(r.id)}>
                delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
