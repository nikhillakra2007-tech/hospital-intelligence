import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RiskDistribution } from "@/types";
import { useThemeContext } from "@/components/layout/AppLayout";
import { chartPalette, tooltipStyle } from "@/utils/tokens";

interface RiskDistributionChartProps {
  distribution: RiskDistribution;
  height?: number;
}

const CATEGORIES = ["Low", "Moderate", "High"] as const;

export default function RiskDistributionChart({
  distribution,
  height = 280,
}: RiskDistributionChartProps) {
  const { theme } = useThemeContext();
  const p = useMemo(() => chartPalette(theme), [theme]);

  const data = CATEGORIES.map((category) => ({
    name: category,
    value: distribution[category] ?? 0,
    fill: category === "Low" ? p.riskLow : category === "Moderate" ? p.riskModerate : p.riskHigh,
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative min-w-0">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="86%"
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle(p)} />
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value) => (
              <span style={{ color: p.tooltipText, fontSize: 12 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[40%] -translate-y-1/2 text-center">
        <p className="tabular-nums text-3xl font-semibold tracking-tight">{total}</p>
        <p className="muted text-[11px] uppercase tracking-wide">assessments</p>
      </div>
    </div>
  );
}
