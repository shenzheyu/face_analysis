import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "./api/client";
import { DetectPage } from "./pages/DetectPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { RecognizePage } from "./pages/RecognizePage";

type Tab = "detect" | "analyze" | "recognize";

const TABS: { key: Tab; label: string }[] = [
  { key: "detect", label: "Detect" },
  { key: "analyze", label: "Analyze" },
  { key: "recognize", label: "Recognize" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("detect");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e) => setHealthErr(e instanceof Error ? e.message : "failed"));
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>Face Analysis</h1>
        <div className="health">
          {healthErr && <span className="chip err">backend offline: {healthErr}</span>}
          {health && (
            <>
              <span className={`chip ${health.provider === "CUDAExecutionProvider" ? "ok" : "warn"}`}>
                {health.provider === "CUDAExecutionProvider"
                  ? `GPU${health.device_id >= 0 ? ` #${health.device_id}` : ""}`
                  : "CPU"}
              </span>
              <span className="chip">{health.db_count} enrolled</span>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "detect" && <DetectPage />}
      {tab === "analyze" && <AnalyzePage />}
      {tab === "recognize" && <RecognizePage />}
    </div>
  );
}
