import { cx, fmtInt, fmtPct, occupancyTone, toneBarClass } from "@/utils/format";

interface OccupancyBarProps {
  label: string;
  occupied: number;
  capacity: number;
}

export default function OccupancyBar({ label, occupied, capacity }: OccupancyBarProps) {
  const pct = capacity > 0 ? (occupied / capacity) * 100 : null;
  const tone = pct == null ? null : occupancyTone(pct);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="muted tabular-nums">
          {fmtInt(occupied)} / {fmtInt(capacity)} · {fmtPct(pct)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
        {tone && pct != null && (
          <div
            className={cx("h-full rounded-full", toneBarClass[tone])}
            style={{ width: `${Math.min(100, Math.round(pct))}%` }}
          />
        )}
      </div>
    </div>
  );
}
