import type { ReactNode } from "react";

export interface ResultPanelProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  children?: ReactNode;
}

export function ResultPanel({ loading, error, empty, emptyText, children }: ResultPanelProps) {
  if (loading) return <div className="muted">Processing…</div>;
  if (error) return <div className="error">{error}</div>;
  if (empty) return <div className="muted">{emptyText ?? "No result yet."}</div>;
  return <>{children}</>;
}
