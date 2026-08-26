import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import KpiCard, { KpiSkeleton } from "@/components/common/KpiCard";
import SectionCard from "@/components/common/SectionCard";
import Modal from "@/components/common/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import HospitalFinder from "@/components/dashboard/HospitalFinder";
import ModelPipeline from "@/components/risk/ModelPipeline";
import DelhiHealthMap from "@/components/maps/DelhiHealthMap";
import {
  IconAlert,
  IconHeart,
  IconHospital,
  IconPulse,
  IconRefresh,
  IconUsers,
} from "@/components/common/icons";
import { useApi } from "@/hooks/useApi";
import {
  extractErrorMessage,
  getDashboardSummary,
  getDelhiMap,
  getHospitals,
  getHospitalCapacity,
  getRiskModelInfo,
  getRiskPredictions,
  runRiskAssessment,
} from "@/services/api";
import type { Hospital, RiskAssessmentRunResponse } from "@/types";
import { cx, fmtCoord, fmtInt, fmtScore } from "@/utils/format";
import { geoLabel, hospitalRiskMeta } from "@/utils/searchRanking";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const summary = useApi(getDashboardSummary, []);
  const riskPredictions = useApi(getRiskPredictions, []);
  const modelInfo = useApi(getRiskModelInfo, []);
  const delhiMap = useApi(getDelhiMap, []);
  const facilities = useApi(() => getHospitals({ limit: 700 }), []);
  const capacity = useApi(getHospitalCapacity, []);

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [finderQuery, setFinderQuery] = useState("");
  const [runState, setRunState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [runResult, setRunResult] = useState<RiskAssessmentRunResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const mapCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Live model output: the explicit run response wins over the initial fetch.
  const rows = useMemo(
    () => runResult?.predictions ?? riskPredictions.data?.predictions ?? [],
    [runResult, riskPredictions.data],
  );
  const lastRunAt = runResult?.generated_at ?? riskPredictions.data?.generated_at ?? null;

  const enriched = useMemo(
    () =>
      (facilities.data ?? []).map((f) => {
        const cap = capacity.data?.find((c) => c.hospital_id === f.hospital_id);
        return {
          ...f,
          patient_count: cap?.patient_count ?? 0,
          high_risk_count: cap?.high_risk_count ?? 0,
          high_risk_predicted: cap?.high_risk_predicted ?? 0,
          avg_ml_score: cap?.avg_ml_score ?? null,
        };
      }),
    [facilities.data, capacity.data],
  );

  const detailHospital = detailId
    ? (enriched.find((f) => f.hospital_id === detailId) ?? null)
    : null;

  const predictionLevels = useMemo(() => {
    const counts = { Low: 0, Moderate: 0, High: 0 };
    for (const row of rows) {
      if (row.risk_level === "HIGH") counts.High += 1;
      else if (row.risk_level === "MODERATE") counts.Moderate += 1;
      else counts.Low += 1;
    }
    return counts;
  }, [rows]);

  const avgScore = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.reduce((sum, r) => sum + r.risk_score, 0) / rows.length;
  }, [rows]);

  const highRiskCount = predictionLevels.High;
  const modelActive = (modelInfo.data?.available ?? false) && rows.length > 0;

  /** Focus the map on a hospital: select + smooth fly/zoom + auto popup. */
  function focusOnMap(hospitalId: string) {
    const hospital = enriched.find((f) => f.hospital_id === hospitalId);
    if (
      !hospital ||
      typeof hospital.latitude !== "number" ||
      typeof hospital.longitude !== "number"
    ) {
      setFocusNote(
        `Location unavailable for ${hospital?.hospital_name ?? "this hospital"}.`,
      );
      window.setTimeout(() => setFocusNote(null), 4000);
      return;
    }
    setSelectedHospitalId(hospitalId);
    setFocusTick((t) => t + 1);
    setFinderQuery("");
    window.setTimeout(() => {
      mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 40);
  }

  /** Run the real backend inference pipeline and refresh every derived view. */
  async function runAssessment() {
    if (runState === "running") return;
    setRunState("running");
    setRunError(null);
    try {
      const run = await runRiskAssessment();
      setRunResult(run);
      capacity.refetch();
      summary.refetch();
      setRunState("success");
    } catch (err) {
      setRunError(extractErrorMessage(err));
      setRunState("error");
    }
  }

  const s = summary.data;
  const metrics = modelInfo.data?.metrics?.metrics;
  const importance = modelInfo.data?.metrics?.feature_importance ?? [];

  return (
    <div className="space-y-5">
      {/* GREETING HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {greetingForHour(now.getHours())}, Nikhil
            <span className="badge-slate">Synthetic data</span>
          </h1>
          <p className="muted mt-1 text-sm">
            AI-powered hospital &amp; patient risk intelligence for Delhi · not for clinical
            use
          </p>
        </div>
        <div className="text-right">
          <p className="tabular-nums text-sm font-semibold">
            {now.toLocaleTimeString("en-US", { hour12: false })}
          </p>
          <p className="muted text-[11px]">
            {now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* KPI ROW */}
      {summary.error && !s ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : !s ? (
        <KpiSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          <KpiCard
            delay={0}
            label="Total Hospitals"
            value={fmtInt(s.total_hospitals)}
            hint="Delhi facilities"
            icon={<IconHospital width={17} height={17} />}
            tone="sky"
            to="/hospitals"
          />
          <KpiCard
            delay={0.04}
            label="Patients Linked"
            value={fmtInt(s.total_patients)}
            hint="Across facilities"
            icon={<IconUsers width={17} height={17} />}
            tone="accent"
            to="/patients"
          />
          <KpiCard
            delay={0.08}
            label="High-Risk Patients"
            value={fmtInt(highRiskCount)}
            hint={
              rows.length > 0
                ? `${Math.round((highRiskCount / rows.length) * 100)}% of total`
                : "Awaiting inference"
            }
            icon={<IconHeart width={17} height={17} />}
            tone="red"
            to="/risk"
          />
          <KpiCard
            delay={0.12}
            label="AI Risk Model"
            value={modelActive ? "ACTIVE" : "OFFLINE"}
            hint={modelInfo.data?.model_version ?? "HospitalRiskModel"}
            icon={<IconPulse width={17} height={17} />}
            tone={modelActive ? "emerald" : "red"}
            to="/risk"
          />
          <KpiCard
            delay={0.16}
            label="Average Risk Score"
            value={fmtScore(avgScore)}
            hint="Across all patients"
            icon={<IconPulse width={17} height={17} />}
            tone="violet"
            to="/risk"
          />
          <KpiCard
            delay={0.2}
            label="Last Updated"
            value={
              lastRunAt
                ? new Date(lastRunAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "—"
            }
            hint={
              lastRunAt
                ? new Date(lastRunAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Run AI Assessment"
            }
            icon={<IconRefresh width={17} height={17} />}
            tone="amber"
          />
        </div>
      )}

      {/* MAIN ROW: AI Risk Engine | Map with embedded Find & Focus | Recent Assessments */}
      <div className="grid gap-4 xl:grid-cols-12">
        {/* LEFT: AI RISK ENGINE */}
        <div className="xl:col-span-3">
          <SectionCard bodyClassName="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="panel-title">AI Risk Engine</p>
              <span className={cx("badge", modelActive ? "badge-emerald" : "badge-red")}>
                <span
                  className={cx(
                    "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                    modelActive ? "animate-pulse bg-emerald-500" : "bg-red-500",
                  )}
                />
                {modelActive ? "ACTIVE" : "OFFLINE"}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              {[
                ["Model", `${modelInfo.data?.model_name ?? "HospitalRiskModel"} ${modelInfo.data?.model_version ?? "v1"}`],
                ["Task", "Patient risk classification"],
                ["Output", "Risk probability + level"],
                ["Patients scored", fmtInt(rows.length)],
                ["Avg risk score", fmtScore(avgScore)],
                ["Status", modelActive ? "Live inference" : "Offline"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              onClick={runAssessment}
              disabled={runState === "running"}
              className="btn-primary mt-3 w-full"
            >
              {runState === "running" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Running inference…
                </>
              ) : (
                <>
                  <IconRefresh width={15} height={15} />
                  Run AI Assessment
                </>
              )}
            </button>

            {runState === "running" && (
              <p className="muted mt-2 animate-pulse text-[11px]">
                Scoring {rows.length} patients with HospitalRiskModel…
              </p>
            )}
            {runState === "success" && runResult && (
              <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                <p className="font-semibold">
                  Model inference completed ✓{" "}
                  {new Date(runResult.generated_at).toLocaleTimeString("en-US", {
                    hour12: false,
                  })}
                </p>
                <p className="tabular-nums">
                  {runResult.count} patients scored · avg risk{" "}
                  {runResult.average_risk.toFixed(2)} · {runResult.level_counts.HIGH} high-risk
                </p>
              </div>
            )}
            {runState === "error" && runError && (
              <div className="mt-2 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-700 dark:text-red-300">
                <p className="flex items-center gap-1 font-semibold">
                  <IconAlert width={13} height={13} /> Inference failed
                </p>
                <p>{runError}</p>
              </div>
            )}
            {runState === "idle" && lastRunAt && (
              <p className="muted mt-2 text-[11px]">
                Last inference{" "}
                {new Date(lastRunAt).toLocaleTimeString("en-US", { hour12: false })} · via{" "}
                {runResult ? "POST /api/risk/run-assessment" : "GET /api/risk/predictions"}
              </p>
            )}
          </SectionCard>
        </div>

        {/* CENTER: DELHI HOSPITAL MAP with Find & Focus embedded at top */}
        <div ref={mapCardRef} className="scroll-mt-20 xl:col-span-6">
          <SectionCard
            title="Delhi Hospital Map"
            subtitle={
              delhiMap.data
                ? `${enriched.length} hospitals pinned · click any pin for details`
                : "Urban Shadow spatial layer"
            }
            action={
              selectedHospitalId ? (
                <button
                  type="button"
                  onClick={() => setSelectedHospitalId(null)}
                  className="btn-ghost h-8 text-xs"
                >
                  Clear selection
                </button>
              ) : undefined
            }
            bodyClassName="p-4"
          >
            {/* Find & Focus — now on top of the map as requested */}
            <div className="mb-3">
              <HospitalFinder
                hospitals={enriched}
                query={finderQuery}
                onQueryChange={setFinderQuery}
                selectedId={selectedHospitalId}
                onSelect={focusOnMap}
              />
              {selectedHospitalId && (
                <SelectedHospitalMini
                  hospital={enriched.find((f) => f.hospital_id === selectedHospitalId) ?? null}
                  onFocus={() => selectedHospitalId && focusOnMap(selectedHospitalId)}
                  onViewDetails={() =>
                    selectedHospitalId && setDetailId(selectedHospitalId)
                  }
                />
              )}
            </div>

            {focusNote && (
              <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                {focusNote}
              </p>
            )}
            {delhiMap.error ? (
              <ErrorState message={delhiMap.error} onRetry={delhiMap.refetch} />
            ) : !delhiMap.data ? (
              <LoadingState rows={3} label="Loading Delhi spatial data…" />
            ) : (
              <DelhiHealthMap
                data={delhiMap.data}
                trackedHospitals={enriched}
                selectedId={selectedHospitalId}
                focusTick={focusTick}
                onSelectHospital={setSelectedHospitalId}
                onViewDetails={(id) => setDetailId(id)}
                onClearSelection={() => setSelectedHospitalId(null)}
              />
            )}
          </SectionCard>
        </div>

        {/* RIGHT: RECENT ASSESSMENTS */}
        <div className="xl:col-span-3">
          <SectionCard
            title="Recent Assessments"
            bodyClassName="p-4"
            action={
              <Link to="/risk" className="text-accent text-[11px] font-medium hover:underline">
                View all
              </Link>
            }
          >
            {rows.length === 0 ? (
              <EmptyState title="No assessments yet" message="Run the AI assessment." />
            ) : (
              <>
                <ul className="space-y-1.5">
                  {rows.slice(0, 6).map((row) => (
                    <li
                      key={row.patient_id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line-soft px-2.5 py-1.5 text-xs"
                    >
                      <Link
                        to="/patients"
                        className="text-accent w-12 shrink-0 font-semibold hover:underline"
                      >
                        {row.patient_id}
                      </Link>
                      <span className="tabular-nums flex-1 text-right font-medium">
                        {fmtScore(row.risk_score)}
                      </span>
                      <span
                        className={cx(
                          "shrink-0",
                          row.risk_level === "HIGH"
                            ? "badge-red"
                            : row.risk_level === "MODERATE"
                              ? "badge-amber"
                              : "badge-emerald",
                        )}
                      >
                        {row.risk_level}
                      </span>
                      <span className="muted tabular-nums w-10 shrink-0 text-right text-[10px]">
                        {lastRunAt
                          ? new Date(lastRunAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="muted mt-2 text-[10px]">
                  Top model scores · {lastRunAt ? `run at ${new Date(lastRunAt).toLocaleTimeString("en-US", { hour12: false })}` : "no run yet"}
                </p>
              </>
            )}
          </SectionCard>
        </div>
      </div>

      {/* BOTTOM ROW: Model Pipeline | Model Performance | Model Input Features */}
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Model Pipeline" bodyClassName="p-4">
          <ModelPipeline info={modelInfo.data} />
        </SectionCard>

        <SectionCard title="Model Performance (Demo)" bodyClassName="p-4">
          {metrics ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Accuracy", metrics.accuracy],
                  ["Precision", metrics.precision_macro],
                  ["Recall", metrics.recall_macro],
                  ["F1 Score", metrics.f1_macro],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-line px-2.5 py-2">
                    <dt className="muted text-[10px] uppercase tracking-wide">{k}</dt>
                    <dd className="tabular-nums mt-0.5 text-base font-semibold">
                      {typeof v === "number" ? v.toFixed(2) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="muted mt-2 text-[10px] leading-relaxed">
                Trained on synthetic dataset · not clinically validated
              </p>
            </>
          ) : (
            <LoadingState rows={2} label="Loading model metrics…" />
          )}
        </SectionCard>

        <SectionCard
          title={`Model Input Features (${modelInfo.data?.feature_count ?? 11})`}
          bodyClassName="p-4"
        >
          <div className="flex flex-wrap gap-1.5">
            {(modelInfo.data?.feature_columns ?? []).map((f) => (
              <span key={f} className="badge-slate text-[10px]">
                {f}
              </span>
            ))}
          </div>
          {importance.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="muted text-[10px] uppercase tracking-wide">
                Top contributing features (real model importances)
              </p>
              {importance.slice(0, 4).map((f) => {
                const pct = Math.round(f.importance * 100);
                return (
                  <div key={f.feature} className="flex items-center gap-2 text-[11px]">
                    <span className="w-36 truncate">{f.feature.replace(/_/g, " ")}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                      <span
                        className="block h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, pct * 5)}%` }}
                      />
                    </span>
                    <span className="muted tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* DETAIL MODAL */}
      <Modal
        open={detailHospital != null}
        onClose={() => setDetailId(null)}
        title={detailHospital?.hospital_name ?? ""}
        subtitle={
          detailHospital
            ? `${detailHospital.hospital_type} · ${geoLabel(detailHospital)}`
            : undefined
        }
      >
        {detailHospital && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  k: "Reference beds",
                  v:
                    detailHospital.total_beds != null
                      ? fmtInt(detailHospital.total_beds)
                      : "Not reported",
                },
                {
                  k: "ICU capacity",
                  v:
                    detailHospital.icu_beds != null
                      ? fmtInt(detailHospital.icu_beds)
                      : "Not reported",
                },
                { k: "Emergency", v: detailHospital.emergency ? "Yes" : "Not flagged" },
                { k: "Linked patients", v: String(detailHospital.patient_count ?? 0) },
              ].map((item) => (
                <div key={item.k} className="rounded-lg border border-line px-3 py-2.5">
                  <dd className="tabular-nums text-base font-semibold leading-tight">
                    {item.v}
                  </dd>
                  <dt className="muted mt-1 text-[10px] uppercase tracking-wide">{item.k}</dt>
                </div>
              ))}
            </dl>
            <p className="muted tabular-nums text-xs">
              Lat {fmtCoord(detailHospital.latitude)} · Lon {fmtCoord(detailHospital.longitude)}{" "}
              · capacity{" "}
              {detailHospital.capacity_status === "osm_reported"
                ? "OSM-reported reference"
                : "not reported"}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDetailId(null);
                  focusOnMap(detailHospital.hospital_id);
                }}
                className="btn-primary h-8 text-xs"
              >
                Show on Delhi map
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SelectedHospitalMini({
  hospital,
  onFocus,
  onViewDetails,
}: {
  hospital: (Hospital & { avg_ml_score?: number | null }) | null;
  onFocus: () => void;
  onViewDetails: () => void;
}) {
  if (!hospital) return null;
  const risk = hospitalRiskMeta(hospital);
  return (
    <div className="mt-3 rounded-lg border border-line bg-canvas/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold">{hospital.hospital_name}</p>
        {risk && <span className={cx("shrink-0", risk.badgeClass)}>{risk.label}</span>}
      </div>
      <p className="muted mt-0.5 text-[11px]">{geoLabel(hospital)}</p>
      <p className="muted tabular-nums mt-1 text-[10px]">
        Beds {hospital.total_beds ?? "—"} · ICU {hospital.icu_beds ?? "—"} ·{" "}
        {hospital.patient_count ?? 0} linked · {hospital.high_risk_predicted ?? 0} high-risk
        {typeof hospital.avg_ml_score === "number"
          ? ` · AI ${hospital.avg_ml_score.toFixed(2)}`
          : ""}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onFocus} className="btn-primary h-7 flex-1 text-[11px]">
          Focus on map
        </button>
        <button type="button" onClick={onViewDetails} className="btn-ghost h-7 flex-1 text-[11px]">
          View details
        </button>
      </div>
    </div>
  );
}
