import { useEffect, useState } from "react";
import { swapFaces } from "../api/client";
import { ImageUploader } from "../components/ImageUploader";

export interface SwapPageProps {
  swapperAvailable: boolean;
  swapperError?: string | null;
}

export function SwapPage({ swapperAvailable, swapperError }: SwapPageProps) {
  const [source, setSource] = useState<File | null>(null);
  const [target, setTarget] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const run = async () => {
    if (!source || !target) return;
    setLoading(true);
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    try {
      const blob = await swapFaces(source, target);
      setResultUrl(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "swap failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      {!swapperAvailable && (
        <div className="panel">
          <div className="error">
            Swap is disabled. {swapperError ?? ""}
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Place <code>inswapper_128.onnx</code> in <code>backend/data/models/</code> and restart the server.
          </div>
        </div>
      )}
      <div className="panel">
        <h2>Face Swap</h2>
        <div className="row">
          <div className="col">
            <label>Source (face to copy)</label>
            <ImageUploader file={source} onChange={setSource} />
          </div>
          <div className="col">
            <label>Target (image to paste face onto)</label>
            <ImageUploader file={target} onChange={setTarget} />
          </div>
          <div className="col">
            <div className="stack">
              <button className="btn" disabled={!source || !target || loading || !swapperAvailable} onClick={run}>
                {loading ? "Swapping…" : "Swap face"}
              </button>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        </div>
      </div>
      {resultUrl && (
        <div className="panel">
          <h2>Result</h2>
          <img src={resultUrl} alt="swap result" style={{ maxWidth: "100%", borderRadius: 6 }} />
          <div style={{ marginTop: 10 }}>
            <a className="btn secondary" href={resultUrl} download="swapped.png">
              Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
