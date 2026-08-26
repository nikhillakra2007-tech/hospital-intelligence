import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Patient, RiskAssessment } from "@/types";
import { EmptyState } from "@/components/common/states";
import {
  fmtDate,
  fmtScore,
  riskBadgeClass,
  cx,
} from "@/utils/format";

interface HighRiskTableProps {
  assessments: RiskAssessment[];
  patients: Patient[];
  limit?: number;
  compact?: boolean;
}

function scoreBar(score: number, toneClass: string) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 tabular-nums text-right text-xs">{fmtScore(score)}</span>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line-soft sm:inline-block">
        <span
          className={cx("block h-full rounded-full", toneClass)}
          style={{ width: `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%` }}
        />
      </span>
    </div>
  );
}

export default function HighRiskTable({
  assessments,
  patients,
  limit,
  compact = false,
}: HighRiskTableProps) {
  const patientById = useMemo(
    () => new Map(patients.map((p) => [p.patient_id, p])),
    [patients],
  );

  const rows = useMemo(() => {
    const high = assessments
      .filter((a) => a.risk_category === "High")
      .sort((a, b) => b.overall_health_risk_score - a.overall_health_risk_score);
    return limit ? high.slice(0, limit) : high;
  }, [assessments, limit]);

  if (rows.length === 0) {
    return <EmptyState title="No high-risk assessments" message="No records in this category yet." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[560px]">
        <thead>
          <tr>
            <th>Patient</th>
            {!compact && <th>District</th>}
            <th>Cardiac score</th>
            <th>Overall score</th>
            {!compact && <th>Assessed</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assessment) => {
            const patient = patientById.get(assessment.patient_id);
            return (
              <tr key={assessment.risk_assessment_id}>
                <td>
                  <Link
                    to="/patients"
                    className="text-accent font-medium hover:underline"
                  >
                    {assessment.patient_id}
                  </Link>
                  {patient && (
                    <span className="muted ml-2 text-xs">
                      {patient.age}
                      {patient.gender === "M" ? "M" : patient.gender === "F" ? "F" : ""}
                    </span>
                  )}
                </td>
                {!compact && <td>{patient?.district ?? "–"}</td>}
                <td>{scoreBar(assessment.cardiac_risk_score, "bg-red-400")}</td>
                <td>{scoreBar(assessment.overall_health_risk_score, "bg-red-500")}</td>
                {!compact && <td className="muted">{fmtDate(assessment.assessment_date)}</td>}
                <td>
                  <span className={riskBadgeClass(assessment.risk_category)}>
                    {assessment.risk_category}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
