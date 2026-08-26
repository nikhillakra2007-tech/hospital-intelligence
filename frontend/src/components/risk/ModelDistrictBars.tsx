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
import type { RiskPredictionRow } from "@/types";
import { useThemeContext } from "@/components/layout/AppLayout";
import { axisTick, chartPalette } from "@/utils/tokens";

interface ModelDistrictBarsProps {
  predictions: RiskPredictionRow[];
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
  p: ReturnType<typeof chartPalette>;
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
        minWidth: 180,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 5 }}>{label}</p>
      {payload.map((d) => (
        <p key={String(d.name)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: dot(d.name) }}
          />
          {`${d.name} risk`}
          <strong style={{ marginLeft: "auto", paddingLeft: 14 }}>{d.value}</strong>
        </p>
      ))}
      <p style={{ marginTop: 5, paddingTop: 4, borderTop: `1px solid ${p.tooltipBorder}` }}>
        Total predictions: <strong>{total}</strong>
      </p>
    </div>
  );
}

export default function ModelDistrictBars({ predictions }: ModelDistrictBarsProps) {
  const { theme } = useThemeContext();
  const p = useMemo(() => chartPalette(theme), [theme]);

  const data = useMemo(() => {
    const byDistrict = new Map<string, { Low: number; Moderate: number; High: number }>();
    for (const row of predictions) {
      const entry =
        byDistrict.get(row.district) ?? { Low: 0, Moderate: 0, High: 0 };
      if (row.risk_level === "LOW") entry.Low += 1;
      else if (row.risk_level === "MODERATE") entry.Moderate += 1;
      else entry.High += 1;
      byDistrict.set(row.district, entry);
    }
    return Array.from(byDistrict.entries())
      .map(([district, counts]) => ({ district, ...counts }))
      .sort((a, b) => b.High + b.Moderate + b.Low - (a.High + a.Moderate + a.Low));
  }, [predictions]);

  if (data.length === 0) {
    return <p className="muted text-sm">No predictions available yet.</p>;
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
          <YAxis allowDecimals={false} tick={{ ...axisTick(p) }} axisLine={false} tickLine={false} />
          <Tooltip content={<DistrictTooltip p={p} />} cursor={{ fill: p.cursorFill }} />
          <Legend
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span style={{ color: p.tooltipText, fontSize: 12 }}>{`${value} risk`}</span>
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
