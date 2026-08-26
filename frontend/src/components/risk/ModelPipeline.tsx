import type { RiskModelInfo } from "@/types";
import { cx } from "@/utils/format";

interface ModelPipelineProps {
  info: RiskModelInfo | null;
  compact?: boolean;
}

/**
 * Compact visual pipeline reflecting the real inference path:
 * patients table → clinical features → feature engineering (boolean encoding,
 * pulse-pressure derivation, median imputation) → RandomForest → probability
 * → thresholded LOW/MODERATE/HIGH decision.
 */
const STAGES = [
  { key: "data", label: "Patient Data", detail: "patients table" },
  { key: "features", label: "Clinical Features", detail: "10 raw clinical inputs" },
  { key: "engineering", label: "Feature Engineering", detail: "pulse pressure · encoding" },
  { key: "model", label: "HospitalRiskModel", detail: "RandomForest 300 trees" },
  { key: "score", label: "Risk Probability", detail: "0 – 1 score" },
  { key: "decision", label: "Risk Level", detail: "LOW / MODERATE / HIGH" },
];

function StageNode({
  stage,
  index,
}: {
  stage: (typeof STAGES)[number];
  index: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <div
        className={cx(
          "flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold tabular-nums",
          index === 3
            ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 text-accent"
            : "border-line bg-raised text-ink-soft",
        )}
      >
        {index + 1}
      </div>
      <p className="text-[11px] font-semibold leading-tight">{stage.label}</p>
      <p className="muted text-[10px] leading-tight">{stage.detail}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-start pt-4" aria-hidden>
      <span className="text-ink-faint">→</span>
    </div>
  );
}

export default function ModelPipeline({ info, compact = true }: ModelPipelineProps) {
  void info;
  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-4">
      <div className="flex flex-wrap items-start gap-x-1 gap-y-4">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex min-w-0 flex-1 items-start gap-1">
            <StageNode stage={stage} index={i} />
            {i < STAGES.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
      {!compact && (
        <p className="muted mt-3 text-center text-[10px] uppercase tracking-wide">
          Patient data → Features → ML model → Risk score → Decision
        </p>
      )}
    </div>
  );
}
