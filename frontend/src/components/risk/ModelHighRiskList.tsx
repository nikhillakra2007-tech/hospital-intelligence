import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { RiskPredictionRow } from "@/types";
import { EmptyState } from "@/components/common/states";
import { cx, fmtScore } from "@/utils/format";

interface ModelHighRiskListProps {
  predictions: RiskPredictionRow[];
  limit?: number;
  compact?: boolean;
}

const LEVEL_BADGE: Record<string, string> = {
  HIGH: "badge-red",
  MODERATE: "badge-amber",
  LOW: "badge-emerald",
};

export default function ModelHighRiskList({
  predictions,
  limit,
  compact = false,
}: ModelHighRiskListProps) {
  const rows = useMemo(() => {
    const high = predictions.filter((p) => p.risk_level === "HIGH");
    return limit ? high.slice(0, limit) : high;
  }, [predictions, limit]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No high-risk predictions"
        message="The model currently predicts no patients in the HIGH band."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[560px]">
        <thead>
          <tr>
            <th>Patient</th>
            {!compact && <th>District</th>}
            {!compact && <th>Hospital</th>}
            <th>Model risk score</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.patient_id}>
              <td>
                <Link to="/patients" className="text-accent font-medium hover:underline">
                  {row.patient_id}
                </Link>
              </td>
              {!compact && <td>{row.district}</td>}
              {!compact && (
                <td className="max-w-[220px] truncate">{row.hospital_name ?? "—"}</td>
              )}
              <td>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-xs">{fmtScore(row.risk_score)}</span>
                  <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-line-soft sm:inline-block">
                    <span
                      className="block h-full rounded-full bg-[rgb(var(--tone-high))]"
                      style={{
                        width: `${Math.round(
                          Math.min(1, Math.max(0, row.risk_score)) * 100,
                        )}%`,
                      }}
                    />
                  </span>
                </div>
              </td>
              <td>
                <span className={cx(LEVEL_BADGE[row.risk_level] ?? "badge-slate")}>
                  {row.risk_level}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
