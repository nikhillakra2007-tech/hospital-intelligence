import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import PatientDetailModal from "@/components/patients/PatientDetailModal";
import { IconChevronLeft, IconChevronRight, IconSearch } from "@/components/common/icons";
import { useApi } from "@/hooks/useApi";
import { getPatients, getRiskAssessments } from "@/services/api";
import type { Patient, RiskAssessment, RiskCategory } from "@/types";
import { cx, riskBadgeClass } from "@/utils/format";

const PAGE_SIZE = 8;

type RiskFilter = "all" | RiskCategory | "unassessed";

export default function Patients() {
  const patients = useApi(() => getPatients({ limit: 500 }), []);
  const assessments = useApi(() => getRiskAssessments({ limit: 500 }), []);

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Patient | null>(null);

  const latestByPatient = useMemo(() => {
    const map = new Map<string, RiskAssessment>();
    const sorted = [...(assessments.data ?? [])].sort((a, b) =>
      a.assessment_date.localeCompare(b.assessment_date),
    );
    for (const assessment of sorted) map.set(assessment.patient_id, assessment);
    return map;
  }, [assessments.data]);

  const districts = useMemo(
    () => Array.from(new Set((patients.data ?? []).map((p) => p.district))).sort(),
    [patients.data],
  );

  const filtered = useMemo(() => {
    const list = patients.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((patient) => {
      if (district !== "all" && patient.district !== district) return false;
      if (
        q &&
        !patient.patient_id.toLowerCase().includes(q) &&
        !patient.district.toLowerCase().includes(q)
      )
        return false;
      if (riskFilter !== "all") {
        const category = latestByPatient.get(patient.patient_id)?.risk_category;
        if (riskFilter === "unassessed") {
          if (category) return false;
        } else if (category !== riskFilter) return false;
      }
      return true;
    });
  }, [patients.data, search, district, riskFilter, latestByPatient]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    effectivePage * PAGE_SIZE,
    effectivePage * PAGE_SIZE + PAGE_SIZE,
  );

  const flagsCell = (patient: Patient) => (
    <span className="flex flex-wrap gap-1">
      {patient.previous_cardiac_history && <span className="badge-red">Cardiac</span>}
      {patient.diabetes && <span className="badge-amber">Diabetes</span>}
      {patient.hypertension && <span className="badge-sky">Hypertension</span>}
      {!patient.previous_cardiac_history &&
        !patient.diabetes &&
        !patient.hypertension &&
        <span className="muted">–</span>}
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Population registry with clinical profile and recorded risk"
        actions={
          !patients.loading && patients.data ? (
            <span className="badge-slate">
              Showing {pageRows.length} of {filtered.length}
            </span>
          ) : undefined
        }
      />

      <div className="card card-pad grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <IconSearch width={15} height={15} />
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search patient ID or district…"
            className="input-base pl-9"
          />
        </div>
        <select
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(0);
          }}
          className="input-base"
        >
          <option value="all">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value as RiskFilter);
            setPage(0);
          }}
          className="input-base"
        >
          <option value="all">Any risk level</option>
          <option value="High">High risk</option>
          <option value="Moderate">Moderate risk</option>
          <option value="Low">Low risk</option>
          <option value="unassessed">Not assessed</option>
        </select>
      </div>

      {patients.error || assessments.error ? (
        <ErrorState
          message={patients.error ?? assessments.error ?? ""}
          onRetry={() => {
            patients.refetch();
            assessments.refetch();
          }}
        />
      ) : !patients.data || !assessments.data ? (
        <LoadingState rows={6} label="Loading patients…" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No patients match" message="Adjust the search or filters." />
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>District</th><th>Hospital</th>
                    <th>Blood pressure</th>
                    <th>Cholesterol</th>
                    <th>Glucose</th>
                    <th>BMI</th>
                    <th>Heart rate</th>
                    <th>Conditions</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((patient) => {
                    const assessment = latestByPatient.get(patient.patient_id);
                    return (
                      <tr
                        key={patient.patient_id}
                        onClick={() => setSelected(patient)}
                        className="cursor-pointer"
                      >
                        <td className="text-accent font-medium">
                          {patient.patient_id}
                        </td>
                        <td className="tabular-nums">{patient.age}</td>
                        <td>{patient.gender}</td>
                        <td>{patient.district}</td>
                        <td className="truncate-cell">{patient.hospital_name ?? "–"}</td>
                        <td className="tabular-nums">
                          {patient.blood_pressure_systolic}/{patient.blood_pressure_diastolic}
                        </td>
                        <td className="tabular-nums">{patient.cholesterol}</td>
                        <td className="tabular-nums">{patient.glucose}</td>
                        <td className="tabular-nums">{patient.bmi.toFixed(1)}</td>
                        <td className="tabular-nums">{patient.heart_rate}</td>
                        <td>{flagsCell(patient)}</td>
                        <td>
                          {assessment ? (
                            <span className={riskBadgeClass(assessment.risk_category)}>
                              {assessment.risk_category}
                            </span>
                          ) : (
                            <span className="muted text-xs">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {pageRows.map((patient) => {
              const assessment = latestByPatient.get(patient.patient_id);
              return (
                <button
                  key={patient.patient_id}
                  type="button"
                  onClick={() => setSelected(patient)}
                  className="card card-pad text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-accent block truncate text-sm font-semibold">
                      {patient.patient_id}
                      <span className="muted ml-2 text-xs font-normal">
                        {patient.age} · {patient.gender} · {patient.hospital_name ?? patient.district}
                      </span>
                    </p>
                    {assessment ? (
                      <span className={riskBadgeClass(assessment.risk_category)}>
                        {assessment.risk_category}
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                    <div className="flex justify-between gap-2">
                      <dt className="muted">BP</dt>
                      <dd className="tabular-nums">
                        {patient.blood_pressure_systolic}/{patient.blood_pressure_diastolic}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="muted">Chol.</dt>
                      <dd className="tabular-nums">{patient.cholesterol}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="muted">Glucose</dt>
                      <dd className="tabular-nums">{patient.glucose}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="muted">BMI</dt>
                      <dd className="tabular-nums">{patient.bmi.toFixed(1)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="muted">Heart rate</dt>
                      <dd className="tabular-nums">{patient.heart_rate}</dd>
                    </div>
                  </dl>
                  <div className="mt-2">{flagsCell(patient)}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="muted text-xs">
              Page {effectivePage + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={effectivePage === 0}
                className={cx("btn-ghost h-8 px-2")}
                aria-label="Previous page"
              >
                <IconChevronLeft width={15} height={15} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={effectivePage >= pageCount - 1}
                className="btn-ghost h-8 px-2"
                aria-label="Next page"
              >
                <IconChevronRight width={15} height={15} />
              </button>
            </div>
          </div>
        </>
      )}

      <PatientDetailModal
        patient={selected}
        assessment={selected ? (latestByPatient.get(selected.patient_id) ?? null) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
