import { useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { getHospitalOperations } from "@/services/api";
import type { Hospital } from "@/types";
import Modal from "@/components/common/Modal";
import HealthcareMap from "@/components/maps/HealthcareMap";
import { EmptyState, LoadingState } from "@/components/common/states";
import { useThemeContext } from "@/components/layout/AppLayout";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HOSPITAL_TYPE_BADGE_CLASS,
  fmtCoord,
  fmtInt,
} from "@/utils/format";
import { axisTick, chartPalette, tooltipStyle } from "@/utils/tokens";

interface HospitalDetailModalProps {
  hospital: Hospital | null;
  onClose: () => void;
}

export default function HospitalDetailModal({ hospital, onClose }: HospitalDetailModalProps) {
  const { theme } = useThemeContext();
  const p = useMemo(() => chartPalette(theme), [theme]);
  const hospitalId = hospital?.hospital_id;
  const { data: operations, loading } = useApi(
    () => (hospitalId ? getHospitalOperations({ hospital_id: hospitalId }) : Promise.resolve([])),
    [hospitalId],
  );

  const chartRows = (operations ?? []).map((op) => ({
    date: op.operation_date.slice(5),
    Admissions: op.admissions,
    Discharges: op.discharges,
    Emergency: op.emergency_visits,
  }));

  return (
    <Modal
      open={hospital != null}
      onClose={onClose}
      title={hospital?.hospital_name ?? ""}
      subtitle={
        hospital
          ? `${hospital.hospital_type} · ${hospital.district} · ${hospital.hospital_id}`
          : undefined
      }
    >
      {hospital && (
        <div className="space-y-6">
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Total beds", value: fmtInt(hospital.total_beds) },
              { label: "ICU beds", value: fmtInt(hospital.icu_beds) },
              { label: "Emergency beds", value: fmtInt(hospital.emergency_beds) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-line px-3 py-3 dark:border-line"
              >
                <dd className="tabular-nums text-xl font-semibold">{stat.value}</dd>
                <dt className="muted mt-0.5 text-[11px] uppercase tracking-wide">{stat.label}</dt>
              </div>
            ))}
          </dl>

          <div className="muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className={HOSPITAL_TYPE_BADGE_CLASS[hospital.hospital_type] ?? "badge-slate"}>
              {hospital.hospital_type}
            </span>
            <span>
              Lat {fmtCoord(hospital.latitude)} · Lon {fmtCoord(hospital.longitude)}
            </span>
          </div>

          {loading ? (
            <LoadingState rows={2} label="Loading operationsâ€¦" />
          ) : chartRows.length > 0 ? (
            <div>
              <p className="panel-title mb-2">Patient flow â€” last {chartRows.length} days</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartRows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="flowAdmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={p.primary} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="flowDischarges" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.environment} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={p.environment} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={p.gridLine} vertical={false} />
                  <XAxis dataKey="date" tick={{ ...axisTick(p) }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ ...axisTick(p) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(p)} />
                  <Legend
                    iconType="circle"
                    iconSize={9}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => (
                      <span style={{ color: p.tooltipText, fontSize: 11 }}>{value}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="Admissions"
                    stroke={p.primary}
                    strokeWidth={2}
                    fill="url(#flowAdmissions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Discharges"
                    stroke={p.environment}
                    strokeWidth={2}
                    fill="url(#flowDischarges)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Emergency"
                    stroke={p.riskModerate}
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No operational records" message="This hospital has no recorded operations yet." />
          )}

          <HealthcareMap hospitals={[hospital]} showGrids={false} height={230} />
        </div>
      )}
    </Modal>
  );
}
