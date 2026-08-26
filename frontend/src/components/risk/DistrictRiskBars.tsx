import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HealthGrid, RiskAssessment } from "@/types";
import type { ChartPalette } from "@/utils/tokens";
import { useThemeContext } from "@/components/layout/AppLayout";
import { axisTick, chartPalette } from "@/utils/tokens";

interface DistrictRiskBarsProps {
  assessments: RiskAssessment[];
  grids: HealthGrid[];
  onDistrictSelect?: (district: string) => void;
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
}

function DistrictTooltip({
  active,
  payload,
  label,
  p,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  p: ChartPalette;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
  const dot = (name?: string | number) =>
    name === "Low" ? p.riskLow : name === "Moderate" ? p.riskModerate : p.riskHigh;
  return (
    <div
      style={{
        background: p.tooltipBg,
        border: `1px solid ${p.tooltipBorder}`,
        borderRadius: 10,
        fontSize: 12,
        color: p.tooltipText,
        padding: "8px 11px",
        minWidth: 170,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 5 }}>{label}</p>
      {payload.map((d) => (
        <p key={String(d.name)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              flexShrink: 0,
              background: dot(d.name),
            }}
          />
          {`${d.name} risk`}
          <strong style={{ marginLeft: "auto", paddingLeft: 14 }}>{d.value}</strong>
        </p>
      ))}
      <p
        style={{
          marginTop: 5,
          paddingTop: 4,
          borderTop: `1px solid ${p.tooltipBorder}`,
        }}
      >
        Total assessments: <strong>{total}</strong>
      </p>
    </div>
  );
}

export default function DistrictRiskBars({
  assessments,
  grids,
}: DistrictRiskBarsProps) {
  const { theme } = useThemeContext();
  const p = useMemo(() => chartPalette(theme), [theme]);

  const districtByGrid = new Map(grids.map((g) => [g.grid_id, g.district]));
  const byDistrict = new Map<string, Record<string, number>>();

  for (const assessment of assessments) {
    const district = districtByGrid.get(assessment.grid_id);
    if (!district) continue;
    const row = byDistrict.get(district) ?? { Low: 0, Moderate: 0, High: 0 };
    row[assessment.risk_category] = (row[assessment.risk_category] ?? 0) + 1;
    byDistrict.set(district, row);
  }

  const data = Array.from(byDistrict.entries())
    .map(([district, counts]) => ({
      district,
      Low: counts.Low ?? 0,
      Moderate: counts.Moderate ?? 0,
      High: counts.High ?? 0,
    }))
    .sort((a, b) => b.High + b.Moderate + b.Low - (a.High + a.Moderate + a.Low));

  if (data.length === 0) {
    return <p className="muted text-sm">No geocoded assessments available.</p>;
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={330}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 6 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={p.gridLine} vertical={false} />
          <XAxis
            dataKey="district"
            tick={{ ...axisTick(p), fontSize: 10.5 }}
            axisLine={{ stroke: p.gridLine }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ ...axisTick(p) }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<DistrictTooltip p={p} />}
            cursor={{ fill: p.cursorFill }}
          />
          <Legend
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span style={{ color: p.tooltipText, fontSize: 12 }}>
                {`${value} risk`}
              </span>
            )}
          />
          <Bar dataKey="Low" stackId="risk" fill={p.riskLow} maxBarSize={44} />
          <Bar dataKey="Moderate" stackId="risk" fill={p.riskModerate} maxBarSize={44} />
          <Bar
            dataKey="High"
            stackId="risk"
            fill={p.riskHigh}
            maxBarSize={44}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
