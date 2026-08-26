import { useMemo } from "react";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import KpiCard from "@/components/common/KpiCard";
import ModelDistrictBars from "@/components/risk/ModelDistrictBars";
import ModelHighRiskList from "@/components/risk/ModelHighRiskList";
import AiModelStatusCard from "@/components/risk/AiModelStatusCard";
import RiskDistributionChart from "@/components/risk/RiskDistributionChart";
import { ErrorState, LoadingState, EmptyState } from "@/components/common/states";
import { IconHeart, IconPulse, IconUsers } from "@/components/common/icons";
import { useApi } from "@/hooks/useApi";
import { getHospitalCapacity, getRiskModelInfo, getRiskPredictions } from "@/services/api";
import type { RiskCategory } from "@/types";
import { fmtScore } from "@/utils/format";
import { geoLabel } from "@/utils/searchRanking";

export default function Risk() {
  const predictions = useApi(getRiskPredictions, []);
  const modelInfo = useApi(getRiskModelInfo, []);
  const capacity = useApi(getHospitalCapacity, []);

  const rows = predictions.data?.predictions ?? [];
  const distribution = useMemo(() => {
    const counts: Record<RiskCategory, number> = { Low: 0, Moderate: 0, High: 0 };
    for (const row of rows) {
      if (row.risk_level === "HIGH") counts.High += 1;
      else if (row.risk_level === "MODERATE") counts.Moderate += 1;
      else counts.Low += 1;
    }
    return counts;
  }, [rows]);

  const totalAssessments = rows.length;

  const concentration = useMemo(
    () =>
      [...(capacity.data ?? [])]
        .filter((r) => r.patient_count > 0)
        .sort(
          (a, b) =>
            (b.high_risk_predicted ?? 0) - (a.high_risk_predicted ?? 0) ||
            b.patient_count - a.patient_count,
        )
        .slice(0, 8),
    [capacity.data],
  );

  const categoryCards: Array<{
    category: RiskCategory;
    count: number;
    tone: "emerald" | "amber" | "red";
    icon: React.ReactNode;
  }> = [
    { category: "Low", count: distribution.Low, tone: "emerald", icon: <IconUsers /> },
    { category: "Moderate", count: distribution.Moderate, tone: "amber", icon: <IconPulse /> },
    { category: "High", count: distribution.High, tone: "red", icon: <IconHeart /> },
  ];

  if (predictions.loading && !predictions.data) {
    return (
      <>
        <PageHeader title="Risk Intelligence" subtitle="ML-predicted population risk" />
        <LoadingState rows={8} label="Running model inference…" />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Intelligence"
        subtitle="ML-generated risk predictions across the synthetic Delhi patient cohort"
        actions={
          modelInfo.data?.available ? (
            <span className="badge-emerald">
              {modelInfo.data.model_version} · live inference
            </span>
          ) : (
            <span className="badge-red">Model unavailable</span>
          )
        }
      />

      {predictions.error && !predictions.data ? (
        <ErrorState message={predictions.error} onRetry={predictions.refetch} />
      ) : (
        <>

          <AiModelStatusCard
            info={modelInfo.data}
            predictions={rows}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {categoryCards.map((card, index) => (
              <KpiCard
                key={card.category}
                delay={index * 0.06}
                label={`${card.category} risk`}
                value={String(card.count)}
                hint={
                  totalAssessments > 0
                    ? `${Math.round((card.count / totalAssessments) * 100)}% of predictions`
                    : undefined
                }
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="Predicted risk distribution"
              subtitle="Model output classes for every synthetic patient"
            >
              {distribution ? (
                <RiskDistributionChart
                  distribution={{
                    Low: distribution.Low,
                    Moderate: distribution.Moderate,
                    High: distribution.High,
                  }}
                  height={280}
                />
              ) : null}
            </SectionCard>

            <SectionCard
              className="xl:col-span-2"
              title="Predicted risk by district"
              subtitle="Model levels aggregated per patient district"
            >
              {rows.length === 0 ? (
                <p className="muted text-sm">No predictions available.</p>
              ) : (
                <ModelDistrictBars predictions={rows} />
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Highest predicted risk"
            subtitle="Ranked by HospitalRiskModel probability · synthetic patients"
          >
            <ModelHighRiskList predictions={rows} limit={15} />
          </SectionCard>

          <SectionCard
            title="High-risk concentration by hospital"
            subtitle="Where the model detects concentrated risk"
          >
            {capacity.error ? (
              <ErrorState message={capacity.error} onRetry={capacity.refetch} />
            ) : concentration.length === 0 ? (
              <EmptyState title="No linked patients yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[420px]">
                  <thead>
                    <tr>
                      <th>Hospital</th>
                      <th>Patients</th>
                      <th>AI high-risk</th>
                      <th>Avg AI score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concentration.map((row) => (
                      <tr key={row.hospital_id}>
                        <td className="max-w-[220px] truncate font-medium">
                          {row.hospital_name}
                          <span className="muted block truncate text-[10px] uppercase tracking-wide">
                            {geoLabel(row)}
                          </span>
                        </td>
                        <td className="tabular-nums">{row.patient_count}</td>
                        <td className="tabular-nums font-semibold text-accent">
                          {row.high_risk_predicted}
                        </td>
                        <td className="tabular-nums">
                          {row.avg_ml_score != null ? fmtScore(row.avg_ml_score) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {modelInfo.data?.metrics && (
            <SectionCard
              title="Model card"
              subtitle="Training transparency for this demonstration model"
            >
              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {[
                  ["Model", `${modelInfo.data.model_name} ${modelInfo.data.model_version}`],
                  ["Type", String(modelInfo.data.model_type)],
                  ["Features", String(modelInfo.data.feature_count)],
                  ["Estimators", String(modelInfo.data.n_estimators)],
                  ["Training rows", String(modelInfo.data.metrics?.training_rows ?? "—")],
                  ["Test rows", String(modelInfo.data.metrics?.test_rows ?? "—")],
                  [
                    "Accuracy",
                    String(modelInfo.data.metrics?.metrics?.accuracy ?? "—"),
                  ],
                  ["F1 (macro)", String(modelInfo.data.metrics?.metrics?.f1_macro ?? "—")],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-line px-3 py-2">
                    <dt className="muted text-[10px] uppercase tracking-wide">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="muted mt-3 text-[11px] leading-relaxed">
                Trained on the synthetic patient cohort with its recorded assessment
                labels as weak supervision. Demonstration only — not clinically
                validated.
              </p>
            </SectionCard>
          )}

          <p className="muted text-center text-[11px]">
            Predictions are generated by the HospitalRiskModel from synthetic patient
            features. Not for clinical use.
          </p>
        </>
      )}
    </div>
  );
}
