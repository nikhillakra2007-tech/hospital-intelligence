import { Link } from "react-router-dom";
import type { RiskPredictionRow, RiskModelInfo } from "@/types";
import { cx, fmtInt, fmtScore } from "@/utils/format";

interface AiModelStatusCardProps {
  info: RiskModelInfo | null;
  predictions: RiskPredictionRow[];
  compact?: boolean;
}

export default function AiModelStatusCard({
  info,
  predictions,
  compact = false,
}: AiModelStatusCardProps) {
  const active = (info?.available ?? false) && predictions.length > 0;
  const avg =
    predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.risk_score, 0) / predictions.length
      : null;
  const high = predictions.filter((p) => p.risk_level === "HIGH").length;
  const scoredAt = predictions.length > 0 ? new Date().toLocaleTimeString() : "—";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 text-xs">
        <span
          className={cx(
            "inline-flex items-center gap-1.5 font-semibold",
            active ? "text-accent" : "muted",
          )}
        >
          <span
            className={cx(
              "inline-block h-2 w-2 animate-pulse rounded-full",
              active ? "bg-[rgb(var(--accent))]" : "bg-ink-faint",
            )}
          />
          AI RISK MODEL: {active ? "ACTIVE" : "OFFLINE"}
        </span>
        {active && (
          <>
            <span>
              <span className="muted">Scored: </span>
              <span className="tabular-nums font-medium">{fmtInt(predictions.length)}</span>
            </span>
            <span>
              <span className="muted">Avg score: </span>
              <span className="tabular-nums font-medium">{fmtScore(avg)}</span>
            </span>
            <span>
              <span className="muted">High: </span>
              <span className="tabular-nums font-medium text-accent">{fmtInt(high)}</span>
            </span>
            <Link to="/risk" className="ml-auto text-accent hover:underline">
              Model details →
            </Link>
          </>
        )}
        {!active && <span className="muted ml-auto">Model artifacts missing — see /api/risk/model-info</span>}
      </div>
    );
  }

  return (
    <div className="card card-pad space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="panel-title">AI risk model</p>
        <span className={cx("badge", active ? "badge-emerald" : "badge-slate")}>
          {active ? "ACTIVE" : "OFFLINE"}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ["Assessments scored", fmtInt(predictions.length)],
          ["Avg risk score", fmtScore(avg)],
          ["High-risk detected", fmtInt(high)],
          ["Model version", String(info?.model_version ?? "—")],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line px-2.5 py-2">
            <dt className="muted text-[10px] uppercase tracking-wide">{k}</dt>
            <dd className="mt-0.5 tabular-nums font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="muted text-[10px] uppercase tracking-wide">
        Last scoring run: {scoredAt} · inference via FastAPI /api/risk/predictions
      </p>
    </div>
  );
}
