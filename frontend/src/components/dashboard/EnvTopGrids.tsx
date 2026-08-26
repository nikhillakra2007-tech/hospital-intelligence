import { motion } from "motion/react";
import type { EnvironmentGridSummary } from "@/types";
import { EmptyState } from "@/components/common/states";
import { aqiBand } from "@/utils/format";

interface EnvTopGridsProps {
  items: EnvironmentGridSummary[];
}

export default function EnvTopGrids({ items }: EnvTopGridsProps) {
  const rows = [...items]
    .filter((item) => item.average_aqi != null)
    .sort((a, b) => (b.average_aqi ?? 0) - (a.average_aqi ?? 0))
    .slice(0, 5);

  if (rows.length === 0) {
    return <EmptyState title="No environmental records" message="Environmental data has not been recorded yet." />;
  }

  const maxAqi = Math.max(...rows.map((r) => r.average_aqi ?? 0), 1);

  return (
    <ul className="space-y-4">
      {rows.map((item, index) => {
        const band = aqiBand(item.average_aqi);
        return (
          <motion.li
            key={item.grid_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${band.dotClass}`} />
                <span className="font-medium">{item.grid_id}</span>
                <span className="muted text-xs">{item.district}</span>
              </span>
              <span className="tabular-nums text-xs">
                AQI {Math.round(item.average_aqi ?? 0)} ·{" "}
                <span className="muted">
                  {item.average_temperature_c == null
                    ? "–"
                    : `${item.average_temperature_c.toFixed(1)}\u00B0C`}
                </span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
              <div
                className={`h-full rounded-full ${band.dotClass}`}
                style={{ width: `${Math.round(((item.average_aqi ?? 0) / maxAqi) * 100)}%` }}
              />
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
