import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import KpiCard from "@/components/common/KpiCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { IconDrop, IconThermometer, IconWind } from "@/components/common/icons";
import { useApi } from "@/hooks/useApi";
import { getEnvironmentalData, getEnvironmentSummary, getRiskModelInfo } from "@/services/api";
import { aqiBand, fmtInt } from "@/utils/format";

const PAGE_SIZE = 12;

const PIPELINE_STEPS = [
  "Patient record loaded from the patients table",
  "Clinical features selected (age, BP, glucose, …)",
  "Feature preprocessing (boolean encoding, pulse-pressure derivation, median imputation)",
  "HospitalRiskModel inference (RandomForest probability)",
  "Probability mapped to LOW / MODERATE / HIGH via thresholds",
];

/**
 * Environment section.
 * The former "Average AQI by day" chart was replaced by a model-oriented
 * "Model Context / Risk Factors" section explaining what the AI risk system
 * actually uses. Environmental data itself (grids + measurements) is intact.
 */
export default function Environment() {
  const summary = useApi(getEnvironmentSummary, []);
  const records = useApi(() => getEnvironmentalData({ limit: 500 }), []);
  const modelInfo = useApi(getRiskModelInfo, []);
  const [gridFilter, setGridFilter] = useState("all");
  const [page, setPage] = useState(0);

  const gridIds = useMemo(
    () => Array.from(new Set((summary.data ?? []).map((s) => s.grid_id))).sort(),
    [summary.data],
  );

  const kpis = useMemo(() => {
    const items = (summary.data ?? []).filter((s) => s.average_aqi != null);
    if (items.length === 0) return null;
    const avgAqi =
      items.reduce((sum, s) => sum + (s.average_aqi ?? 0), 0) / items.length;
    const maxTemp = Math.max(
      ...items.map((s) => s.average_temperature_c ?? -Infinity),
    );
    const totalRain = items.reduce((sum, s) => sum + s.total_rainfall_mm, 0);
    const totalRecords = items.reduce((sum, s) => sum + s.records, 0);
    return { avgAqi, maxTemp, totalRain, totalRecords };
  }, [summary.data]);

  const filteredRows = useMemo(() => {
    const list = [...(records.data ?? [])];
    const filtered =
      gridFilter === "all"
        ? list
        : list.filter((r) => r.grid_id === gridFilter);
    return filtered.sort((a, b) =>
      b.recorded_date.localeCompare(a.recorded_date),
    );
  }, [records.data, gridFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount - 1);
  const pageRows = filteredRows.slice(
    effectivePage * PAGE_SIZE,
    effectivePage * PAGE_SIZE + PAGE_SIZE,
  );

  const metrics = modelInfo.data?.metrics?.metrics;
  const importance = modelInfo.data?.metrics?.feature_importance ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environment"
        subtitle="Air quality, temperature and rainfall across health grids"
      />

      {summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : !kpis ? (
        summary.loading ? (
          <LoadingState rows={3} label="Loading environmental overview…" />
        ) : null
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            delay={0}
            label="Average AQI"
            value={String(Math.round(kpis.avgAqi))}
            badge={{
              label: aqiBand(kpis.avgAqi).label,
              className: aqiBand(kpis.avgAqi).badgeClass,
            }}
            hint="Across monitored grid zones · synthetic demo data"
            icon={<IconWind />}
            tone="sky"
          />
          <KpiCard
            delay={0.05}
            label="Highest avg temp"
            value={`${kpis.maxTemp.toFixed(1)}\u00B0C`}
            hint="Mean daily temperature, warmest zone"
            icon={<IconThermometer />}
            tone="amber"
          />
          <KpiCard
            delay={0.1}
            label="Total rainfall"
            value={`${fmtInt(Math.round(kpis.totalRain))} mm`}
            hint="Cumulative across all zones"
            icon={<IconDrop />}
            tone="accent"
          />
          <KpiCard
            delay={0.15}
            label="Environmental Records"
            value={fmtInt(kpis.totalRecords)}
            hint={`${gridIds.length} grid zones monitored`}
            icon={<IconWind />}
            tone="violet"
          />
        </div>
      )}

      {/* MODEL CONTEXT / RISK FACTORS (replaces the AQI trend chart) */}
      <SectionCard
        title="Model Context · Risk Factors"
        subtitle="What the AI risk system actually uses — real model metadata, not fabricated"
      >
        {modelInfo.error ? (
          <ErrorState message={modelInfo.error} onRetry={modelInfo.refetch} />
        ) : !modelInfo.data?.available ? (
          <EmptyState
            title="Model unavailable"
            message={modelInfo.data?.reason ?? "Risk model artifacts not found."}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* MODEL OVERVIEW */}
            <div className="rounded-xl border border-line p-4">
              <p className="panel-title">Model overview</p>
              <dl className="mt-3 space-y-1.5 text-xs">
                {[
                  ["Model name", String(modelInfo.data.model_name ?? "HospitalRiskModel")],
                  ["Version", String(modelInfo.data.model_version ?? "—")],
                  ["Task", "Patient risk classification"],
                  ["Output", "Risk probability + LOW / MODERATE / HIGH"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="muted mt-3 text-[10px] leading-relaxed">
                {modelInfo.data.disclaimer}
              </p>
            </div>

            {/* INPUT FEATURES */}
            <div className="rounded-xl border border-line p-4">
              <p className="panel-title">Input features used ({modelInfo.data.feature_count})</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(modelInfo.data.feature_columns ?? []).map((f) => (
                  <span key={f} className="badge-slate text-[10px]">
                    {f}
                  </span>
                ))}
              </div>
              <p className="muted mt-3 text-[10px] leading-relaxed">
                Exactly the columns the trained artifact consumes — no more, no less.
              </p>
            </div>

            {/* HOW THE MODEL WORKS */}
            <div className="rounded-xl border border-line p-4">
              <p className="panel-title">How the model works</p>
              <ol className="mt-3 space-y-2 text-xs">
                {PIPELINE_STEPS.map((step, i) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line bg-raised text-[10px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* CREDENTIALS / PERFORMANCE */}
            <div className="rounded-xl border border-line p-4">
              <p className="panel-title">Model credentials / performance</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Algorithm", String(modelInfo.data.model_type ?? "—")],
                  ["Estimators", String(modelInfo.data.n_estimators ?? "—")],
                  [
                    "Training data",
                    `Synthetic patients (${modelInfo.data.metrics?.training_rows ?? "—"} train / ${modelInfo.data.metrics?.test_rows ?? "—"} test)`,
                  ],
                  ["Accuracy", metrics ? String(metrics.accuracy) : "—"],
                  ["Precision (macro)", metrics ? String(metrics.precision_macro) : "—"],
                  ["Recall (macro)", metrics ? String(metrics.recall_macro) : "—"],
                  ["F1 (macro)", metrics ? String(metrics.f1_macro) : "—"],
                  [
                    "ROC AUC (macro OVR)",
                    metrics?.roc_auc_macro_ovr != null ? String(metrics.roc_auc_macro_ovr) : "—",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-line px-2.5 py-2">
                    <dt className="muted text-[10px] uppercase tracking-wide">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* FACTOR EXPLANATION */}
            <div className="rounded-xl border border-line p-4 lg:col-span-2">
              <p className="panel-title">Factor explanation</p>
              {importance.length === 0 ? (
                <p className="muted mt-2 text-xs">
                  Feature importance is not available from the trained artifact.
                </p>
              ) : (
                <>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {importance.slice(0, 6).map((f) => {
                      const pct = Math.round(f.importance * 100);
                      return (
                        <li key={f.feature} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="truncate">{f.feature.replace(/_/g, " ")}</span>
                            <span className="tabular-nums muted">{pct}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(100, pct * 5)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="muted mt-3 text-[11px] leading-relaxed">
                    Higher heart rate, age, glucose and cholesterol push the predicted risk up —
                    these are the model's own learned importances from training. Environmental
                    severity (zone AQI) is only applied as a documented 15% contextual nudge
                    after clinical inference, never as a model input.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Grid summaries" subtitle="Aggregated per health grid">
        {summary.error ? (
          <ErrorState message={summary.error} onRetry={summary.refetch} />
        ) : !summary.data ? (
          <LoadingState rows={4} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.data.map((item) => {
              const band = aqiBand(item.average_aqi);
              return (
                <div
                  key={item.grid_id}
                  className="rounded-xl border border-line p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{item.grid_id}</p>
                    <span className={band.badgeClass}>{band.label}</span>
                  </div>
                  <p className="muted mt-0.5 text-xs">{item.district}</p>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="muted">Avg AQI</dt>
                      <dd className="tabular-nums font-medium">
                        {item.average_aqi == null ? "–" : Math.round(item.average_aqi)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="muted">Avg temp</dt>
                      <dd className="tabular-nums font-medium">
                        {item.average_temperature_c == null
                          ? "–"
                          : `${item.average_temperature_c.toFixed(1)}\u00B0C`}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="muted">Rainfall</dt>
                      <dd className="tabular-nums font-medium">
                        {fmtInt(Math.round(item.total_rainfall_mm))} mm
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="muted">Records</dt>
                      <dd className="tabular-nums font-medium">{item.records}</dd>
                    </div>
                  </dl>
                  {item.first_recorded_date && item.last_recorded_date && (
                    <p className="muted mt-3 text-[10px] uppercase tracking-wide">
                      {item.first_recorded_date} → {item.last_recorded_date}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Recorded measurements"
        subtitle={`${filteredRows.length} records`}
        action={
          <select
            value={gridFilter}
            onChange={(e) => {
              setGridFilter(e.target.value);
              setPage(0);
            }}
            className="input-base h-8 w-40 text-xs"
          >
            <option value="all">All grids</option>
            {gridIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        }
        bodyClassName="p-0"
      >
        {records.error ? (
          <div className="p-5">
            <ErrorState message={records.error} onRetry={records.refetch} />
          </div>
        ) : !records.data ? (
          <div className="p-5">
            <LoadingState rows={6} />
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState title="No records" message="No environmental measurements found." />
        ) : (
          <>
            <div className="overflow-x-auto px-5 pb-4 pt-4">
              <table className="data-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Grid</th>
                    <th>AQI</th>
                    <th>Temperature</th>
                    <th>Rainfall</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((record) => {
                    const band = aqiBand(record.aqi);
                    return (
                      <tr key={record.environment_id}>
                        <td>{record.recorded_date}</td>
                        <td className="font-medium">{record.grid_id}</td>
                        <td>
                          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${band.dotClass}`} />
                          <span className="tabular-nums">{record.aqi}</span>
                          <span className="muted ml-2 text-xs">{band.label}</span>
                        </td>
                        <td className="tabular-nums">{record.temperature_c.toFixed(1) + "\u00B0C"}</td>
                        <td className="tabular-nums">{record.rainfall_mm.toFixed(1)} mm</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <p className="muted text-xs">
                Page {effectivePage + 1} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={effectivePage === 0}
                  className="btn-ghost h-8 text-xs"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={effectivePage >= pageCount - 1}
                  className="btn-ghost h-8 text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <p className="muted text-center text-[11px]">
        Synthetic demonstration environmental data - not live AQI. Values are displayed as recorded; no forecasts or predictions are generated.
      </p>
    </div>
  );
}
