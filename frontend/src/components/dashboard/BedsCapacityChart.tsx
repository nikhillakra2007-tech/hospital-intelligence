import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HospitalCapacityItem } from "@/types";
import { useThemeContext } from "@/components/layout/AppLayout";
import { axisTick, chartPalette, tooltipStyle } from "@/utils/tokens";

interface BedsCapacityChartProps {
  data: HospitalCapacityItem[];
  onSelect?: (hospitalId: string) => void;
}

export default function BedsCapacityChart({
  data,
  onSelect,
}: BedsCapacityChartProps) {
  const { theme } = useThemeContext();
  const p = useMemo(() => chartPalette(theme), [theme]);

  const rows = useMemo(
    () =>
      [...data]
        .filter((d) => d.total_beds != null)
        .sort((a, b) => (b.total_beds ?? 0) - (a.total_beds ?? 0))
        .slice(0, 10)
        .map((d) => ({
          id: d.hospital_id,
          name:
            d.hospital_name.length > 30
              ? d.hospital_name.slice(0, 29) + "…"
              : d.hospital_name,
          fullName: d.hospital_name,
          beds: d.total_beds ?? 0,
        })),
    [data],
  );

  if (rows.length === 0) {
    return (
      <p className="muted text-sm">
        No bed capacity is reported by the source dataset, so no reference capacity can
        be charted.
      </p>
    );
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={Math.max(250, rows.length * 36)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 46, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={p.gridLine} horizontal={false} />
          <XAxis
            type="number"
            tick={{ ...axisTick(p) }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={200}
            tick={{ ...axisTick(p) }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle(p)}
            cursor={{ fill: p.cursorFill }}
            formatter={(value) => [`${value} beds`, "Reference capacity"]}
          />
          <Bar
            dataKey="beds"
            name="Reference beds"
            fill={p.primary}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            style={{ cursor: onSelect ? "pointer" : undefined }}
            onClick={(bar) => {
              const payload = (
                bar as unknown as { payload?: { id?: string } }
              )?.payload;
              if (payload?.id) onSelect?.(payload.id);
            }}
          >
            <LabelList
              dataKey="beds"
              position="right"
              style={{ fill: p.tooltipText, fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {onSelect && (
        <p className="muted mt-2 text-[11px]">
          Click a bar to locate that facility on the Delhi map.
        </p>
      )}
    </div>
  );
}
